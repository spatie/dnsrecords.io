/*
 * Mother writes the way she does in the film. The text is already in the
 * DOM (rendered on the server, so it works without JavaScript and for
 * screen readers). Every text node is split into what is written, one
 * scrambled cell at the writing edge, and the rest, which keeps its place
 * but stays invisible, so nothing on the screen moves while she writes.
 *
 * Lines are written one after the other at about 45 characters a second.
 * A matrix is written column by column, all rows at the same time, the
 * even rows a couple of frames ahead of the odd ones, like interlaced
 * fields. The writing advances on every display frame, so it stays smooth
 * at 60 or 120 frames per second; only the speed comes from the film.
 */

const glyphChangeInterval = .05;
const lineCharactersPerSecond = 45;
const longestLine = 1;
const pauseAfterLine = .12;
const columnCharactersPerSecond = 32;
const shortestColumn = .25;
const longestColumn = .9;
const columnOverlap = .8;
const oddRowDelay = 2 / 24;

const scrambleGlyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+<>=/';

export function randomGlyph() {
    return scrambleGlyphs[Math.floor(Math.random() * scrambleGlyphs.length)];
}

class WritableText {
    constructor(node) {
        this.node = node;
        this.text = node.nodeValue;
        this.written = document.createTextNode('');
        this.edge = document.createElement('span');
        this.edge.className = 'scramble';
        this.rest = document.createElement('span');
        this.rest.className = 'unwritten';
        this.rest.textContent = this.text;
        this.count = -1;
        this.glyphChangedAt = -1;
    }

    get length() {
        return this.text.length;
    }

    hide() {
        this.node.replaceWith(this.written, this.edge, this.rest);
        this.edge.remove();
    }

    show(count, time) {
        const shown = Math.max(0, Math.min(this.length, count));
        const isWriting = shown > 0 && shown < this.length;
        const isGlyphDue = isWriting && time - this.glyphChangedAt >= glyphChangeInterval;

        if (shown === this.count && ! isGlyphDue) {
            return;
        }

        if (isGlyphDue) {
            this.glyphChangedAt = time;
            this.edge.setAttribute('data-a', randomGlyph());
            this.edge.setAttribute('data-b', randomGlyph());
        }

        if (shown === this.count) {
            return;
        }

        this.count = shown;
        this.written.nodeValue = this.text.slice(0, shown);

        if (isWriting) {
            this.edge.textContent = this.text[shown];
            this.rest.textContent = this.text.slice(shown + 1);

            if (! this.edge.isConnected) {
                this.written.after(this.edge);
            }

            return;
        }

        this.edge.remove();
        this.rest.textContent = this.text.slice(shown);
    }

    restore() {
        if (! this.written.isConnected) {
            return;
        }

        this.node.nodeValue = this.text;
        this.written.replaceWith(this.node);
        this.edge.remove();
        this.rest.remove();
    }
}

function textNodesOf(element) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes = [];

    while (walker.nextNode()) {
        const node = walker.currentNode;

        if (node.nodeValue.trim() === '' || node.parentNode.closest('button, .record__gap')) {
            continue;
        }

        nodes.push(node);
    }

    return nodes;
}

function totalLength(texts) {
    return texts.reduce((total, text) => total + text.length, 0);
}

/**
 * A run of text written at a steady rate from a start time.
 */
function track(element, texts, start, duration) {
    return { element, texts, start, duration, length: totalLength(texts), end: start + duration };
}

function lineTrack(element, start) {
    const texts = textNodesOf(element).map(node => new WritableText(node));
    const duration = Math.min(longestLine, totalLength(texts) / lineCharactersPerSecond);

    return track(element, texts, start, duration);
}

function matrixTracks(matrix, start) {
    const tracks = [];
    const title = matrix.querySelector('[data-line]');
    let columnStart = start;
    let end = start;

    if (title) {
        const titleTrack = lineTrack(title, start);

        tracks.push(titleTrack);
        columnStart = start + titleTrack.duration * .4;
        end = titleTrack.end;
    }

    const rows = Array.from(matrix.querySelectorAll('[data-row]'));
    const columns = new Map();

    rows.forEach((row, rowIndex) => {
        row.querySelectorAll('[data-column]').forEach(cell => {
            const column = Number(cell.getAttribute('data-column'));

            if (! columns.has(column)) {
                columns.set(column, []);
            }

            columns.get(column).push({ cell, rowIndex, texts: textNodesOf(cell).map(node => new WritableText(node)) });
        });
    });

    Array.from(columns.keys()).sort((a, b) => a - b).forEach(column => {
        const cells = columns.get(column);
        const longest = Math.max(1, ...cells.map(({ texts }) => totalLength(texts)));
        const duration = Math.min(longestColumn, Math.max(shortestColumn, longest / columnCharactersPerSecond));

        cells.forEach(({ cell, rowIndex, texts }) => {
            const cellLength = totalLength(texts);
            const cellStart = columnStart + (rowIndex % 2) * oddRowDelay;

            tracks.push(track(cell, texts, cellStart, duration * cellLength / longest));
        });

        end = Math.max(end, columnStart + duration + oddRowDelay);
        columnStart += duration * columnOverlap;
    });

    tracks.push({ element: matrix, texts: [], start, duration: 0, length: 0, end });

    return { tracks, end };
}

function buildTimeline(container) {
    const tracks = [];
    let time = 0;

    const blocks = Array.from(container.querySelectorAll('[data-matrix], [data-line]'))
        .filter(element => element.matches('[data-matrix]') || ! element.closest('[data-matrix]'));

    blocks.forEach(element => {
        if (element.matches('[data-matrix]')) {
            const matrix = matrixTracks(element, time);

            tracks.push(...matrix.tracks);
            time = matrix.end + pauseAfterLine;

            return;
        }

        const line = lineTrack(element, time);

        tracks.push(line);
        time = line.end + pauseAfterLine;
    });

    return { tracks, duration: time };
}

/**
 * Writes the lines and matrices in a container. Returns a handle to finish
 * at once, and reports the cells being written on every update, so the
 * light around the writing can follow.
 */
export function writeOut(container, { instant = false, onUpdate = () => {}, onDone = () => {} } = {}) {
    const { tracks, duration } = buildTimeline(container);
    const lines = Array.from(container.querySelectorAll('[data-line], [data-matrix]'));

    let frame = null;
    let startedAt = null;
    let isDone = false;

    function finish() {
        if (isDone) {
            return;
        }

        isDone = true;
        cancelAnimationFrame(frame);
        tracks.forEach(item => item.texts.forEach(text => text.restore()));
        lines.forEach(line => line.classList.add('is-shown'));
        container.classList.remove('is-writing');
        container.removeAttribute('aria-busy');
        onDone();
    }

    if (instant || ! tracks.length) {
        finish();

        return { finish, get isDone() { return true; } };
    }

    container.classList.add('is-writing');
    container.setAttribute('aria-busy', 'true');
    lines.forEach(line => line.classList.remove('is-shown'));
    tracks.forEach(item => item.texts.forEach(text => text.hide()));

    function render(time) {
        const active = [];

        tracks.forEach(item => {
            if (time < item.start) {
                return;
            }

            item.element.classList.add('is-shown');

            if (! item.length) {
                return;
            }

            let remaining = item.duration > 0 ? Math.floor((time - item.start) / item.duration * item.length) : item.length;

            item.texts.forEach(text => {
                text.show(remaining, time);

                if (remaining > 0 && remaining < text.length) {
                    active.push(text.edge);
                }

                remaining -= text.length;
            });
        });

        onUpdate(active);
    }

    function step(now) {
        if (startedAt === null) {
            startedAt = now;
        }

        const elapsed = (now - startedAt) / 1000;

        render(elapsed);

        if (elapsed >= duration) {
            finish();

            return;
        }

        frame = requestAnimationFrame(step);
    }

    frame = requestAnimationFrame(step);

    return {
        finish,
        get isDone() {
            return isDone;
        },
    };
}
