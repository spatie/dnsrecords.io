const form = document.querySelector('.matrix-query');

if (form) {
    const input = form.querySelector('#url');
    const inputShell = form.querySelector('.matrix-query__input');
    const button = form.querySelector('button');
    const buttonLabel = button.querySelector('[data-matrix-button-label]');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const glyphs = Array.from('ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ01345789');

    let scrambleTimer = null;

    function glyph() {
        return glyphs[Math.floor(Math.random() * glyphs.length)];
    }

    function burst(amount) {
        if (reducedMotion.matches) {
            return;
        }

        for (let index = 0; index < amount; index++) {
            const particle = document.createElement('span');

            particle.className = 'matrix-input-glyph';
            particle.textContent = glyph();
            particle.style.left = `${Math.random() * 95}%`;
            particle.style.animationDelay = `${Math.random() * 130}ms`;
            particle.setAttribute('aria-hidden', 'true');
            inputShell.append(particle);
            window.setTimeout(() => particle.remove(), 900);
        }
    }

    function scrambleButton() {
        if (reducedMotion.matches || scrambleTimer !== null) {
            return;
        }

        let frame = 0;

        scrambleTimer = window.setInterval(() => {
            buttonLabel.textContent = Array.from('DECODE', (_, index) => index < frame ? 'DECODE'[index] : glyph()).join('');
            frame++;

            if (frame > 7) {
                buttonLabel.textContent = 'DECODE';
                window.clearInterval(scrambleTimer);
                scrambleTimer = null;
            }
        }, 45);
    }

    input.addEventListener('input', () => burst(4));
    button.addEventListener('pointerenter', scrambleButton);
    button.addEventListener('focus', scrambleButton);
    form.addEventListener('submit', () => burst(22));
}
