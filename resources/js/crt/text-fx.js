import { between, exponential } from './random.js';

/*
 * Puts the DOM text itself on the curved glass: an SVG displacement filter
 * bends the picture along the same barrel curve as the glass shader, with
 * the red and blue channels bent a little more and a little less, so colour
 * fringes grow towards the edges like a real tube. The text stays real,
 * selectable DOM underneath.
 */

const svgNamespace = 'http://www.w3.org/2000/svg';

function element(name, attributes = {}, parent = null) {
    const node = document.createElementNS(svgNamespace, name);

    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));

    if (parent) {
        parent.appendChild(node);
    }

    return node;
}

function channel(red, green, blue) {
    return `${red} 0 0 0 0  0 ${green} 0 0 0  0 0 ${blue} 0 0  0 0 0 1 0`;
}

/**
 * The displacement map: for every point on the screen, how far away the
 * point is that the curved glass shows there.
 */
function barrelMap(width, height, curve) {
    const mapWidth = Math.max(2, Math.round(width / 6));
    const mapHeight = Math.max(2, Math.round(height / 6));
    const canvas = document.createElement('canvas');

    canvas.width = mapWidth;
    canvas.height = mapHeight;

    const context = canvas.getContext('2d');
    const image = context.createImageData(mapWidth, mapHeight);

    let maximum = 0;
    const offsets = new Float32Array(mapWidth * mapHeight * 2);

    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            const centeredX = (x + .5) / mapWidth * 2 - 1;
            const centeredY = (y + .5) / mapHeight * 2 - 1;
            const radius = centeredX * centeredX + centeredY * centeredY;
            const offsetX = centeredX * curve * radius * width / 2;
            const offsetY = centeredY * curve * radius * height / 2;
            const index = (y * mapWidth + x) * 2;

            offsets[index] = offsetX;
            offsets[index + 1] = offsetY;
            maximum = Math.max(maximum, Math.abs(offsetX), Math.abs(offsetY));
        }
    }

    const scale = Math.max(1, maximum * 2.02);

    for (let index = 0; index < mapWidth * mapHeight; index++) {
        image.data[index * 4] = Math.round((offsets[index * 2] / scale + .5) * 255);
        image.data[index * 4 + 1] = Math.round((offsets[index * 2 + 1] / scale + .5) * 255);
        image.data[index * 4 + 2] = 128;
        image.data[index * 4 + 3] = 255;
    }

    context.putImageData(image, 0, 0);

    return { url: canvas.toDataURL('image/png'), scale };
}

/**
 * Quality levels for the curved text, best first. `full` bends the red and
 * blue channels a little more and less than green for colour fringes that
 * flare up with glitches, `steady` keeps the fringes but never changes them
 * (changing the filter makes Safari redo all of it), `lite` bends the
 * picture in one pass without fringes and `off` leaves the text flat.
 */
export const curveQualities = ['full', 'steady', 'lite', 'off'];

export function createCurvedText(picture, { curve, fringe = .035, quality = 'full' }) {
    const svg = element('svg', { width: 0, height: 0, 'aria-hidden': 'true', focusable: 'false' });

    svg.style.position = 'absolute';
    svg.style.width = '0';
    svg.style.height = '0';

    const filter = element('filter', {
        id: 'crt-curve',
        x: 0,
        y: 0,
        width: '100%',
        height: '100%',
        filterUnits: 'objectBoundingBox',
        primitiveUnits: 'userSpaceOnUse',
        'color-interpolation-filters': 'sRGB',
    }, element('defs', {}, svg));

    const map = element('feImage', { x: 0, y: 0, preserveAspectRatio: 'none', result: 'map' }, filter);
    const green = element('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', xChannelSelector: 'R', yChannelSelector: 'G', result: 'green' }, filter);
    const red = element('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', xChannelSelector: 'R', yChannelSelector: 'G', result: 'red' });
    const blue = element('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', xChannelSelector: 'R', yChannelSelector: 'G', result: 'blue' });

    const fringePrimitives = [
        red,
        blue,
        element('feColorMatrix', { in: 'red', type: 'matrix', values: channel(1, 0, 0), result: 'redOnly' }),
        element('feColorMatrix', { in: 'green', type: 'matrix', values: channel(0, 1, 0), result: 'greenOnly' }),
        element('feColorMatrix', { in: 'blue', type: 'matrix', values: channel(0, 0, 1), result: 'blueOnly' }),
        element('feComposite', { in: 'redOnly', in2: 'greenOnly', operator: 'arithmetic', k1: 0, k2: 1, k3: 1, k4: 0, result: 'redGreen' }),
        element('feComposite', { in: 'redGreen', in2: 'blueOnly', operator: 'arithmetic', k1: 0, k2: 1, k3: 1, k4: 0 }),
    ];

    document.body.appendChild(svg);

    let scale = 0;
    let currentFringe = fringe;
    let currentQuality = null;

    function applyFringe(amount) {
        currentFringe = amount;
        red.setAttribute('scale', (scale * (1 + amount)).toFixed(2));
        blue.setAttribute('scale', (scale * (1 - amount)).toFixed(2));
    }

    function resize() {
        const width = picture.clientWidth;
        const height = picture.clientHeight;
        const barrel = barrelMap(width, height, curve);

        scale = barrel.scale;
        map.setAttribute('href', barrel.url);
        map.setAttribute('width', width);
        map.setAttribute('height', height);
        green.setAttribute('scale', scale.toFixed(2));
        applyFringe(currentFringe);
    }

    function setQuality(quality) {
        if (quality === currentQuality) {
            return;
        }

        currentQuality = quality;

        if (quality === 'full' || quality === 'steady') {
            applyFringe(fringe);
            fringePrimitives.forEach(primitive => filter.appendChild(primitive));
        } else {
            fringePrimitives.forEach(primitive => primitive.remove());
        }

        picture.classList.toggle('is-curved', quality !== 'off');
        document.documentElement.setAttribute('data-curve', quality);
    }

    resize();
    new ResizeObserver(resize).observe(picture);

    setQuality(quality);

    return {
        get quality() {
            return currentQuality;
        },
        setQuality,
        setFringe(amount) {
            if (currentQuality === 'full' && Math.abs(amount - currentFringe) > .002) {
                applyFringe(amount);
            }
        },
    };
}

const terminalLines = '.line, .brand, .prompt, .resolving, .results__header, .message, .terminal-footer p';

const terminalEchoLines = '.line, .brand, .results__header, .message, .terminal-footer p';

const corruptGlyphs = '░▒▓█▀▄▌▐■▚▞╳┼╬#%&@$';

const copiedStyles = ['--name-width', '--type-width', '--ttl-width', '--copy-width', '--line-padding'];

/**
 * A layer over the picture for glitches that draw over the text. It is not
 * part of the text, so selecting and copying never pick it up.
 */
function createOverlay(picture) {
    const overlay = document.createElement('div');

    overlay.className = 'screen__overlay';
    overlay.setAttribute('aria-hidden', 'true');
    picture.appendChild(overlay);

    return overlay;
}

function textNodesOf(line) {
    const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
    const nodes = [];

    while (walker.nextNode()) {
        const node = walker.currentNode;

        if (node.nodeValue.trim() === '' || node.parentNode.closest('button, input, .line__gap, .visually-hidden')) {
            continue;
        }

        nodes.push(node);
    }

    return nodes;
}

/**
 * A faint image of the brand and the prompt burnt into the phosphor where
 * they sit on the first screen, seen whenever something else is there.
 */
export function createBurnIn(picture) {
    const brand = picture.querySelector('.brand');
    const prompt = picture.querySelector('.prompt');

    if (! brand || ! prompt) {
        return;
    }

    const burn = document.createElement('div');
    const brandGhost = brand.cloneNode(true);
    const promptGhost = document.createElement('p');
    const promptLabel = prompt.querySelector('.prompt__label');
    const placeholder = document.createElement('span');

    brandGhost.querySelectorAll('.visually-hidden').forEach(node => node.remove());
    brandGhost.querySelectorAll('a').forEach(link => link.replaceWith(link.textContent));
    promptGhost.className = 'prompt';
    promptGhost.appendChild(promptLabel ? promptLabel.cloneNode(true) : document.createTextNode(''));
    promptGhost.querySelectorAll('.visually-hidden').forEach(node => node.remove());
    placeholder.textContent = prompt.querySelector('input')?.getAttribute('placeholder') || '';
    promptGhost.appendChild(placeholder);

    burn.className = 'screen__burn';
    burn.setAttribute('aria-hidden', 'true');
    burn.append(brandGhost, promptGhost);
    picture.appendChild(burn);

    function place() {
        const currentBrand = picture.querySelector('.brand') || brand;
        const brandBox = currentBrand.getBoundingClientRect();
        const pictureBox = picture.getBoundingClientRect();

        burn.style.left = `${brandBox.left - pictureBox.left}px`;
        burn.style.top = `${brandBox.top - pictureBox.top + (picture.querySelector('.screen__content')?.scrollTop || 0)}px`;
        burn.style.width = `${brandBox.width}px`;
    }

    place();
    new ResizeObserver(place).observe(picture);
}

/**
 * Small lives of individual lines: a slightly uneven brightness, a line that
 * jitters sideways now and then, and tears where a few lines slip with an
 * RGB split and snap back. Also dims and lifts the whole picture in step
 * with the flicker of the glass. Other interfaces pass their own lines, a
 * pace (below 1 makes the events rarer) and a strength for the flicker.
 */
export function createTextLife(picture, { lines: lineSelector = terminalLines, echoLines: echoSelector = terminalEchoLines, pace = 1, strength = 1 } = {}) {
    const screen = picture.parentNode;
    const overlay = createOverlay(picture);

    let nextJitter = 0;
    let nextDrift = 0;
    let nextBurst = 0;
    let nextCorruption = 0;
    let nextEcho = 0;
    let lastOpacity = 1;

    function visibleLines() {
        const screenBox = screen.getBoundingClientRect();

        return Array.prototype.filter.call(picture.querySelectorAll(lineSelector), line => {
            const box = line.getBoundingClientRect();

            return box.height > 0 && box.bottom > screenBox.top && box.top < screenBox.bottom;
        });
    }

    function jitter(line, distance, duration) {
        line.animate([
            { transform: 'none' },
            { transform: `translateX(${distance}px)`, offset: .2 },
            { transform: `translateX(${-distance * .4}px)`, offset: .55 },
            { transform: 'none' },
        ], { duration, easing: 'cubic-bezier(.3, 0, .2, 1)' });
    }

    function tear(position, strength) {
        const lines = visibleLines();

        if (! lines.length) {
            return;
        }

        const screenBox = screen.getBoundingClientRect();
        const targetY = screenBox.top + position * screenBox.height;
        const sorted = lines
            .map(line => ({ line, distance: Math.abs(line.getBoundingClientRect().top - targetY) }))
            .sort((a, b) => a.distance - b.distance);
        const count = 1 + Math.floor(Math.random() * 3);

        sorted.slice(0, count).forEach(({ line }, index) => {
            const shift = (Math.random() < .5 ? -1 : 1) * between(4, 18) * strength;
            const top = Math.round(between(0, 45));
            const bottom = Math.round(between(0, 45));
            const duration = between(180, 320);

            line.classList.add('is-torn');
            line.animate([
                { transform: `translateX(${shift}px)`, clipPath: `inset(${top}% 0 ${bottom}% 0)` },
                { transform: `translateX(${-shift * .35}px)`, clipPath: 'inset(0 0 0 0)', offset: .45 },
                { transform: 'none', clipPath: 'inset(0 0 0 0)' },
            ], { duration, delay: index * 30, easing: 'cubic-bezier(.2, .7, .3, 1)' })
                .finished
                .catch(() => {})
                .then(() => line.classList.remove('is-torn'));
        });
    }

    /**
     * A line loses the signal for a frame or two. Returns where it is, as a
     * share of the screen height, so the glass can fill it with noise.
     */
    function dropout(duration) {
        const lines = visibleLines();
        const line = lines[Math.floor(Math.random() * lines.length)];

        if (! line) {
            return null;
        }

        const screenBox = screen.getBoundingClientRect();
        const box = line.getBoundingClientRect();

        line.animate([{ opacity: .12 }, { opacity: .3 }], { duration, easing: 'steps(2, end)' });

        return {
            y: (box.top + box.height / 2 - screenBox.top) / screenBox.height,
            halfHeight: box.height / 2 / screenBox.height,
        };
    }

    /**
     * A few glyphs of a line turn into garbage for a moment. Drawn on the
     * overlay over the real text, which stays as it is.
     */
    function corrupt() {
        const lines = visibleLines();
        const line = lines[Math.floor(Math.random() * lines.length)];
        const nodes = line ? textNodesOf(line) : [];
        const node = nodes[Math.floor(Math.random() * nodes.length)];

        if (! node) {
            return;
        }

        const text = node.nodeValue;
        const start = Math.floor(Math.random() * text.length);
        const length = Math.min(text.length - start, 1 + Math.floor(Math.random() * 3));

        if (text.slice(start, start + length).trim() === '') {
            return;
        }

        const range = document.createRange();

        range.setStart(node, start);
        range.setEnd(node, start + length);

        const box = range.getClientRects()[0];

        if (! box || box.width === 0) {
            return;
        }

        const overlayBox = overlay.getBoundingClientRect();
        const style = getComputedStyle(node.parentNode);
        const glyphs = document.createElement('span');

        glyphs.className = 'screen__glyphs';
        glyphs.textContent = Array.from({ length }, () => corruptGlyphs[Math.floor(Math.random() * corruptGlyphs.length)]).join('');
        glyphs.style.cssText = `left:${box.left - overlayBox.left}px;top:${box.top - overlayBox.top}px;width:${box.width}px;height:${box.height}px;line-height:${box.height}px;font:${style.fontWeight} ${style.fontSize} ${style.fontFamily};color:${style.color};`;
        overlay.appendChild(glyphs);

        setTimeout(() => glyphs.remove(), between(60, 150));
    }

    /**
     * A faint echo of a line a few pixels to the side, as from a reflection
     * in the cable, fading out quickly.
     */
    function echo() {
        const lines = visibleLines().filter(line => line.matches(echoSelector));
        const line = lines[Math.floor(Math.random() * lines.length)];

        if (! line) {
            return;
        }

        const box = line.getBoundingClientRect();
        const overlayBox = overlay.getBoundingClientRect();
        const style = getComputedStyle(line);
        const ghost = line.cloneNode(true);

        ghost.removeAttribute('id');
        ghost.querySelectorAll('button, .visually-hidden').forEach(node => node.remove());
        ghost.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
        ghost.classList.remove('is-torn');
        ghost.classList.add('screen__echo');
        copiedStyles.forEach(property => ghost.style.setProperty(property, style.getPropertyValue(property)));
        ghost.style.left = `${box.left - overlayBox.left}px`;
        ghost.style.top = `${box.top - overlayBox.top}px`;
        ghost.style.width = `${box.width}px`;
        ghost.style.font = style.font;
        ghost.style.whiteSpace = style.whiteSpace;
        ghost.style.color = style.color;
        overlay.appendChild(ghost);

        const shift = (Math.random() < .5 ? -1 : 1) * between(3, 6);

        ghost.animate([
            { opacity: .2, transform: `translate3d(${shift}px, 0, 0)` },
            { opacity: 0, transform: `translate3d(${shift * 1.4}px, 0, 0)` },
        ], { duration: between(300, 480), easing: 'cubic-bezier(.2, .6, .3, 1)', fill: 'forwards' })
            .finished
            .catch(() => {})
            .then(() => ghost.remove());
    }

    function drift() {
        const lines = visibleLines();
        const line = lines[Math.floor(Math.random() * lines.length)];

        if (! line) {
            return;
        }

        const from = parseFloat(line.style.opacity || 1);
        const to = between(.86, 1);

        line.animate([{ opacity: from }, { opacity: to }], { duration: between(1200, 3200), easing: 'ease-in-out' })
            .finished
            .catch(() => {})
            .then(() => {
                line.style.opacity = String(to.toFixed(3));
            });
    }

    return {
        tear,
        dropout,
        frame(time, { flicker, breath, surge, disturb, motion }) {
            const opacity = Math.max(.82, Math.min(.999, 1 - (breath * 1.6 - flicker * 2.5 - surge * 2 + disturb * .06) * strength));

            if (Math.abs(opacity - lastOpacity) > .002) {
                picture.style.opacity = opacity.toFixed(3);
                lastOpacity = opacity;
            }

            if (motion < .5) {
                return;
            }

            if (time > nextJitter) {
                const lines = visibleLines();
                const line = lines[Math.floor(Math.random() * lines.length)];

                if (line) {
                    jitter(line, (Math.random() < .5 ? -1 : 1) * between(.8, 2.2), between(90, 180));
                }

                nextJitter = time + exponential(2.4, .4) / pace;
            }

            if (time > nextDrift) {
                drift();
                nextDrift = time + exponential(1.8, .3) / pace;
            }

            if (time > nextCorruption) {
                corrupt();
                nextCorruption = time + exponential(4.5, 1) / pace;
            }

            if (time > nextEcho) {
                echo();
                nextEcho = time + exponential(10, 3) / pace;
            }

            if (disturb > .35 && time > nextBurst) {
                tear(Math.random(), .5 + disturb * .5);
                nextBurst = time + exponential(.35, .15) / pace;
            }
        },
        reset() {
            picture.style.opacity = '';
        },
    };
}
