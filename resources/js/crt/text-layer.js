import { between } from './random.js';

/*
 * Paints the text of the terminal into a canvas, so the glass shader can
 * bend it along the curve of the tube in every browser, instead of an SVG
 * filter that only Chrome runs fast. The DOM text stays where it is, made
 * transparent, for selecting, copying, find in page and screen readers.
 *
 * Measuring the DOM is the expensive part, so it only happens when the
 * content changes. The canvas is a ring of the scrolling content, as tall
 * as the screen: row y of the content lives on row y modulo that height.
 * Scrolling or typing only paints and uploads the rows that changed.
 */

const lineSelector = '.line, .brand, .prompt, .resolving, .results__header, .message, .terminal-footer p';
const skippedSelector = '.visually-hidden, .line__gap, [hidden], script, style';
const pseudoSelector = '.text-action, .line__copy';
const maximumPixels = 8000000;
const ligatureBreaker = '‌';
const garbage = '░▒▓█▀▄▌▐■▚▞#%&@$';

function isTransparent(colour) {
    return colour === 'transparent' || /rgba\(.*,\s*0\)$/.test(colour) || /\/\s*0\)$/.test(colour);
}

function fontOf(style) {
    return `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
}

/**
 * JetBrains Mono has ligatures the DOM switches off. A zero width non-joiner
 * between the characters keeps the canvas from forming them.
 */
function withoutLigatures(text) {
    return text.length < 2 ? text : text.split('').join(ligatureBreaker);
}

export function createTextLayer(picture) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const fontMetrics = new Map();
    const lineBrightness = new WeakMap();

    let items = [];
    let lines = [];
    let burn = null;
    let clip = { x: 0, y: 0, width: 0, height: 0 };
    let inputItem = null;
    let scale = 1;
    let cssWidth = 0;
    let cssHeight = 0;
    let scrollTop = 0;
    let paintedScroll = 0;
    let ringHeight = 1;
    let burnVersion = 0;
    let version = 0;
    let isMeasured = false;
    let isPainted = false;
    let corruption = null;
    let isInputDirty = false;
    let corruptionRows = null;

    const burnCanvas = document.createElement('canvas');
    const burnContext = burnCanvas.getContext('2d');
    let burnBox = [0, 0, 1, 1];

    const regionPool = [];
    const pendingLines = new Set();
    const opacities = new Map();
    const overflowClips = new Map();

    let lastScrolledAt = 0;

    const content = () => document.getElementById('screen-content');

    function metricsFor(font) {
        if (! fontMetrics.has(font)) {
            context.font = font;

            const metrics = context.measureText('Hg');

            fontMetrics.set(font, { ascent: metrics.fontBoundingBoxAscent, descent: metrics.fontBoundingBoxDescent });
        }

        return fontMetrics.get(font);
    }

    function brightnessOf(element) {
        const line = element.closest(lineSelector);

        if (! line) {
            return 1;
        }

        if (! lineBrightness.has(line)) {
            lineBrightness.set(line, between(.86, 1));
        }

        return lineBrightness.get(line);
    }

    /**
     * The opacity of an element as it shows on screen, all its ancestors in
     * the content included. The content itself fades as a whole in the shader.
     */
    function opacityOf(element, root) {
        if (! element || element === root) {
            return 1;
        }

        if (! opacities.has(element)) {
            opacities.set(element, parseFloat(getComputedStyle(element).opacity) * opacityOf(element.parentElement, root));
        }

        return opacities.get(element);
    }

    function resize() {
        const box = picture.getBoundingClientRect();
        const ratio = Math.min(2, window.devicePixelRatio || 1);

        cssWidth = Math.max(1, box.width);
        cssHeight = Math.max(1, box.height);
        ringHeight = Math.max(1, Math.round(clip.height));
        scale = Math.min(ratio, Math.sqrt(maximumPixels / (cssWidth * ringHeight)));

        const width = Math.round(cssWidth * scale);
        const height = Math.round(ringHeight * scale);

        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
            fontMetrics.clear();
        }
    }

    function textItem(text, box, style, origin, extra = {}) {
        const font = fontOf(style);
        const { ascent, descent } = metricsFor(font);

        return {
            type: 'text',
            text: withoutLigatures(text),
            x: box.left - origin.x,
            y: box.top - origin.y + (box.height - (ascent + descent)) / 2 + ascent,
            font,
            colour: style.color,
            ...extra,
        };
    }

    /**
     * Places every word on its own, which keeps tabs, spaces and wrapped
     * lines exactly where the DOM has them.
     */
    /**
     * The box of the nearest ancestor that clips its overflow, like the
     * record names that are cut off with an ellipsis.
     */
    function overflowClipOf(element, root, origin) {
        if (! element || element === root) {
            return null;
        }

        if (! overflowClips.has(element)) {
            const overflow = getComputedStyle(element).overflowX;
            const box = overflow === 'hidden' || overflow === 'clip' ? element.getBoundingClientRect() : null;

            overflowClips.set(element, box
                ? { x: box.left - origin.x, y: box.top - origin.y, width: box.width, height: box.height }
                : overflowClipOf(element.parentElement, root, origin));
        }

        return overflowClips.get(element);
    }

    function measureTextNode(node, origin, root) {
        const element = node.parentElement;
        const style = getComputedStyle(element);
        const opacity = opacityOf(element, root) * brightnessOf(element);

        if (opacity <= .01 || isTransparent(style.color)) {
            return;
        }

        const overflowClip = overflowClipOf(element, root, origin);

        if (overflowClip && overflowClip.width < 1) {
            return;
        }

        const decorated = element.closest('a, button');
        const decorationStyle = decorated ? getComputedStyle(decorated) : null;
        const underline = decorationStyle && decorationStyle.textDecorationLine.includes('underline') && ! isTransparent(decorationStyle.textDecorationColor)
            ? decorationStyle.textDecorationColor
            : null;
        const range = document.createRange();
        const text = node.nodeValue;
        const words = /\S+/g;

        let match;

        while ((match = words.exec(text)) !== null) {
            range.setStart(node, match.index);
            range.setEnd(node, match.index + match[0].length);

            const boxes = range.getClientRects();

            if (boxes.length === 1) {
                items.push(textItem(match[0], boxes[0], style, origin, { opacity, underline, element, overflowClip }));

                continue;
            }

            for (let index = 0; index < match[0].length; index++) {
                range.setStart(node, match.index + index);
                range.setEnd(node, match.index + index + 1);

                const box = range.getBoundingClientRect();

                if (box.width > 0) {
                    items.push(textItem(match[0][index], box, style, origin, { opacity, underline, element, overflowClip }));
                }
            }
        }
    }

    function measurePseudo(element, origin, root) {
        if (! element.matches(pseudoSelector)) {
            return;
        }

        ['::before', '::after'].forEach(pseudo => {
            const style = getComputedStyle(element, pseudo);
            const value = style.content;

            if (! value || value === 'none' || value === 'normal') {
                return;
            }

            const text = value.startsWith('attr(')
                ? element.getAttribute(value.slice(5, -1)) || ''
                : value.replace(/^["']|["']$/g, '');

            if (text === '') {
                return;
            }

            const opacity = opacityOf(element, root);

            if (opacity <= .01) {
                return;
            }

            const box = element.getBoundingClientRect();
            const elementStyle = getComputedStyle(element);
            const font = fontOf(style);

            context.font = font;

            const width = context.measureText(text).width;
            const isRightAligned = elementStyle.textAlign === 'right' || elementStyle.textAlign === 'end';
            const left = pseudo === '::before'
                ? (isRightAligned && ! element.textContent.trim() ? box.right - parseFloat(elementStyle.paddingRight) - width : box.left + parseFloat(elementStyle.paddingLeft))
                : box.right - parseFloat(elementStyle.paddingRight) - width;
            const lineHeight = parseFloat(elementStyle.lineHeight) || box.height;
            const pseudoBox = { left, top: box.top + parseFloat(elementStyle.paddingTop), height: Math.min(lineHeight, box.height) };

            if (pseudo === '::before' && element.textContent.trim()) {
                pseudoBox.left -= width;
            }

            items.push(textItem(text, pseudoBox, style, origin, { opacity, element }));
        });
    }

    function measureBackground(element, origin, root) {
        const style = getComputedStyle(element);

        if (isTransparent(style.backgroundColor)) {
            return;
        }

        const opacity = opacityOf(element, root);

        if (opacity <= .01) {
            return;
        }

        Array.from(element.getClientRects()).forEach(box => {
            items.push({
                type: 'rect',
                x: box.left - origin.x,
                y: box.top - origin.y,
                width: box.width,
                height: box.height,
                colour: style.backgroundColor,
                opacity,
                element,
            });
        });
    }

    function measureInput(input, origin) {
        const style = getComputedStyle(input);
        const placeholderStyle = getComputedStyle(input, '::placeholder');
        const box = input.getBoundingClientRect();

        inputItem = {
            input,
            x: box.left - origin.x + parseFloat(style.paddingLeft),
            top: box.top - origin.y,
            height: box.height,
            width: box.width,
            font: fontOf(style),
            colour: style.color,
            placeholderFont: fontOf(placeholderStyle),
            placeholderColour: placeholderStyle.color,
        };
    }

    /**
     * Where the brand and the prompt sit on the first screen, to burn them
     * faintly into the phosphor there.
     */
    function measureBurn(root, origin) {
        const brand = root.querySelector('.brand');

        if (! brand || burn) {
            return;
        }

        const brandBox = brand.getBoundingClientRect();
        const brandItems = items.filter(item => item.type === 'text' && item.element && brand.contains(item.element));
        const label = root.querySelector('.prompt__label');
        const input = root.querySelector('.prompt__input');

        if (! label || ! input || ! brandItems.length) {
            return;
        }

        const promptTop = brandBox.bottom - origin.y + clip.y + parseFloat(getComputedStyle(brand).marginBottom);
        const labelStyle = getComputedStyle(label);
        const placeholderStyle = getComputedStyle(input, '::placeholder');
        const labelFont = fontOf(labelStyle);
        const { ascent, descent } = metricsFor(labelFont);
        const lineHeight = parseFloat(getComputedStyle(label.parentElement).lineHeight) || (ascent + descent);
        const baseline = promptTop + (lineHeight - (ascent + descent)) / 2 + ascent;
        const labelBox = label.getBoundingClientRect();
        const inputBox = input.getBoundingClientRect();

        paintBurn([
            ...brandItems.map(item => ({ ...item, y: item.y + clip.y })),
            { type: 'text', text: '→', x: labelBox.left - origin.x, y: baseline, font: labelFont },
            { type: 'text', text: withoutLigatures(input.getAttribute('placeholder') || ''), x: inputBox.left - origin.x, y: baseline, font: fontOf(placeholderStyle) },
        ]);
    }

    /**
     * Paints the burnt in text once, into a canvas of its own, as it stays
     * on the glass while the content scrolls.
     */
    function paintBurn(burnItems) {
        burn = burnItems;

        let left = Infinity;
        let top = Infinity;
        let right = 0;
        let bottom = 0;

        burnItems.forEach(item => {
            const { ascent, descent } = metricsFor(item.font);

            context.font = item.font;
            left = Math.min(left, item.x);
            right = Math.max(right, item.x + context.measureText(item.text).width);
            top = Math.min(top, item.y - ascent);
            bottom = Math.max(bottom, item.y + descent);
        });

        burnBox = [left - 2, top - 2, right - left + 4, bottom - top + 4];
        burnCanvas.width = Math.ceil(burnBox[2] * scale);
        burnCanvas.height = Math.ceil(burnBox[3] * scale);
        burnContext.setTransform(scale, 0, 0, scale, -burnBox[0] * scale, -burnBox[1] * scale);
        burnContext.fillStyle = getComputedStyle(picture).getPropertyValue('--fg') || '#7dffa6';
        burnContext.globalAlpha = .045;
        burnItems.forEach(item => {
            burnContext.font = item.font;
            burnContext.fillText(item.text, item.x, item.y);
        });

        burnVersion++;
    }

    /**
     * Measures with the DOM text visible for a moment, as the styles that make
     * it transparent would hide the colours. Transitions are off meanwhile,
     * so every colour is read at its final value. Nothing is painted in between.
     */
    function withVisibleText(callback) {
        const html = document.documentElement;

        opacities.clear();
        overflowClips.clear();

        const textMode = html.getAttribute('data-text');

        html.setAttribute('data-measuring', '');
        html.removeAttribute('data-text');

        try {
            callback();
        } finally {
            if (textMode) {
                html.setAttribute('data-text', textMode);
            }

            void picture.offsetWidth;
            html.removeAttribute('data-measuring');
        }
    }

    function measure() {
        withVisibleText(measureContent);
        pendingLines.clear();
    }

    function walk(element, root, origin, textNodes) {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                if (node.nodeType === Node.ELEMENT_NODE && node.matches(skippedSelector)) {
                    return NodeFilter.FILTER_REJECT;
                }

                return NodeFilter.FILTER_ACCEPT;
            },
        });

        while (walker.nextNode()) {
            const node = walker.currentNode;

            if (node.nodeType === Node.TEXT_NODE) {
                if (node.nodeValue.trim() !== '') {
                    textNodes.push(node);
                }

                continue;
            }

            if (node.matches('input')) {
                measureInput(node, origin);

                continue;
            }

            measureBackground(node, origin, root);
            measurePseudo(node, origin, root);

            if (node.matches(lineSelector)) {
                const box = node.getBoundingClientRect();

                if (box.height > 0) {
                    lines.push({ element: node, top: box.top - origin.y, bottom: box.bottom - origin.y });
                }
            }
        }
    }

    function originOf(root) {
        const pictureBox = picture.getBoundingClientRect();

        return { x: pictureBox.left, y: pictureBox.top + clip.y - root.scrollTop };
    }

    function tagLines(newItems) {
        newItems.forEach(item => {
            item.line = item.element ? item.element.closest(lineSelector) : null;
        });
    }

    /**
     * Measures a single line again, for hovers, which only change one line.
     * Returns the content rows to paint again.
     */
    function measureLine(line) {
        const root = content();

        if (! root || ! root.contains(line)) {
            return null;
        }

        const origin = originOf(root);
        const previous = lines.find(entry => entry.element === line);
        const textNodes = [];

        items = items.filter(item => item.line !== line);
        lines = lines.filter(entry => entry.element !== line);

        const firstNew = items.length;

        withVisibleText(() => {
            measureBackground(line, origin, root);
            measurePseudo(line, origin, root);

            const box = line.getBoundingClientRect();

            lines.push({ element: line, top: box.top - origin.y, bottom: box.bottom - origin.y });
            walk(line, root, origin, textNodes);
            textNodes.forEach(node => measureTextNode(node, origin, root));
        });

        tagLines(items.slice(firstNew));

        const current = lines.find(entry => entry.element === line);

        return {
            hasMoved: Boolean(previous) && Math.abs((previous.bottom - previous.top) - (current.bottom - current.top)) > .5,
            from: Math.min(current.top, previous ? previous.top : current.top) - 2,
            to: Math.max(current.bottom, previous ? previous.bottom : current.bottom) + 2,
        };
    }

    function measureContent() {
        const root = content();

        items = [];
        lines = [];
        inputItem = null;

        if (! root) {
            return;
        }

        const pictureBox = picture.getBoundingClientRect();
        const rootBox = root.getBoundingClientRect();

        scrollTop = root.scrollTop;

        clip = {
            x: rootBox.left - pictureBox.left + root.clientLeft,
            y: rootBox.top - pictureBox.top + root.clientTop,
            width: root.clientWidth,
            height: root.clientHeight,
        };

        resize();

        const origin = { x: pictureBox.left, y: pictureBox.top + clip.y - scrollTop };
        const textNodes = [];

        walk(root, root, origin, textNodes);
        textNodes.forEach(node => measureTextNode(node, origin, root));
        tagLines(items);
        measureBurn(root, origin);

        isMeasured = true;
    }

    function drawText(item, alpha) {
        context.globalAlpha = alpha;
        context.font = item.font;
        context.fillStyle = item.colour;
        context.fillText(item.text, item.x, item.y);
    }

    function drawInput() {
        const { input } = inputItem;
        const hasValue = input.value !== '';
        const font = hasValue ? inputItem.font : inputItem.placeholderFont;
        const { ascent, descent } = metricsFor(font);
        const baseline = inputItem.top + (inputItem.height - (ascent + descent)) / 2 + ascent;

        context.save();
        context.beginPath();
        context.rect(inputItem.x, inputItem.top, inputItem.width, inputItem.height);
        context.clip();
        context.globalAlpha = 1;
        context.font = font;
        context.fillStyle = hasValue ? inputItem.colour : inputItem.placeholderColour;
        context.fillText(withoutLigatures(hasValue ? input.value : input.getAttribute('placeholder') || ''), inputItem.x - input.scrollLeft, baseline);
        context.restore();
    }

    function drawItems(from, to) {
        items.forEach(item => {
            if (item.type === 'rect' && item.y < to && item.y + item.height > from) {
                context.globalAlpha = item.opacity;
                context.fillStyle = item.colour;
                context.fillRect(item.x, item.y, item.width, item.height);
            }
        });

        items.forEach(item => {
            if (item.type !== 'text' || item.y < from - 40 || item.y > to + 40) {
                return;
            }

            if (item.overflowClip) {
                context.save();
                context.beginPath();
                context.rect(item.overflowClip.x, item.overflowClip.y, item.overflowClip.width, item.overflowClip.height);
                context.clip();
                drawText(item, item.opacity);
                context.restore();
            } else {
                drawText(item, item.opacity);
            }

            if (item.underline) {
                context.fillStyle = item.underline;
                context.fillRect(item.x, item.y + parseFloat(item.font.split(' ')[2]) * .22, context.measureText(item.text).width, 1);
            }
        });

        if (inputItem && inputItem.top < to && inputItem.top + inputItem.height > from) {
            drawInput();
        }

        if (corruption && corruption.y - corruption.ascent < to && corruption.y + corruption.descent > from) {
            context.globalAlpha = 1;
            context.fillStyle = getComputedStyle(picture).getPropertyValue('--bg') || '#050a07';
            context.fillRect(corruption.x, corruption.y - corruption.ascent, corruption.width, corruption.ascent + corruption.descent);
            drawText(corruption, corruption.opacity);
        }
    }

    /**
     * The rows of the ring a range of content rows lives on, split where the
     * ring wraps around.
     */
    function ringSegments(from, to) {
        const segments = [];

        let start = from;

        while (start < to) {
            const lap = Math.floor(start / ringHeight);
            const end = Math.min(to, (lap + 1) * ringHeight);

            segments.push({ from: start, to: end, lap, ringTop: start - lap * ringHeight });
            start = end;
        }

        return segments;
    }

    /**
     * Paints a range of content rows, clamped to what is on screen, and
     * returns the rows of the ring that changed.
     */
    function paintRows(from, to) {
        const visibleFrom = Math.max(from, paintedScroll);
        const visibleTo = Math.min(to, paintedScroll + ringHeight);

        if (visibleTo <= visibleFrom) {
            return [];
        }

        const segments = ringSegments(Math.floor(visibleFrom), Math.ceil(visibleTo));

        context.textBaseline = 'alphabetic';

        segments.forEach(segment => {
            context.setTransform(scale, 0, 0, scale, 0, 0);
            context.save();
            context.beginPath();
            context.rect(0, segment.ringTop, cssWidth, segment.to - segment.from);
            context.clip();
            context.clearRect(0, segment.ringTop, cssWidth, segment.to - segment.from);
            context.translate(0, -segment.lap * ringHeight);
            context.beginPath();
            context.rect(clip.x, paintedScroll, clip.width, ringHeight);
            context.clip();
            drawItems(segment.from, segment.to);
            context.restore();
        });

        version++;

        return segments;
    }

    function paintAll(scroll) {
        paintedScroll = scroll;
        paintRows(scroll, scroll + ringHeight);
        isPainted = true;
    }

    /**
     * Copies rows of the ring to a canvas of their own, for a partial upload.
     */
    function regionOf(segment, index) {
        const y = Math.max(0, Math.floor(segment.ringTop * scale) - 1);
        const height = Math.min(canvas.height - y, Math.ceil((segment.to - segment.from) * scale) + 2);

        if (height <= 0) {
            return null;
        }

        if (! regionPool[index]) {
            regionPool[index] = document.createElement('canvas');
        }

        const regionCanvas = regionPool[index];

        regionCanvas.width = canvas.width;
        regionCanvas.height = height;
        regionCanvas.getContext('2d').drawImage(canvas, 0, y, canvas.width, height, 0, 0, canvas.width, height);

        return { canvas: regionCanvas, x: 0, y };
    }

    return {
        canvas,

        get version() {
            return version;
        },

        get scale() {
            return scale;
        },

        get size() {
            return { width: cssWidth, height: cssHeight };
        },

        /**
         * Measures again before the next paint, for content that changed.
         */
        invalidate() {
            isMeasured = false;
            isPainted = false;
        },

        /**
         * Measures and paints a single line again, for hovers.
         */
        invalidateLine(element) {
            const line = element ? element.closest(lineSelector) : null;

            if (line) {
                pendingLines.add(line);
            }
        },

        /**
         * Paints only the input again, for typing.
         */
        repaintInput() {
            isInputDirty = true;
        },

        /**
         * Brings the canvas up to date. Returns null when nothing changed,
         * true after a full paint, or the regions that changed.
         */
        update() {
            const root = content();
            const scroll = root ? root.scrollTop : 0;

            if (! isMeasured) {
                measure();
                isPainted = false;

                return null;
            }

            if (! isPainted || Math.abs(scroll - paintedScroll) >= ringHeight) {
                paintAll(scroll);
                isInputDirty = false;
                corruptionRows = null;

                return true;
            }

            const segments = [];

            if (scroll !== paintedScroll) {
                const previous = paintedScroll;

                lastScrolledAt = performance.now();

                paintedScroll = scroll;
                segments.push(...(scroll > previous
                    ? paintRows(previous + ringHeight, scroll + ringHeight)
                    : paintRows(scroll, previous)));
            }

            if (isInputDirty && inputItem) {
                segments.push(...paintRows(inputItem.top - 2, inputItem.top + inputItem.height + 2));
            }

            if (corruptionRows) {
                segments.push(...paintRows(corruptionRows.from, corruptionRows.to));
            }

            if (performance.now() - lastScrolledAt > 150) {
                const linesToMeasure = Array.from(pendingLines);

                pendingLines.clear();

                for (const line of linesToMeasure) {
                    const rows = measureLine(line);

                    if (rows && rows.hasMoved) {
                        measure();
                        paintAll(scroll);

                        return true;
                    }

                    if (rows) {
                        segments.push(...paintRows(rows.from, rows.to));
                    }
                }
            }

            isInputDirty = false;
            corruptionRows = null;

            if (! segments.length) {
                return null;
            }

            return segments.map(regionOf).filter(Boolean);
        },

        /**
         * Where the ring sits: the top of the scrolling content on the
         * picture, its height, and the scroll it was painted for.
         */
        get ring() {
            return [clip.y, ringHeight, paintedScroll, 0];
        },

        get burn() {
            return { canvas: burnCanvas, box: burnBox, version: burnVersion };
        },

        /**
         * The lines on screen, in picture coordinates, for line glitches.
         */
        visibleLines() {
            return lines
                .map(line => ({ ...line, top: line.top + clip.y - paintedScroll, bottom: line.bottom + clip.y - paintedScroll }))
                .filter(line => line.bottom > clip.y && line.top < clip.y + clip.height);
        },

        /**
         * The lines of a lookup result, in content coordinates, with the delay
         * of their reveal.
         */
        resultLines() {
            const root = content();
            const results = root ? root.querySelector('.results__output') : null;

            if (! results) {
                return null;
            }

            const box = results.getBoundingClientRect();
            const pictureBox = picture.getBoundingClientRect();
            const top = box.top - pictureBox.top + root.scrollTop;

            return {
                left: box.left - pictureBox.left,
                width: box.width,
                top,
                height: box.height,
                lines: Array.from(results.querySelectorAll('.line')).map(line => {
                    const lineBox = line.getBoundingClientRect();

                    return {
                        top: lineBox.top - box.top,
                        bottom: lineBox.bottom - box.top,
                        delay: parseFloat(line.style.getPropertyValue('--delay')) / 1000 || 0,
                    };
                }),
            };
        },

        get scrollOffset() {
            return paintedScroll;
        },

        /**
         * Where the caret is, in picture coordinates, or null without focus.
         */
        caret() {
            if (! inputItem || document.activeElement !== inputItem.input) {
                return null;
            }

            const { input } = inputItem;
            const { ascent, descent } = metricsFor(inputItem.font);
            const height = ascent + descent;

            context.font = inputItem.font;

            const x = inputItem.x - input.scrollLeft + context.measureText(input.value.slice(0, input.selectionStart ?? input.value.length)).width;
            const top = inputItem.top + clip.y - paintedScroll + (inputItem.height - height) / 2;

            return { x, top, width: 1.6, height, colour: inputItem.colour };
        },

        /**
         * Turns a few glyphs into garbage for a moment.
         */
        corrupt(duration) {
            const candidates = items.filter(item => item.type === 'text' && item.y > paintedScroll && item.y < paintedScroll + ringHeight);
            const item = candidates[Math.floor(Math.random() * candidates.length)];

            if (! item) {
                return;
            }

            const characters = item.text.split(ligatureBreaker);
            const start = Math.floor(Math.random() * characters.length);
            const length = Math.min(characters.length - start, 1 + Math.floor(Math.random() * 3));
            const { ascent, descent } = metricsFor(item.font);

            context.font = item.font;

            const before = context.measureText(characters.slice(0, start).join('')).width;
            const width = context.measureText(characters.slice(start, start + length).join('')).width;

            corruption = {
                ...item,
                text: Array.from({ length }, () => garbage[Math.floor(Math.random() * garbage.length)]).join(''),
                x: item.x + before,
                width,
                ascent,
                descent,
            };

            const rows = { from: item.y - ascent - 1, to: item.y + descent + 1 };

            corruptionRows = rows;

            setTimeout(() => {
                corruption = null;
                corruptionRows = rows;
            }, duration);
        },
    };
}
