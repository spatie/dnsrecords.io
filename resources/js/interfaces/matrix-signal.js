const root = document.documentElement;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const glyphs = Array.from('ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ01345789');
const ink = {
    bright: '#e5ffeb',
    main: '#a8ffba',
    dim: '#6abf80',
    quiet: '#376e49',
};

function glyph() {
    return glyphs[Math.floor(Math.random() * glyphs.length)];
}

function wrap(text, columns, continuation = '    ') {
    const characters = Array.from(text);
    const lines = [];

    while (characters.length) {
        const limit = columns - (lines.length ? continuation.length : 0);
        const part = characters.splice(0, Math.max(1, limit)).join('');

        lines.push(`${lines.length ? continuation : ''}${part}`);
    }

    return lines.length ? lines : [''];
}

function signalLines(data, columns) {
    const titleColumns = Math.max(10, Math.floor(columns / 1.8));
    const lines = [
        ...wrap(`> ${data.domain.toUpperCase()}`, titleColumns).map(text => ({ text, tone: 'bright', size: 24, gap: 18 })),
    ];

    let recordNumber = 0;

    data.lines.forEach((line, lineIndex) => {
        const nextLine = data.lines[lineIndex + 1];

        if (line.type) {
            recordNumber++;

            const label = `› ${String(recordNumber).padStart(2, '0')}  ${line.type.padEnd(6)} ${line.name}`;
            const header = `${label}   ·  ttl ${line.ttl}`;

            wrap(header, columns).forEach(text => lines.push({ text, tone: 'dim', gap: 0 }));
            wrap(`   └ ${line.value || '∅'}`, columns, '     ').forEach((text, index, wrapped) => {
                const last = index === wrapped.length - 1;
                const continues = nextLine && ! nextLine.type && nextLine.text.trim();

                lines.push({ text, tone: 'bright', gap: last ? (continues ? 3 : 13) : 0 });
            });
        } else if (line.text.trim()) {
            wrap(`     ${line.text.trim().replace(/\s+/g, ' ')}`, columns, '     ').forEach(text => {
                lines.push({ text, tone: 'main', gap: nextLine?.type ? 13 : 3 });
            });
        }
    });

    lines.push({ text: '░'.repeat(Math.max(8, columns - 2)), tone: 'quiet', gap: 8 });
    lines.push({ text: `:: END TRANSMISSION / ${data.domain.toUpperCase()}`, tone: 'dim', gap: 0 });

    return lines;
}

function createSignal(section) {
    const canvas = section.querySelector('.matrix-signal__canvas');
    const data = JSON.parse(section.querySelector('.matrix-signal__data').textContent);
    const context = canvas.getContext('2d');
    const settled = document.createElement('canvas');
    const settledContext = settled.getContext('2d');

    if (! context || ! settledContext) {
        section.setAttribute('data-failed', '');
        root.removeAttribute('data-matrix-booting');
        return;
    }
    const fontFamily = '"JetBrains Mono", monospace';
    const padding = 12;

    let width = 0;
    let height = 0;
    let scale = 1;
    let characters = [];
    let rows = [];
    let streams = [];
    let frameId = null;
    let lastFrameAt = 0;
    let isComplete = false;

    function font(size) {
        return `${size >= 24 ? 700 : 500} ${size}px ${fontFamily}`;
    }

    function paint(target, character, value, colour, glow = false) {
        target.font = font(character.size);
        target.fillStyle = colour;
        target.shadowBlur = glow ? 12 : 0;
        target.shadowColor = glow ? '#8aff9f' : 'transparent';
        target.fillText(value, character.x, character.y);
        target.shadowBlur = 0;
    }

    function showSettled() {
        context.clearRect(0, 0, width, height);
        context.drawImage(settled, 0, 0, width, height);
    }

    function paintAll() {
        settledContext.clearRect(0, 0, width, height);
        characters.forEach(character => {
            paint(settledContext, character, character.value, character.colour);
            character.settled = true;
        });
        rows.forEach(row => row.complete = true);
        streams = [];
        showSettled();
        isComplete = true;
        root.classList.remove('matrix-transmitting');
    }

    function activateVisible(time) {
        const canvasTop = canvas.getBoundingClientRect().top;
        const visible = [];

        rows.forEach(row => {
            const top = canvasTop + row.y;

            if (row.complete || row.startedAt !== null || top >= window.innerHeight - 12 || top + row.height <= -25) {
                return;
            }

            row.startedAt = time;
            visible.push(row);
        });

        const columns = new Map();

        visible.forEach(row => row.characters.forEach(character => {
            const key = `${character.size}:${Math.round(character.x * 10)}`;

            if (! columns.has(key)) {
                columns.set(key, []);
            }

            columns.get(key).push(character);
        }));

        let index = 0;

        columns.forEach(column => {
            column.sort((first, second) => first.y - second.y);

            streams.push({
                x: column[0].x,
                size: column[0].size,
                characters: column,
                originY: column[0].y - 160,
                endY: column[column.length - 1].y + 80,
                startedAt: time + index * 11 + Math.random() * 110,
                speed: 390 + Math.random() * 120,
                lastMutationAt: 0,
                done: false,
            });

            index++;
        });

        visible.filter(row => row.characters.length === 0).forEach(row => row.complete = true);

        return columns.size;
    }

    function wake() {
        if (! section.isConnected || document.hidden || reducedMotion.matches) {
            return;
        }

        const started = activateVisible(performance.now());
        const active = streams.some(stream => ! stream.done);

        if ((started || active) && frameId === null) {
            root.classList.add('matrix-transmitting');
            frameId = window.requestAnimationFrame(frame);
        }
    }

    function layout() {
        const previousComplete = isComplete;
        const nextWidth = Math.max(1, section.clientWidth);

        if (nextWidth === width && characters.length) {
            return;
        }

        if (frameId !== null) {
            window.cancelAnimationFrame(frameId);
            frameId = null;
        }

        root.classList.remove('matrix-transmitting');
        width = nextWidth;
        scale = Math.min(window.devicePixelRatio || 1, 1.5);
        context.font = font(15);

        const cellWidth = context.measureText('M').width;
        const columns = Math.max(18, Math.floor((width - padding * 2) / cellWidth));
        const lines = signalLines(data, columns);
        let y = padding;

        characters = [];
        rows = [];
        streams = [];

        lines.forEach(line => {
            const size = line.size || 15;
            const row = { y, height: size >= 24 ? 38 : 24, startedAt: null, complete: false, characters: [] };
            const spacing = cellWidth * size / 15;

            Array.from(line.text).forEach((value, columnIndex) => {
                if (value === ' ') {
                    return;
                }

                const character = {
                    value,
                    x: padding + columnIndex * spacing,
                    y,
                    size,
                    colour: ink[line.tone],
                    arrivedAt: null,
                    settled: false,
                    cipher: glyph(),
                };

                row.characters.push(character);
                characters.push(character);
            });

            rows.push(row);
            y += row.height + line.gap;
        });

        height = y + padding;
        canvas.style.height = `${height}px`;
        canvas.width = Math.ceil(width * scale);
        canvas.height = Math.ceil(height * scale);
        settled.width = canvas.width;
        settled.height = canvas.height;
        context.setTransform(scale, 0, 0, scale, 0, 0);
        settledContext.setTransform(scale, 0, 0, scale, 0, 0);
        context.textBaseline = 'top';
        settledContext.textBaseline = 'top';
        lastFrameAt = 0;
        isComplete = false;

        if (previousComplete || reducedMotion.matches) {
            paintAll();
        } else {
            wake();
        }

        root.removeAttribute('data-matrix-booting');
    }

    function frame(time) {
        frameId = null;

        if (! section.isConnected || document.hidden) {
            root.classList.remove('matrix-transmitting');
            return;
        }

        if (time - lastFrameAt < 28) {
            frameId = window.requestAnimationFrame(frame);
            return;
        }

        lastFrameAt = time;
        activateVisible(time);

        streams.forEach(stream => {
            if (stream.done || time < stream.startedAt) {
                return;
            }

            const headY = stream.originY + (time - stream.startedAt) / 1000 * stream.speed;

            stream.characters.forEach(character => {
                if (character.arrivedAt === null && headY >= character.y) {
                    character.arrivedAt = time;
                }

                if (! character.settled && character.arrivedAt !== null && time - character.arrivedAt >= 110) {
                    paint(settledContext, character, character.value, character.colour);
                    character.settled = true;
                }
            });

            if (stream.characters.every(character => character.settled) && headY > stream.endY) {
                stream.done = true;
            }
        });

        rows.forEach(row => {
            if (row.startedAt !== null && row.characters.every(character => character.settled)) {
                row.complete = true;
            }
        });

        context.clearRect(0, 0, width, height);

        streams.forEach(stream => {
            if (stream.done || time < stream.startedAt) {
                return;
            }

            if (time - stream.lastMutationAt > 65) {
                stream.characters.forEach(character => {
                    if (! character.settled) {
                        character.cipher = glyph();
                    }
                });
                stream.lastMutationAt = time;
            }

            const headY = stream.originY + (time - stream.startedAt) / 1000 * stream.speed;

            stream.characters.forEach(character => {
                if (character.settled || headY < character.y - 100) {
                    return;
                }

                const distance = Math.abs(headY - character.y);
                const colour = distance < 25 ? '#e7ffeb' : distance < 65 ? '#8ceaa6' : '#3f995a';

                paint(context, character, character.cipher, colour, distance < 25);
            });
        });

        // Resolved characters cover their own code stream as it passes.
        context.drawImage(settled, 0, 0, width, height);

        if (streams.some(stream => ! stream.done)) {
            frameId = window.requestAnimationFrame(frame);
        } else {
            root.classList.remove('matrix-transmitting');
            isComplete = rows.every(row => row.complete);
        }
    }

    const abort = new AbortController();
    const resizeObserver = new ResizeObserver(layout);
    const removalObserver = new MutationObserver(() => {
        if (section.isConnected) {
            return;
        }

        abort.abort();
        resizeObserver.disconnect();
        removalObserver.disconnect();

        if (frameId !== null) {
            window.cancelAnimationFrame(frameId);
        }
    });

    window.addEventListener('scroll', wake, { passive: true, signal: abort.signal });
    window.addEventListener('resize', wake, { passive: true, signal: abort.signal });
    document.addEventListener('visibilitychange', wake, { signal: abort.signal });
    removalObserver.observe(document.getElementById('entries'), { childList: true, subtree: true });

    document.fonts.ready.then(() => {
        layout();
        resizeObserver.observe(section);
    }).catch(() => {
        section.setAttribute('data-failed', '');
        root.removeAttribute('data-matrix-booting');
    });
}

export function mountSignals(container) {
    if (root.dataset.interface !== 'matrix') {
        return;
    }

    container.querySelectorAll('.matrix-signal:not([data-mounted])').forEach(section => {
        section.setAttribute('data-mounted', '');
        createSignal(section);
    });

    if (! container.querySelector('.matrix-signal')) {
        root.removeAttribute('data-matrix-booting');
    }
}
