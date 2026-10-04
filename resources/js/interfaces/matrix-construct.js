const root = document.documentElement;
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const glyphs = Array.from('ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ01345789');

function glyph() {
    return glyphs[Math.floor(Math.random() * glyphs.length)];
}

export function construct(element, order = 0) {
    if (root.dataset.interface !== 'matrix' || motionPreference.matches) {
        return;
    }

    element.classList.add('matrix-materializing');

    const curtain = document.createElement('div');
    const columns = Math.min(48, Math.ceil(element.getBoundingClientRect().width / 22));
    const rows = Math.min(20, Math.ceil(element.getBoundingClientRect().height / 15) + 5);

    curtain.className = 'matrix-code-curtain';
    curtain.setAttribute('aria-hidden', 'true');

    for (let index = 0; index < columns; index++) {
        const column = document.createElement('span');

        column.textContent = Array.from({ length: rows }, glyph).join('\n');
        column.style.left = `${index / columns * 100}%`;
        column.style.animationDelay = `${order * 160 + index * 18}ms`;
        curtain.append(column);
    }

    element.append(curtain);

    window.setTimeout(() => element.classList.add('is-built'), 300 + order * 260);
    window.setTimeout(() => curtain.remove(), 1500 + order * 260);
}

function scramble(element) {
    if (motionPreference.matches) {
        return;
    }

    const finalText = element.textContent;
    let frame = 0;

    element.setAttribute('aria-label', finalText);

    const timer = window.setInterval(() => {
        const settled = Math.floor(frame / 2);

        element.textContent = Array.from(finalText, (character, index) => {
            if (character === ' ' || index < settled) {
                return character;
            }

            return glyph();
        }).join('');

        frame++;

        if (settled >= finalText.length) {
            element.textContent = finalText;
            window.clearInterval(timer);
        }
    }, 45);
}

if (root.dataset.interface === 'matrix') {
    root.classList.add('matrix-constructing');

    document.querySelectorAll('[data-matrix-construct]').forEach((element, index) => construct(element, index));

    const heading = document.querySelector('[data-matrix-scramble]');

    if (heading) {
        scramble(heading);

        window.setInterval(() => {
            if (motionPreference.matches || document.hidden) {
                return;
            }

            const finalText = heading.getAttribute('aria-label') || heading.textContent;
            const letters = Array.from(finalText);
            const positions = letters.map((letter, index) => letter === ' ' ? -1 : index).filter(index => index !== -1);

            for (let count = 0; count < 2; count++) {
                letters[positions[Math.floor(Math.random() * positions.length)]] = glyph();
            }

            heading.textContent = letters.join('');
            window.setTimeout(() => heading.textContent = finalText, 110);
        }, 4700);
    }
}
