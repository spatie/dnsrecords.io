import { glyph } from './matrix-construct.js';

const form = document.querySelector('.matrix-query');

if (form) {
    const input = form.querySelector('#url');
    const shell = form.querySelector('.matrix-query__input');
    const canvas = shell.querySelector('.matrix-query__ascii');
    const context = canvas.getContext('2d');
    const button = form.querySelector('button');
    const buttonLabel = button.querySelector('[data-matrix-button-label]');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (! context) {
        shell.classList.add('matrix-query__input--fallback');
    } else {
        const fontFamily = '"JetBrains Mono", monospace';
        const bootAt = performance.now();
        let width = 0;
        let height = 0;
        let cellWidth = 12;
        let borderCellWidth = 8;
        let states = [];
        let frameId = null;
        let cursorVisible = true;
        let pulseUntil = 0;

        function sync() {
            const value = input.value || input.placeholder;
            const placeholder = input.value === '';
            const now = performance.now();

            states = Array.from(value, (character, index) => {
                const previous = states[index];

                if (previous?.value === character && previous.placeholder === placeholder) {
                    return previous;
                }

                return { value: character, placeholder, startedAt: now + index * 23 };
            });

            schedule();
        }

        function resize() {
            const nextWidth = Math.max(1, shell.clientWidth);
            const nextHeight = Math.max(1, shell.clientHeight);

            if (nextWidth === width && nextHeight === height) {
                return;
            }

            const scale = Math.min(window.devicePixelRatio || 1, 1.5);

            width = nextWidth;
            height = nextHeight;
            canvas.width = Math.ceil(width * scale);
            canvas.height = Math.ceil(height * scale);
            context.setTransform(scale, 0, 0, scale, 0, 0);
            context.textBaseline = 'top';
            context.font = `500 20px ${fontFamily}`;
            cellWidth = context.measureText('M').width;
            context.font = `400 12px ${fontFamily}`;
            borderCellWidth = context.measureText('M').width;
            schedule();
        }

        function print(value, x, y, colour, size = 20, glow = false) {
            context.font = `${size === 20 ? 500 : 400} ${size}px ${fontFamily}`;
            context.fillStyle = colour;
            context.shadowBlur = glow ? 13 : 0;
            context.shadowColor = glow ? '#72ff94' : 'transparent';
            context.fillText(value, x, y);
            context.shadowBlur = 0;
        }

        function draw(time) {
            context.clearRect(0, 0, width, height);

            const edgeLength = Math.max(12, Math.floor(width / borderCellWidth));
            const edge = `+${'-'.repeat(edgeLength - 2)}+`;
            const reveal = reducedMotion.matches ? edge.length : Math.floor((time - bootAt) / 12);
            const pulse = time < pulseUntil;
            const border = Array.from(edge, (character, index) => {
                if (index > reveal || pulse && Math.random() < .12) {
                    return glyph();
                }

                return character;
            }).join('');

            print(border, 0, 1, '#58ac70', 12);
            print(border, 0, height - 16, '#74d38b', 12);
            print('|', 0, height / 2 - 10, '#8aff9f', 12);
            print('|', width - borderCellWidth, height / 2 - 10, '#8aff9f', 12);

            const left = 18 + cellWidth * 2;
            const baseline = (height - 20) / 2;
            const maxCharacters = Math.max(1, Math.floor((width - left - 18) / cellWidth) - 2);
            const caret = input.value ? input.selectionStart ?? input.value.length : 0;
            const first = input.value ? Math.max(0, caret - maxCharacters + 1) : 0;
            const selectionStart = input.selectionStart ?? 0;
            const selectionEnd = input.selectionEnd ?? selectionStart;
            let animating = ! reducedMotion.matches && (reveal < edge.length || pulse);

            print('>', 18, baseline, '#a7ffb9', 20, true);

            states.slice(first, first + maxCharacters).forEach((state, offset) => {
                const index = first + offset;
                const x = left + (input.value ? offset : offset + 1) * cellWidth;
                const progress = reducedMotion.matches ? 1 : Math.min(1, Math.max(0, (time - state.startedAt) / 430));

                if (progress < 1) {
                    animating = true;
                    const y = baseline - (1 - progress) * 32;

                    print(glyph(), x, y - 18, '#356b48', 20);
                    print(glyph(), x, y, '#c6ffd1', 20, true);

                    if (progress > .5) {
                        print(glyph(), x, baseline, '#7ad992', 20);
                    }
                } else {
                    const selected = input.value && index >= selectionStart && index < selectionEnd;
                    const colour = state.placeholder ? '#527b5d' : selected ? '#fff' : '#d9ffe2';

                    print(state.value, x, baseline, colour, 20, selected);
                }
            });

            if ((document.activeElement === input || ! input.value) && (cursorVisible || reducedMotion.matches)) {
                const x = left + Math.min(maxCharacters, Math.max(0, caret - first)) * cellWidth;

                print('_', x, baseline, '#eaffee', 20, true);
            }

            return animating;
        }

        function tick(time) {
            frameId = null;

            if (draw(time)) {
                schedule();
            }
        }

        function schedule() {
            if (frameId === null && ! document.hidden) {
                frameId = window.requestAnimationFrame(tick);
            }
        }

        ['input', 'focus', 'blur', 'click', 'keyup', 'select'].forEach(type => input.addEventListener(type, sync));
        document.addEventListener('selectionchange', () => {
            if (document.activeElement === input) {
                schedule();
            }
        });
        document.addEventListener('visibilitychange', schedule);
        form.addEventListener('submit', () => {
            pulseUntil = performance.now() + 900;
            schedule();
        });
        reducedMotion.addEventListener('change', schedule);

        window.setInterval(() => {
            if (document.hidden || reducedMotion.matches) {
                return;
            }

            cursorVisible = ! cursorVisible;
            schedule();
        }, 520);

        window.setInterval(() => {
            if (document.hidden || reducedMotion.matches) {
                return;
            }

            pulseUntil = performance.now() + 180;
            schedule();
        }, 3900);

        document.fonts.ready.then(() => {
            resize();
            sync();
            new ResizeObserver(resize).observe(shell);
        }).catch(() => {
            shell.classList.add('matrix-query__input--fallback');
        });
    }

    let scrambleTimer = null;

    function buttonGlyph() {
        const buttonGlyphs = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄ01345789';

        return buttonGlyphs[Math.floor(Math.random() * buttonGlyphs.length)];
    }

    function scrambleButton() {
        if (reducedMotion.matches || scrambleTimer !== null) {
            return;
        }

        let frame = 0;

        scrambleTimer = window.setInterval(() => {
            buttonLabel.textContent = Array.from('DECODE', (letter, index) => index < frame ? letter : buttonGlyph()).join('');
            frame++;

            if (frame > 7) {
                buttonLabel.textContent = 'DECODE';
                window.clearInterval(scrambleTimer);
                scrambleTimer = null;
            }
        }, 45);
    }

    button.addEventListener('pointerenter', scrambleButton);
    button.addEventListener('focus', scrambleButton);
}
