import { curveQualities } from './text-fx.js';

/*
 * The curved text is an SVG filter over the whole picture. Chrome runs it on
 * the GPU, Safari and Firefox paint it on the CPU, so there anything that
 * makes them redo the whole filter costs a few hundred milliseconds on a
 * large Retina screen. The quality is measured instead of guessed: first how
 * long a frame takes when the colour fringes change, then a watch on the
 * frame times keeps stepping the curve down while long frames keep coming.
 * The outcome is remembered for a week.
 */

const storageKey = 'crt-curve-quality';
const rememberFor = 7 * 24 * 60 * 60 * 1000;
const slowFrame = 34;
const longFrame = .06;
const longFramesAllowed = 3;
const longFrameWindow = 4;

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
 * The median time, in milliseconds, of a frame in which the colour fringes
 * change, the way they do in every glitch.
 */
function measureFringeChange(curvedText, fringe, frames = 5) {
    return new Promise(resolve => {
        const times = [];

        let previous = null;

        const step = now => {
            if (previous !== null) {
                times.push(now - previous);
            }

            previous = now;
            curvedText.setFringe(times.length % 2 ? fringe + .01 : fringe);

            if (times.length < frames) {
                requestAnimationFrame(step);

                return;
            }

            curvedText.setFringe(fringe);

            const sorted = times.slice(1).sort((a, b) => a - b);

            resolve(sorted[Math.floor(sorted.length / 2)]);
        };

        requestAnimationFrame(step);
    });
}

export function initialCurveQuality() {
    return remembered() || 'full';
}

/**
 * Keeps the fringes still when changing them takes longer than about two
 * frames at 60 Hz. Skipped when an earlier visit already settled on a quality.
 */
export async function tuneCurve(curvedText, fringe) {
    if (remembered()) {
        return;
    }

    if (curvedText.quality === 'full' && await measureFringeChange(curvedText, fringe) > slowFrame) {
        curvedText.setQuality('steady');
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
