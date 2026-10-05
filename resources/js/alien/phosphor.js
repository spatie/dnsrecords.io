/*
 * The light Mother makes while she writes, as seen in the film: rows of
 * garbage that keep changing and drifting, thin rules, small hot blocks,
 * thick bars of light with a white core and round hot spots, and the beam
 * that sweeps across a line before it is typed on.
 *
 * Everything is drawn on one canvas over the text on every display frame,
 * timed in seconds, so it moves smoothly at 60 or 120 frames per second.
 * Light is added with the 'lighter' blend from small pre-rendered sprites,
 * so there are no blurs or shadows to compute. The canvas is cleared and
 * hidden as soon as nothing happens.
 */
const garbageTokens = ['SYS', 'SYS 0', 'AAAAA', '99999', 'GGGbbbIIII', 'TUUUUUIIIIII', 'DDDDD', 'KKKK', 'ZZZZ', 'NNØ', 'HR', 'FL12', 'RM7', 'DZT', 'ALERT N1', 'VVPPPPPPP', 'IIIIIIIII', 'N 3 EEEE', '0018', 'W L8', 'GGGTP', '666', 'R18L', 'W55', 'H G/2', '00000005', 'ZW S18'];

function random(min, max) {
    return min + Math.random() * (max - min);
}

function pick(items) {
    return items[Math.floor(Math.random() * items.length)];
}

function garbageToken() {
    if (Math.random() < .35) {
        return String(Math.floor(random(0, 99999))).padStart(Math.floor(random(1, 6)), '0');
    }

    return pick(garbageTokens);
}

function sprite(width, height, paint) {
    const canvas = document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;
    paint(canvas.getContext('2d'), width, height);

    return canvas;
}

/**
 * A bar of light: a white cyan core in a wide green bloom, tapering at both
 * ends.
 */
const barSprite = sprite(256, 64, (context, width, height) => {
    const profile = context.createLinearGradient(0, 0, 0, height);

    profile.addColorStop(0, 'rgba(0, 120, 40, 0)');
    profile.addColorStop(.22, 'rgba(10, 200, 70, .22)');
    profile.addColorStop(.4, 'rgba(70, 255, 130, .7)');
    profile.addColorStop(.47, 'rgba(225, 255, 240, 1)');
    profile.addColorStop(.53, 'rgba(225, 255, 240, 1)');
    profile.addColorStop(.6, 'rgba(70, 255, 130, .7)');
    profile.addColorStop(.78, 'rgba(10, 200, 70, .22)');
    profile.addColorStop(1, 'rgba(0, 120, 40, 0)');
    context.fillStyle = profile;
    context.fillRect(0, 0, width, height);

    const taper = context.createLinearGradient(0, 0, width, 0);

    taper.addColorStop(0, 'rgba(0, 0, 0, 0)');
    taper.addColorStop(.06, 'rgba(0, 0, 0, 1)');
    taper.addColorStop(.94, 'rgba(0, 0, 0, 1)');
    taper.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.globalCompositeOperation = 'destination-in';
    context.fillStyle = taper;
    context.fillRect(0, 0, width, height);
});

/**
 * A round hot spot: a white centre in an oval green bloom.
 */
const spotSprite = sprite(128, 128, (context, width, height) => {
    const glow = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2);

    glow.addColorStop(0, 'rgba(240, 255, 245, 1)');
    glow.addColorStop(.18, 'rgba(170, 255, 200, .9)');
    glow.addColorStop(.45, 'rgba(30, 220, 90, .35)');
    glow.addColorStop(1, 'rgba(0, 160, 50, 0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
});

export function createPhosphor(canvas, screen) {
    const context = canvas.getContext('2d');
    const effects = new Set();

    let ratio = 1;
    let frame = null;

    function resize() {
        ratio = Math.min(1.5, window.devicePixelRatio || 1);
        canvas.width = Math.max(1, Math.round(screen.clientWidth * ratio));
        canvas.height = Math.max(1, Math.round(screen.clientHeight * ratio));
    }

    function fontSizeOf(element) {
        return parseFloat(getComputedStyle(element).fontSize) || 16;
    }

    function clear() {
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.globalCompositeOperation = 'source-over';
        context.globalAlpha = 1;
        context.clearRect(0, 0, canvas.width, canvas.height);
    }

    function bar(x, y, width, thickness, alpha = 1) {
        if (width <= 0 || alpha <= 0) {
            return;
        }

        context.globalCompositeOperation = 'lighter';
        context.globalAlpha = Math.min(1, alpha);
        context.drawImage(barSprite, x, y - thickness * 1.5, width, thickness * 3);
    }

    function spot(x, y, size, alpha = 1) {
        context.globalCompositeOperation = 'lighter';
        context.globalAlpha = Math.min(1, alpha);
        context.drawImage(spotSprite, x - size * 1.2, y - size / 2, size * 2.4, size);
    }

    function block(x, y, width, height, isWhite) {
        context.globalCompositeOperation = 'source-over';
        context.globalAlpha = 1;
        context.fillStyle = isWhite ? '#f2fff6' : '#8cf5c0';
        context.fillRect(x, y, width, height);
    }

    function rule(x, y, width, isWhite, alpha = .8) {
        context.globalCompositeOperation = 'source-over';
        context.globalAlpha = alpha;
        context.fillStyle = isWhite ? '#e8fff0' : '#70dca8';
        context.fillRect(x, y, width, Math.max(1, 1.5 / ratio * 1.5));
    }

    function tick(now) {
        frame = requestAnimationFrame(tick);
        clear();
        context.setTransform(ratio, 0, 0, ratio, 0, 0);

        effects.forEach(effect => {
            const elapsed = Math.max(0, (now - effect.startedAt) / 1000);

            if (effect.draw(elapsed) === false) {
                effects.delete(effect);
                effect.resolve();
            }
        });

        if (! effects.size) {
            stopDrawing();
        }
    }

    function add(effect) {
        effect.startedAt = performance.now();

        const done = new Promise(resolve => {
            effect.resolve = resolve;
        });

        effects.add(effect);
        canvas.classList.add('is-active');

        if (! frame) {
            frame = requestAnimationFrame(tick);
        }

        return done;
    }

    /**
     * Relative to the screen, in CSS pixels.
     */
    function localRect(element) {
        const rect = element.getBoundingClientRect();
        const screenRect = screen.getBoundingClientRect();

        return { x: rect.left - screenRect.left, y: rect.top - screenRect.top, width: rect.width, height: rect.height };
    }

    /**
     * Garbage over an area: rows of fragments on a rough grid, each row
     * changing at its own moment and the whole block drifting and jolting,
     * sometimes doubled, with rules, blocks and every few tenths of a second
     * a burst of bars and hot spots that fades out. Runs for a fixed
     * duration, or until stop() is called on the returned handle.
     */
    function noise(area, { duration = null, intensity = 1, fontSize = 16 } = {}) {
        const pitch = fontSize * 1.45;
        const rows = Math.max(3, Math.floor(area.height / pitch));
        const columns = [0, .22, .45, .67];
        const font = `${fontSize}px 'Stint Ultra Expanded', serif`;
        const fadeDuration = .12;
        const bursts = [];
        const lines = [];
        const blocks = [];

        let stopAt = duration === null ? Infinity : duration;
        let nextBurstAt = random(.08, .25);
        let jolt = { offset: 0, at: 0 };
        let double = { offset: 0, until: 0 };

        function freshLine(row, elapsed) {
            const isEmpty = Math.random() > .8;

            return {
                row,
                changesAt: elapsed + random(.05, .22),
                fragments: isEmpty ? [] : columns
                    .filter(() => Math.random() < .75)
                    .map(column => ({ x: area.x + area.width * column + random(0, .04) * area.width, text: garbageToken() })),
                rule: ! isEmpty && Math.random() < .35 ? { from: random(0, .6), length: random(.1, .9), isWhite: Math.random() < .2 } : null,
            };
        }

        function freshBlock(elapsed) {
            return {
                x: area.x + random(0, area.width),
                y: area.y + random(0, area.height),
                isWhite: Math.random() < .5,
                until: elapsed + random(.05, .15),
            };
        }

        function update(elapsed) {
            for (let row = 0; row < rows; row++) {
                if (! lines[row] || elapsed >= lines[row].changesAt) {
                    lines[row] = freshLine(row, elapsed);
                }
            }

            const blockCount = Math.round(8 * intensity);

            for (let index = 0; index < blockCount; index++) {
                if (! blocks[index] || elapsed >= blocks[index].until) {
                    blocks[index] = freshBlock(elapsed);
                }
            }

            if (elapsed - jolt.at > random(.12, .3)) {
                jolt = { offset: Math.round(random(-1, 1)) * pitch * .5, at: elapsed };
            }

            if (elapsed > double.until && Math.random() < .02) {
                double = { offset: random(.2, .45) * pitch, until: elapsed + random(.1, .3) };
            }

            if (elapsed >= nextBurstAt && intensity > .2) {
                bursts.push({
                    at: elapsed,
                    life: random(.08, .2),
                    bars: Array.from({ length: Math.round(random(1, 3)) }, () => ({ y: area.y + Math.floor(random(0, rows)) * pitch + pitch * .4, from: random(0, .5), length: random(.25, 1) })),
                    spots: Math.random() < .6 ? Array.from({ length: Math.round(random(2, 4)) }, (_, index) => ({ x: area.x + area.width * (.04 + index * random(.18, .3)), row: Math.floor(random(0, rows)) })) : [],
                });
                nextBurstAt = elapsed + random(.2, .42) / intensity;
            }
        }

        const effect = {
            draw(elapsed) {
                if (elapsed >= stopAt + fadeDuration) {
                    return false;
                }

                const fade = elapsed > stopAt ? 1 - (elapsed - stopAt) / fadeDuration : 1;
                const drift = (elapsed * pitch * .6) % pitch;
                const shift = jolt.offset - drift;

                if (elapsed <= stopAt) {
                    update(elapsed);
                }

                context.save();
                context.beginPath();
                context.rect(area.x, area.y, area.width, area.height);
                context.clip();

                context.font = font;
                context.textBaseline = 'alphabetic';

                if ('letterSpacing' in context) {
                    context.letterSpacing = `${(fontSize * .22).toFixed(1)}px`;
                }

                context.fillStyle = '#70dca8';
                context.strokeStyle = '#70dca8';
                context.lineWidth = fontSize * .045;
                context.globalCompositeOperation = 'source-over';

                const passes = elapsed < double.until ? [[0, .95], [double.offset, .45]] : [[0, .95]];

                passes.forEach(([offset, alpha]) => {
                    context.globalAlpha = alpha * intensity * fade;

                    lines.forEach(line => {
                        const baseline = area.y + line.row * pitch + fontSize + shift + offset;

                        line.fragments.forEach(fragment => {
                            context.fillText(fragment.text, fragment.x, baseline);
                            context.strokeText(fragment.text, fragment.x, baseline);
                        });
                    });
                });

                lines.forEach(line => {
                    if (line.rule) {
                        rule(area.x + area.width * line.rule.from, area.y + line.row * pitch + fontSize * 1.18 + shift, area.width * line.rule.length, line.rule.isWhite, .75 * intensity * fade);
                    }
                });

                if (fade === 1) {
                    blocks.forEach(item => block(item.x, item.y, fontSize * .45, fontSize * .26, item.isWhite));
                }

                for (let index = bursts.length - 1; index >= 0; index--) {
                    const burst = bursts[index];
                    const alpha = Math.max(0, 1 - (elapsed - burst.at) / burst.life) * intensity * fade;

                    if (alpha <= 0) {
                        bursts.splice(index, 1);

                        continue;
                    }

                    burst.bars.forEach(item => bar(area.x + area.width * item.from, item.y + shift, area.width * item.length, fontSize * .32, alpha));
                    burst.spots.forEach(item => spot(item.x, area.y + item.row * pitch + fontSize * .6 + shift, fontSize * 1.3, alpha));
                }

                context.restore();

                return true;
            },
        };

        const done = add(effect);

        return {
            done,
            stop() {
                if (stopAt === Infinity) {
                    stopAt = (performance.now() - effect.startedAt) / 1000;
                }

                return done;
            },
        };
    }

    function easeInOut(progress) {
        return progress < .5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    }

    /**
     * The beam that arms a line: it comes in from the right edge, spans the
     * whole width, then collapses toward the start of the line. About a
     * fifth of a second, as in the film.
     */
    function beam(element) {
        const rect = localRect(element);
        const width = screen.clientWidth;
        const y = rect.y + rect.height * .55;
        const thickness = Math.max(3, rect.height * .16);
        const start = rect.x;
        const duration = .2;

        return add({
            draw(elapsed) {
                const progress = elapsed / duration;

                if (progress >= 1) {
                    return false;
                }

                const opening = easeInOut(Math.min(1, progress / .45));
                const closing = easeInOut(Math.max(0, (progress - .45) / .55));
                const from = width - (width - start) * opening;
                const to = width - (width - start) * .9 * closing;

                bar(from, y, to - from, thickness, 1 - closing * .3);

                return true;
            },
        });
    }

    /**
     * The underline of a line that was just entered flares and settles.
     */
    function flare(element) {
        const rect = localRect(element);
        const fontSize = fontSizeOf(element);
        const y = rect.y + rect.height * .5 + fontSize * .62;
        const duration = .14;

        return add({
            draw(elapsed) {
                if (elapsed >= duration) {
                    return false;
                }

                bar(rect.x - fontSize * .2, y, rect.width + fontSize * .4, fontSize * .12, .9 * (1 - elapsed / duration));

                return true;
            },
        });
    }

    /**
     * Small hot blocks and short rules around where Mother is writing, gone
     * after a tenth of a second.
     */
    function sparks(points, { fontSize = 16 } = {}) {
        const life = random(.06, .14);
        const items = points.map(point => ({
            block: Math.random() < .6 ? { x: point.x + random(-.5, 1.5) * fontSize, y: point.y + random(-.2, .8) * fontSize, isWhite: Math.random() < .5 } : null,
            rule: Math.random() < .15 ? { x: point.x - random(0, 6) * fontSize, y: point.y + fontSize * 1.1, width: random(2, 10) * fontSize, isWhite: Math.random() < .3 } : null,
        }));

        add({
            draw(elapsed) {
                if (elapsed >= life) {
                    return false;
                }

                items.forEach(item => {
                    if (item.block) {
                        block(item.block.x, item.block.y, fontSize * .45, fontSize * .26, item.block.isWhite);
                    }

                    if (item.rule) {
                        rule(item.rule.x, item.rule.y, item.rule.width, item.rule.isWhite, .7 * (1 - elapsed / life));
                    }
                });

                return true;
            },
        });
    }

    /**
     * A rare disturbance on a resting screen: a bar of light along a line of
     * text and maybe a pair of hot spots, fading out within a few frames.
     */
    function glitch(element) {
        const rect = localRect(element);
        const fontSize = fontSizeOf(element);
        const life = random(.1, .2);
        const from = rect.x + rect.width * random(0, .4);
        const length = rect.width * random(.3, .8);
        const hasSpots = Math.random() < .4;

        return add({
            draw(elapsed) {
                if (elapsed >= life) {
                    return false;
                }

                const alpha = 1 - elapsed / life;

                bar(from, rect.y + rect.height * .55, length, fontSize * .3, alpha);

                if (hasSpots) {
                    spot(from + length * .2, rect.y + rect.height * .5, fontSize * 1.3, alpha);
                    spot(from + length * .6, rect.y + rect.height * .5, fontSize * 1.3, alpha);
                }

                return true;
            },
        });
    }

    function stopDrawing() {
        cancelAnimationFrame(frame);
        frame = null;
        clear();
        canvas.classList.remove('is-active');
    }

    function stopAll() {
        effects.forEach(effect => effect.resolve());
        effects.clear();
        stopDrawing();
    }

    function isBusy() {
        return effects.size > 0;
    }

    new ResizeObserver(resize).observe(screen);
    resize();

    return { noise, beam, flare, sparks, glitch, stopAll, localRect, isBusy };
}
