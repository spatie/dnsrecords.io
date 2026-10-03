import { curveQualities } from './text-fx.js';

/*
 * The curved text is an SVG filter over the whole picture. Chrome runs it on
 * the GPU. Safari and Firefox paint it on the CPU, and on a large Retina
 * screen a single repaint of it can take seconds. So Safari always gets flat
 * text under the curved glass, Chrome keeps the full curve, and every other
 * browser is measured: the first frames at the real size of the screen
 * decide the quality, and a watch on the frame times keeps stepping the
 * curve down while long frames keep coming. The outcome is remembered for a
 * week.
 */

const storageKey = 'crt-curve-quality';
const rememberFor = 7 * 24 * 60 * 60 * 1000;
const probeDuration = 1500;
const slowFrame = 20;
const longFrame = .06;
const longFramesAllowed = 3;
const longFrameWindow = 4;

/**
 * Safari, and every browser on iOS, paint SVG filters on HTML on the CPU and
 * the curve makes them drop to a few frames per second on large screens, in
 * ways a short measurement does not always catch. WebKit is the only engine
 * reporting Apple as its vendor.
 */
export function isWebKit() {
    return navigator.vendor === 'Apple Computer, Inc.';
}

/**
 * Chromium runs SVG filters on the GPU. Its first frames are often slow while
 * the glass starts up, which would wrongly flatten the curve there, so it
 * only has the watch on long frames.
 */
function isChromium() {
    return 'chrome' in window;
}

function remembered() {
    try {
        const stored = JSON.parse(localStorage.getItem(storageKey));

        if (stored && curveQualities.includes(stored.quality) && Date.now() - stored.at < rememberFor) {
            return stored.quality;
        }
    } catch (error) {
        // Unreadable or unavailable storage only means measuring again.
    }

    return null;
}

function remember(quality) {
    try {
        localStorage.setItem(storageKey, JSON.stringify({ quality, at: Date.now() }));
    } catch (error) {
        // Storage can be unavailable in private browsing, the curve is then measured on every visit.
    }
}

function lower(quality) {
    return curveQualities[Math.min(curveQualities.indexOf(quality) + 1, curveQualities.length - 1)];
}

/**
 * The 90th percentile of the frame times over a short stretch, in milliseconds.
 */
function measureFrames(duration = probeDuration) {
    return new Promise(resolve => {
        const times = [];
        const startedAt = performance.now();

        let previous = null;

        const step = now => {
            if (previous !== null) {
                times.push(now - previous);
            }

            previous = now;

            if (now - startedAt < duration) {
                requestAnimationFrame(step);

                return;
            }

            const sorted = times.sort((a, b) => a - b);

            resolve(sorted.length ? sorted[Math.floor(sorted.length * .9)] : Infinity);
        };

        requestAnimationFrame(step);
    });
}

export function initialCurveQuality() {
    if (isWebKit()) {
        return 'off';
    }

    return remembered() || 'full';
}

/**
 * Steps the curve down while the frames are slow. Skipped when an earlier
 * visit already settled on a quality.
 */
export async function tuneCurve(curvedText) {
    if (curvedText.quality === 'off' || isChromium() || remembered()) {
        return;
    }

    while (curvedText.quality !== 'off' && await measureFrames() > slowFrame) {
        curvedText.setQuality(lower(curvedText.quality));
    }

    remember(curvedText.quality);
}

/**
 * Watches the frame times of an animation loop and steps the curve down when
 * long frames keep coming.
 */
export function createCurveWatch(curvedText) {
    let longFrames = [];

    return {
        frame(time, delta) {
            if (curvedText.quality === 'off' || delta < longFrame) {
                return;
            }

            longFrames = longFrames.filter(frameTime => time - frameTime < longFrameWindow);
            longFrames.push(time);

            if (longFrames.length <= longFramesAllowed) {
                return;
            }

            longFrames = [];
            curvedText.setQuality(lower(curvedText.quality));
            remember(curvedText.quality);
        },
    };
}
