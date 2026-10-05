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
        ...wrap(`> ${data.domain.toUpperCase()}`, titleColumns).map(text => ({ text, tone: 'bright', size: 24, gap: 12 })),
        { text: `:: ${data.count ? `${data.count} RECORDS` : 'RESPONSE'} / SIGNAL DECODED`, tone: 'dim', gap: 12 },
        { text: '░'.repeat(Math.max(8, columns - 2)), tone: 'quiet', gap: 18 },
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
        showSettled();
        isComplete = true;
        root.classList.remove('matrix-transmitting');
    }

    function activateVisible(time) {
        const canvasTop = canvas.getBoundingClientRect().top;
        let staged = 0;

        rows.forEach(row => {
            const top = canvasTop + row.y;

            if (row.complete || row.startedAt !== null || top >= window.innerHeight - 12 || top + row.height <= -25) {
                return;
            }

            row.startedAt = time + staged * 75;
            staged++;
        });

        return staged;
    }

    function wake() {
        if (! section.isConnected || document.hidden || reducedMotion.matches) {
            return;
        }

        const started = activateVisible(performance.now());
        const active = rows.some(row => row.startedAt !== null && ! row.complete);

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

        lines.forEach(line => {
            const size = line.size || 15;
            const row = { y, height: size >= 24 ? 38 : 24, startedAt: null, completedAt: null, complete: false, characters: [] };
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
                    delay: 420 + columnIndex * 8 + Math.random() * 230,
                    settled: false,
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
        let active = false;

        rows.forEach(row => {
            if (row.complete || row.startedAt === null) {
                return;
            }

            row.characters.forEach(character => {
                if (character.settled) {
                    return;
                }

                if (time >= row.startedAt + character.delay) {
                    paint(settledContext, character, character.value, character.colour);
                    character.settled = true;
                } else {
                    active = true;
                }
            });

            if (row.characters.every(character => character.settled)) {
                row.complete = true;
                row.completedAt = time;
            }
        });

        showSettled();

        rows.forEach(row => {
            if (row.complete || row.startedAt === null) {
                return;
            }

            row.characters.forEach(character => {
                if (character.settled) {
                    return;
                }

                const remaining = row.startedAt + character.delay - time;

                if (remaining > 780) {
                    return;
                }

                const progress = 1 - remaining / 780;
                const falling = { ...character, y: character.y - (1 - progress) * 210 };

                if (progress > .35) {
                    paint(context, character, glyph(), '#4a9561');
                }

                paint(context, falling, glyph(), '#effff1', true);
                paint(context, { ...falling, y: falling.y - 20 }, glyph(), '#91e5a4');
                paint(context, { ...falling, y: falling.y - 40 }, glyph(), '#5da772');
                paint(context, { ...falling, y: falling.y - 60 }, glyph(), '#346447');
                paint(context, { ...falling, y: falling.y - 80 }, glyph(), '#244d35');
            });
        });

        rows.forEach(row => {
            if (row.completedAt === null || time - row.completedAt >= 180) {
                return;
            }

            active = true;
            context.globalAlpha = 1 - (time - row.completedAt) / 180;
            row.characters.forEach(character => paint(context, character, character.value, '#effff1', true));
            context.globalAlpha = 1;
        });

        if (active) {
            frameId = window.requestAnimationFrame(frame);
        } else {
            root.classList.remove('matrix-transmitting');
            isComplete = rows.every(row => row.complete);
        }
    }

    function glitch() {
        if (! section.isConnected) {
            return;
        }

        const box = section.getBoundingClientRect();
        const isVisible = box.bottom > 0 && box.top < window.innerHeight;

        if (frameId === null && isVisible && ! document.hidden && ! reducedMotion.matches) {
            const canvasTop = canvas.getBoundingClientRect().top;
            const visible = characters.filter(character => character.settled && canvasTop + character.y > 0 && canvasTop + character.y < window.innerHeight);

            showSettled();

            for (let index = 0; index < 12; index++) {
                const character = visible[Math.floor(Math.random() * visible.length)];

                if (character) {
                    paint(context, character, glyph(), '#f0fff2', true);
                }
            }

            window.setTimeout(showSettled, 90);
        }

        window.setTimeout(glitch, 4000 + Math.random() * 3500);
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
    window.setTimeout(glitch, 4800);
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
