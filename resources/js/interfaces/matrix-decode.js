const root = document.documentElement;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const glyphs = Array.from('ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ01345789');

function glyph() {
    return glyphs[Math.floor(Math.random() * glyphs.length)];
}

function cipher(text, settled) {
    return Array.from(text, (character, index) => character === ' ' || character === '\n' || index < settled ? character : glyph()).join('');
}

function cascade(record) {
    const rain = document.createElement('span');

    rain.className = 'matrix-record__cascade';
    rain.setAttribute('aria-hidden', 'true');

    for (let index = 0; index < 9; index++) {
        const column = document.createElement('span');

        column.textContent = Array.from({ length: 7 }, glyph).join('\n');
        column.style.left = `${(index + .5) / 9 * 100}%`;
        column.style.animationDelay = `${index * 43}ms`;
        rain.append(column);
    }

    record.append(rain);
    window.setTimeout(() => rain.remove(), 1100);
}

function decorateCell(cell) {
    const text = cell.textContent;
    const final = document.createElement('span');
    const code = document.createElement('span');

    final.className = 'matrix-cell__final';
    final.textContent = text;
    code.className = 'matrix-cell__cipher';
    code.setAttribute('aria-hidden', 'true');
    code.textContent = cipher(text, 0);
    cell.replaceChildren(final, code);

    return { cell, code, text, done: false };
}

export function decodeEntry(entry) {
    if (root.dataset.interface !== 'matrix' || reducedMotion.matches) {
        root.removeAttribute('data-matrix-booting');
        return;
    }

    const records = Array.from(entry.querySelectorAll('.record'));
    const cells = records.map(record => Array.from(record.children)
        .filter(child => child.matches('.record__type, .record__name, .record__ttl, .record__value'))
        .map(decorateCell));
    const heading = entry.querySelector('.result__heading');
    const columnHead = entry.querySelector('.record-head');
    const step = Math.min(105, 1500 / Math.max(1, records.length));
    const duration = 760;
    let previousFrame = 0;
    let startedAt = 0;

    entry.classList.add('matrix-entry--decoding');
    records.forEach(record => record.classList.add('matrix-record--queued'));
    heading?.classList.add('matrix-heading--decoding');
    columnHead?.classList.add('matrix-heading--decoding');
    root.removeAttribute('data-matrix-booting');

    function frame(time) {
        if (! entry.isConnected) {
            return;
        }

        if (! startedAt) {
            startedAt = time;
        }

        if (time - previousFrame < 32) {
            window.requestAnimationFrame(frame);
            return;
        }

        previousFrame = time;
        const elapsed = time - startedAt;

        if (elapsed > 80) {
            heading?.classList.remove('matrix-heading--decoding');
        }

        if (elapsed > 240) {
            columnHead?.classList.remove('matrix-heading--decoding');
        }

        records.forEach((record, rowIndex) => {
            const rowStart = 300 + rowIndex * step;

            if (elapsed < rowStart) {
                return;
            }

            if (record.classList.contains('matrix-record--queued')) {
                record.classList.remove('matrix-record--queued');
                record.classList.add('matrix-record--assembling');
                cascade(record);
            }

            cells[rowIndex].forEach(({ cell, code, text, done }, columnIndex) => {
                if (done) {
                    return;
                }

                const progress = Math.max(0, Math.min(1, (elapsed - rowStart - columnIndex * 75) / duration));

                if (progress >= 1) {
                    cell.classList.add('matrix-cell--decoded');
                    code.remove();
                    cells[rowIndex][columnIndex].done = true;
                    return;
                }

                code.textContent = cipher(text, Math.floor(text.length * progress * progress));
            });

            if (cells[rowIndex].every(cell => cell.done)) {
                record.classList.remove('matrix-record--assembling');
                record.classList.add('matrix-record--assembled');
            }
        });

        if (records.some(record => ! record.classList.contains('matrix-record--assembled'))) {
            window.requestAnimationFrame(frame);
        } else {
            entry.classList.remove('matrix-entry--decoding');
            entry.classList.add('matrix-entry--decoded');
        }
    }

    if (records.length) {
        window.requestAnimationFrame(frame);
    } else {
        root.removeAttribute('data-matrix-booting');
        heading?.classList.remove('matrix-heading--decoding');
        columnHead?.classList.remove('matrix-heading--decoding');
        entry.classList.remove('matrix-entry--decoding');
    }
}

if (root.dataset.interface === 'matrix') {
    window.setInterval(() => {
        if (document.hidden || reducedMotion.matches) {
            return;
        }

        const visible = Array.from(document.querySelectorAll('.matrix-record--assembled'))
            .filter(record => {
                const box = record.getBoundingClientRect();
                return box.bottom > 0 && box.top < window.innerHeight;
            });
        const record = visible[Math.floor(Math.random() * visible.length)];

        if (record) {
            record.classList.add('matrix-record--glitch');
            window.setTimeout(() => record.classList.remove('matrix-record--glitch'), 520);
        }
    }, 4300);
}
