const canvas = document.getElementById('matrix-rain');

if (canvas) {
    const context = canvas.getContext('2d', { alpha: false });
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const glyphs = Array.from('ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ012345789');
    const spacing = 17;
    const columns = [];

    let frameId = null;
    let lastFrame = 0;
    let pointerX = -1000;
    let pointerY = -1000;
    let width = 0;
    let height = 0;

    function glyph() {
        return glyphs[Math.floor(Math.random() * glyphs.length)];
    }

    function drawGlyph(x, y, head = false) {
        const distance = Math.hypot(x - pointerX, y - pointerY);
        const nearPointer = distance < 120;

        context.fillStyle = head ? '#f0fff3' : nearPointer ? '#c5ffd0' : '#52e474';
        context.shadowBlur = head || nearPointer ? 13 : 3;
        context.shadowColor = '#54ff81';
        context.fillText(glyph(), x, y);
        context.shadowBlur = 0;
    }

    function resize() {
        const scale = Math.min(window.devicePixelRatio || 1, 1.5);

        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.ceil(width * scale);
        canvas.height = Math.ceil(height * scale);
        context.setTransform(scale, 0, 0, scale, 0, 0);
        context.font = '16px monospace';
        context.textBaseline = 'top';
        context.fillStyle = '#020804';
        context.fillRect(0, 0, width, height);

        columns.length = 0;

        for (let x = 0; x < width; x += spacing) {
            const head = Math.floor(Math.random() * (height / spacing));

            columns.push({ x, head, speed: 1 + Math.floor(Math.random() * 2), phase: Math.floor(Math.random() * 2) });

            for (let step = 18; step >= 0; step--) {
                const y = (head - step) * spacing;

                if (y >= 0 && y < height) {
                    context.globalAlpha = .12 + (18 - step) / 22;
                    drawGlyph(x, y, step === 0);
                }
            }
        }

        context.globalAlpha = 1;
    }

    function frame(time) {
        frameId = window.requestAnimationFrame(frame);

        const decoding = document.documentElement.classList.contains('is-decoding');

        if (time - lastFrame < (decoding ? 22 : 38)) {
            return;
        }

        lastFrame = time;
        context.fillStyle = decoding ? 'rgba(2, 8, 4, .05)' : 'rgba(2, 8, 4, .075)';
        context.fillRect(0, 0, width, height);

        columns.forEach(column => {
            column.phase++;

            if (column.phase % column.speed !== 0) {
                return;
            }

            const y = column.head * spacing;

            if (y >= 0 && y < height) {
                context.globalAlpha = .9;
                drawGlyph(column.x, y, true);
            }

            column.head++;

            if (column.head * spacing > height + 260) {
                column.head = -Math.floor(Math.random() * 15);
            }
        });

        context.globalAlpha = 1;
    }

    function updateMotion() {
        if (frameId !== null) {
            window.cancelAnimationFrame(frameId);
            frameId = null;
        }

        if (! motionPreference.matches && ! document.hidden) {
            frameId = window.requestAnimationFrame(frame);
        }
    }

    resize();
    updateMotion();

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', event => {
        pointerX = event.clientX;
        pointerY = event.clientY;
    }, { passive: true });
    document.addEventListener('visibilitychange', updateMotion);
    motionPreference.addEventListener('change', updateMotion);
}
