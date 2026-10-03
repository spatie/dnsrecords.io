/*
 * Mother answers one character at a time. The text is already in the DOM
 * (it is rendered on the server, so it works without JavaScript and for
 * screen readers); this empties the text nodes and writes them back with a
 * block cursor riding along. Prose is typed slowly, records quickly enough
 * that even a long answer is done in a few seconds.
 */

const proseCharactersPerSecond = 46;
const recordCharactersPerSecond = 420;
const longestRecordTyping = 2.4;
const pauseAfterLine = .12;
const longestProseLine = 1.6;

function collectSegments(container, { skip }) {
    const segments = [];
    const lines = Array.from(container.querySelectorAll('[data-line]'));

    lines.forEach(line => {
        const isSkipped = skip && line.matches(skip);
        const isRecord = line.classList.contains('record') || line.classList.contains('status-report__row');
        const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
        const nodes = [];

        while (walker.nextNode()) {
            const node = walker.currentNode;

            if (node.nodeValue === '' || node.parentNode.closest('button, .record__gap')) {
                continue;
            }

            nodes.push(node);
        }

        const texts = nodes.map(node => node.nodeValue);

        segments.push({ line, nodes, texts, length: texts.join('').length, isSkipped, isRecord });
    });

    return segments;
}

export function typeOut(container, { skip = null, instant = false, onDone = () => {} } = {}) {
    const segments = collectSegments(container, { skip });
    const cursor = document.createElement('span');

    cursor.className = 'mother-cursor';
    cursor.setAttribute('aria-hidden', 'true');

    const recordCharacters = segments
        .filter(segment => segment.isRecord && ! segment.isSkipped)
        .reduce((total, segment) => total + segment.texts.join('').length, 0);
    const recordRate = Math.max(recordCharactersPerSecond, recordCharacters / longestRecordTyping);

    let segmentIndex = 0;
    let nodeIndex = 0;
    let characterIndex = 0;
    let budget = 0;
    let pause = 0;
    let lastTime = null;
    let frame = null;
    let isDone = false;

    function finish() {
        if (isDone) {
            return;
        }

        isDone = true;
        cancelAnimationFrame(frame);

        segments.forEach(segment => {
            segment.nodes.forEach((node, index) => {
                node.nodeValue = segment.texts[index];
            });
            segment.line.classList.add('is-shown');
        });

        cursor.remove();
        container.classList.remove('is-typing');
        container.removeAttribute('aria-busy');
        onDone();
    }

    if (instant || ! segments.length) {
        finish();

        return { finish, get isDone() { return true; } };
    }

    container.classList.add('is-typing');
    container.setAttribute('aria-busy', 'true');

    segments.forEach(segment => {
        if (segment.isSkipped) {
            segment.line.classList.add('is-shown');

            return;
        }

        segment.line.classList.remove('is-shown');
        segment.nodes.forEach(node => {
            node.nodeValue = '';
        });
    });

    function step(time) {
        const delta = lastTime === null ? 0 : Math.min(.1, (time - lastTime) / 1000);

        lastTime = time;

        if (pause > 0) {
            pause -= delta;
            frame = requestAnimationFrame(step);

            return;
        }

        budget += delta;

        while (segmentIndex < segments.length) {
            const segment = segments[segmentIndex];

            if (segment.isSkipped || ! segment.nodes.length) {
                segment.line.classList.add('is-shown');
                segmentIndex++;
                nodeIndex = 0;
                characterIndex = 0;

                continue;
            }

            segment.line.classList.add('is-shown');

            const node = segment.nodes[nodeIndex];
            const text = segment.texts[nodeIndex];
            const secondsPerCharacter = 1 / (segment.isRecord ? recordRate : Math.max(proseCharactersPerSecond, segment.length / longestProseLine));
            const available = Math.floor(budget / secondsPerCharacter);

            if (available < 1) {
                if (cursor.previousSibling !== node) {
                    node.after(cursor);
                }

                break;
            }

            const count = Math.min(available, text.length - characterIndex);

            characterIndex += count;
            budget -= count * secondsPerCharacter;
            node.nodeValue = text.slice(0, characterIndex);
            node.after(cursor);

            if (characterIndex < text.length) {
                continue;
            }

            nodeIndex++;
            characterIndex = 0;

            if (nodeIndex < segment.nodes.length) {
                continue;
            }

            segmentIndex++;
            nodeIndex = 0;

            if (! segment.isRecord) {
                pause = pauseAfterLine;
                budget = 0;

                break;
            }
        }

        if (segmentIndex >= segments.length) {
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
