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
        ...wrap(`> ${data.domain.toUpperCase()}`, titleColumns).map(text => ({ text, tone: 'bright', size: 27, gap: 12 })),
        { text: `:: ${data.count ? `${data.count} RECORDS` : 'RESPONSE'} / SIGNAL DECODED`, tone: 'main', gap: 18 },
        { text: '░'.repeat(Math.max(8, columns - 2)), tone: 'quiet', gap: 16 },
    ];

    let recordNumber = 0;

    data.lines.forEach(line => {
        if (line.type) {
            recordNumber++;

            const prefix = `› ${String(recordNumber).padStart(2, '0')}  ${line.type.padEnd(6)} `;
            const answer = `${line.name}  ⇢  ${line.value}  ⟨${line.ttl}⟩`;

            wrap(`${prefix}${answer}`, columns).forEach((text, index) => {
                lines.push({ text, tone: index ? 'dim' : 'main', gap: index ? 0 : 4 });
            });
        } else if (line.text.trim()) {
            wrap(`    ${line.text.trim().replace(/\s+/g, ' ')}`, columns).forEach(text => {
                lines.push({ text, tone: 'dim', gap: 0 });
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
    let frameId = null;
    let startedAt = 0;
    let lastFrameAt = 0;
    let isComplete = false;

    function font(size) {
        return `600 ${size}px ${fontFamily}`;
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
        characters.forEach(character => paint(settledContext, character, character.value, character.colour));
        showSettled();
        isComplete = true;
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

        width = nextWidth;
        scale = Math.min(window.devicePixelRatio || 1, 1.5);
        context.font = font(15);

        const cellWidth = context.measureText('M').width;
        const columns = Math.max(22, Math.floor((width - padding * 2) / cellWidth));
        const lines = signalLines(data, columns);
        const bodyLines = Math.max(1, lines.length - 3);
        const lineDelay = Math.min(95, 1250 / bodyLines);
        let y = padding;

        characters = [];

        lines.forEach((line, lineIndex) => {
            const size = line.size || 15;
            const spacing = size === 27 ? cellWidth * 1.8 : cellWidth;

            Array.from(line.text).forEach((value, columnIndex) => {
                if (value === ' ') {
                    return;
                }

                characters.push({
                    value,
                    x: padding + columnIndex * spacing,
                    y,
                    size,
                    colour: ink[line.tone],
                    settleAt: 120 + lineIndex * lineDelay + columnIndex * 7 + Math.random() * 210,
                    settled: false,
                });
            });

            y += size === 27 ? 47 : 26;
            y += line.gap;
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
        startedAt = 0;
        lastFrameAt = 0;
        isComplete = false;

        if (previousComplete || reducedMotion.matches) {
            paintAll();
        } else {
            frameId = window.requestAnimationFrame(frame);
        }

        root.removeAttribute('data-matrix-booting');
    }

    function frame(time) {
        if (! section.isConnected) {
            return;
        }

        if (! startedAt) {
            startedAt = time;
        }

        if (time - lastFrameAt < 28) {
            frameId = window.requestAnimationFrame(frame);
            return;
        }

        lastFrameAt = time;
        const elapsed = time - startedAt;
        let active = false;

        characters.forEach(character => {
            if (character.settled) {
                return;
            }

            if (elapsed >= character.settleAt) {
                character.settled = true;
                paint(settledContext, character, character.value, character.colour);
                return;
            }

            active = true;

        });

        showSettled();

        characters.forEach(character => {
            if (character.settled) {
                return;
            }

            const remaining = character.settleAt - elapsed;

            if (remaining > 460) {
                return;
            }

            const progress = 1 - remaining / 460;
            const falling = { ...character, y: character.y - (1 - progress) * 110 };

            paint(context, falling, glyph(), '#e3ffea', true);
            paint(context, { ...falling, y: falling.y - 23 }, glyph(), '#69ca82');
            paint(context, { ...falling, y: falling.y - 46 }, glyph(), '#367447');
        });

        if (active) {
            frameId = window.requestAnimationFrame(frame);
        } else {
            paintAll();
            frameId = null;
        }
    }

    function glitch() {
        if (! section.isConnected) {
            return;
        }

        const box = section.getBoundingClientRect();
        const isVisible = box.bottom > 0 && box.top < window.innerHeight;

        if (isComplete && isVisible && ! document.hidden && ! reducedMotion.matches) {
            showSettled();

            for (let index = 0; index < 12; index++) {
                const character = characters[Math.floor(Math.random() * characters.length)];

                if (character) {
                    paint(context, character, glyph(), '#f0fff2', true);
                }
            }

            window.setTimeout(showSettled, 90);
        }

        window.setTimeout(glitch, 4000 + Math.random() * 3500);
    }

    document.fonts.ready.then(layout).catch(() => {
        section.setAttribute('data-failed', '');
        root.removeAttribute('data-matrix-booting');
    });
    new ResizeObserver(layout).observe(section);
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
