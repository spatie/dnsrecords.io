import { degaussWobble } from '../crt/degauss.js';
import { noise } from '../crt/glsl.js';
import { approach, between, exponential, noise1d } from '../crt/random.js';
import { createTextLife } from '../crt/text-fx.js';

/*
 * The glass over Mother's screen. The film's screen is a flat black insert,
 * so there is no curve, no bezel and no reflection, but the tube has the
 * same organic life as the regular terminal, in a smaller dose: flicker and
 * breathing from smooth noise, rolling interference, fine grain, a little
 * dirt, a colour fringe at the edges, lines that jitter or tear, rare
 * bursts of static and now and then a degauss. Every event is timed at
 * random, nothing repeats on a beat, and everything is drawn in the shader
 * or with transforms and opacity, so it runs at the full frame rate.
 */

const vertexShader = `#version 300 es
void main() {
    vec2 position = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);

    gl_Position = vec4(position * 2.0 - 1.0, 0.0, 1.0);
}
`;

const fragmentShader = `#version 300 es
precision highp float;

out vec4 outColor;

uniform vec2 uResolution;
uniform float uScale;
uniform float uTime;
uniform float uSeed;
uniform float uMotion;
uniform float uFlicker;
uniform float uBreath;
uniform float uSurge;
uniform float uDisturb;
uniform vec4 uBand;
uniform vec4 uRoll;
uniform vec3 uGlitch;
uniform float uDirtSeed;
uniform vec2 uSyncRoll;
uniform vec2 uCrawl;
uniform vec3 uDropout;
uniform float uStatic;

${noise}

void main() {
    vec2 pixel = gl_FragCoord.xy;
    vec2 screenUv = pixel / uResolution;
    vec2 centered = screenUv * 2.0 - 1.0;
    vec2 cssPixels = uResolution / uScale;

    vec3 tint = vec3(0.44, 0.86, 0.66);
    vec3 light = vec3(0.0);
    float darkness = 0.0;
    float time = uTime;

    float scan = 0.5 + 0.5 * cos(screenUv.y * cssPixels.y * 6.28318 / 3.0);
    darkness += scan * 0.05;

    float grille = 0.5 + 0.5 * cos(screenUv.x * cssPixels.x * 6.28318 / 3.0);
    darkness += grille * 0.012;

    float grain = hash12(floor(pixel / max(uScale, 0.5)) + fract(uSeed * 31.7) * 400.0);
    light += tint * grain * 0.012 * uMotion;
    darkness += (1.0 - grain) * 0.022 * uMotion;

    vec2 cssPoint = screenUv * cssPixels;
    float smudge = smoothstep(0.55, 0.88, valueFbm(cssPoint / 280.0 + uDirtSeed * 7.0));
    float specks = dust(cssPoint, uDirtSeed * 97.0, 80.0, 0.18) + dust(cssPoint + 31.0, uDirtSeed * 53.0, 170.0, 0.25) * 1.3;
    light += vec3(0.9, 0.95, 0.92) * (smudge * 0.008 + specks * 0.016);
    darkness += smudge * 0.02 + specks * 0.06;
    darkness += (valueFbm(screenUv * vec2(2.0, 1.5) + uDirtSeed * 3.0) - 0.5) * 0.04;

    float haze = fbm(vec3(screenUv * vec2(2.0, 3.0), time * 0.03 + uSeed)) * 0.5 + 0.5;
    float centreGlow = smoothstep(1.25, 0.0, length(centered * vec2(0.85, 1.0)));
    light += vec3(0.0, 0.5, 0.18) * (0.002 + centreGlow * 0.006) + tint * (uFlicker + haze * 0.004);
    darkness += uBreath * (0.6 + 0.4 * haze);

    float rollDistance = screenUv.y - uRoll.x;
    float roll = exp(-rollDistance * rollDistance / (uRoll.y * uRoll.y)) * uRoll.z;
    float rollTexture = 0.65 + 0.35 * snoise(vec3(screenUv.x * 6.0, screenUv.y * 40.0, time * 0.8));
    light += tint * roll * rollTexture * 0.025 * uMotion;

    float bandDistance = screenUv.y - uBand.x;
    float band = exp(-bandDistance * bandDistance / (uBand.y * uBand.y)) * uBand.z;
    float bandLines = smoothstep(0.2, 0.9, snoise(vec3(screenUv.x * 2.0, screenUv.y * 220.0, time * 3.0 + uBand.w)));
    light += tint * band * (0.02 + bandLines * 0.03) * uMotion;
    darkness += band * 0.04 * uMotion;

    float disturbance = uDisturb * uMotion;
    float streaks = smoothstep(0.55, 1.0, snoise(vec3(screenUv.y * 80.0, time * 6.0, uSeed))) * smoothstep(0.3, 1.0, snoise(vec3(screenUv.x * 3.0, screenUv.y * 8.0, time * 2.0)));
    light += tint * streaks * disturbance * 0.05;
    darkness += disturbance * 0.03 * (0.5 + 0.5 * snoise(vec3(screenUv.y * 6.0, time * 1.5, 7.0)));

    float tear = smoothstep(uGlitch.z, 0.0, abs(screenUv.y - uGlitch.y)) * uGlitch.x;
    light += tint * tear * (0.55 + 0.45 * snoise(vec3(screenUv.x * 3.0, uGlitch.y * 20.0, time * 6.0))) * 0.045 * uMotion;

    float syncDistance = screenUv.y - uSyncRoll.x;
    darkness += exp(-syncDistance * syncDistance / 0.003) * uSyncRoll.y * 0.16 * uMotion;

    float crawlDistance = screenUv.y - uCrawl.x;
    float crawl = exp(-crawlDistance * crawlDistance / 0.002) * uCrawl.y;
    float crawlStripes = 0.5 + 0.5 * sin(screenUv.y * cssPixels.y * 0.9 + screenUv.x * 14.0 - time * 11.0);
    light += tint * crawl * crawlStripes * 0.02 * uMotion;
    darkness += crawl * 0.02 * uMotion;

    float dropoutDistance = abs(screenUv.y - uDropout.x);
    float dropout = smoothstep(uDropout.y, uDropout.y * 0.55, dropoutDistance) * uDropout.z * uMotion;
    float dropoutNoise = hash12(floor(pixel / max(uScale * 2.0, 1.0)) + fract(uSeed * 17.3) * 300.0);
    darkness += dropout * 0.25;
    light += tint * dropout * dropoutNoise * 0.035;

    float staticNoise = hash12(floor(pixel / max(uScale * 1.5, 0.75)) + fract(uSeed * 7.1) * 500.0);
    light += tint * staticNoise * uStatic * 0.04 * uMotion;
    darkness += (1.0 - staticNoise) * uStatic * 0.04 * uMotion;

    light += tint * uSurge * (0.7 + 0.3 * fbm(vec3(screenUv * 1.5, time * 0.4)));

    vec2 edgeFringe = max(vec2(-centered.x, centered.x), 0.0);
    light += vec3(edgeFringe.x * edgeFringe.x * 0.012, 0.0, edgeFringe.y * edgeFringe.y * 0.016);

    darkness += smoothstep(0.75, 1.5, length(centered * vec2(0.9, 1.0))) * 0.22;

    outColor = vec4(light, clamp(darkness, 0.0, 0.88));
}
`;

const motherLines = '.mother-ready, .mother-echo, .inquiry__mirror, .exchange:not(.is-writing) .mother-line, .exchange:not(.is-writing) .matrix__title, .exchange:not(.is-writing) .record, .exchange:not(.is-writing) .roots__row';

const motherEchoLines = '.mother-ready, .mother-echo, .exchange:not(.is-writing) .mother-line, .exchange:not(.is-writing) .matrix__title, .exchange:not(.is-writing) .record';

function compile(gl, type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (! gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader));
    }

    return shader;
}

/**
 * @param {HTMLElement} screen
 * @param {HTMLElement} picture
 * @param {{ isQuiet: () => boolean }} options isQuiet tells when nobody types and Mother is not writing, so a degauss is welcome.
 */
export function createMotherGlass(screen, picture, { isQuiet = () => true } = {}) {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });

    if (! gl) {
        return null;
    }

    const program = gl.createProgram();

    try {
        gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertexShader));
        gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragmentShader));
        gl.linkProgram(program);
    } catch (error) {
        return null;
    }

    if (! gl.getProgramParameter(program, gl.LINK_STATUS)) {
        return null;
    }

    const uniforms = {};

    for (let index = 0; index < gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS); index++) {
        const name = gl.getActiveUniform(program, index).name;

        uniforms[name] = gl.getUniformLocation(program, name);
    }

    canvas.className = 'crt-glass';
    canvas.setAttribute('aria-hidden', 'true');
    screen.appendChild(canvas);

    gl.useProgram(program);
    gl.bindVertexArray(gl.createVertexArray());
    gl.clearColor(0, 0, 0, 0);

    const root = document.documentElement;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const slow = noise1d();
    const fast = noise1d();
    const startedAt = performance.now() / 1000;
    const now = () => performance.now() / 1000 - startedAt;
    const textLife = createTextLife(picture, { lines: motherLines, echoLines: motherEchoLines, pace: .55, strength: .7 });
    const surges = [];

    let scale = 1;
    let width = 0;
    let height = 0;
    let frame = null;
    let lastFrameAt = 0;
    let isLost = false;
    let glitchUntil = 0;

    const state = {
        motion: 0,
        disturb: 0,
        disturbTarget: 0,
        dirtSeed: Math.random(),
        band: { y: -1, width: .1, strength: 0, speed: 0, seed: 0 },
        roll: { y: Math.random(), width: .06 },
        glitch: { strength: 0, y: .5, height: .01 },
        syncRoll: { y: -1, strength: 0, speed: 0 },
        crawl: { y: -1, strength: 0, speed: 0 },
        dropout: { y: -1, halfHeight: 0, strength: 0, until: 0 },
        staticBurst: { strength: 0, startedAt: 0, duration: 1 },
        hold: { shift: 0, startedAt: 0, duration: 1 },
    };

    const schedule = {
        band: now() + exponential(12, 4),
        glitch: now() + exponential(40, 14),
        surge: now() + exponential(24, 8),
        flicker: now() + exponential(5, .6),
        syncRoll: now() + exponential(80, 25),
        crawl: now() + exponential(36, 12),
        dropout: now() + exponential(13, 4),
        staticBurst: now() + exponential(110, 40),
        hold: now() + exponential(60, 20),
        degauss: now() + 200 + exponential(200),
    };

    function resize() {
        const cssWidth = screen.clientWidth;
        const cssHeight = screen.clientHeight;

        scale = Math.min(1, Math.sqrt(2000000 / Math.max(1, cssWidth * cssHeight)));
        width = Math.max(1, Math.round(cssWidth * scale));
        height = Math.max(1, Math.round(cssHeight * scale));

        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }
    }

    function addSurge(amplitude, duration) {
        surges.push({ startedAt: now(), amplitude, duration });
    }

    function surgeLevel(time) {
        let level = 0;

        for (let index = surges.length - 1; index >= 0; index--) {
            const surge = surges[index];
            const progress = (time - surge.startedAt) / surge.duration;

            if (progress >= 1) {
                surges.splice(index, 1);

                continue;
            }

            const envelope = progress < .25 ? Math.sin(progress / .25 * Math.PI / 2) : Math.pow(1 - (progress - .25) / .75, 2);

            level += surge.amplitude * envelope;
        }

        return Math.min(level, .06);
    }

    function glitch(strength) {
        state.glitch = { strength, y: Math.random(), height: between(.004, .016) };
        textLife.tear(state.glitch.y, strength);
        glitchUntil = now() + between(.1, .22);
        addSurge(.008 * strength, .3);
    }

    function degauss() {
        addSurge(.035, 1.2);
        state.disturb = .4;
        degaussWobble(screen, { strength: .7 });
    }

    function runEvents(time) {
        if (time > schedule.band && state.band.strength < .05) {
            state.band = { y: -.2, width: between(.03, .14), strength: between(.3, .8), speed: between(.05, .25), seed: Math.random() * 100 };
            schedule.band = time + exponential(16, 5);
        }

        if (time > schedule.surge) {
            addSurge(between(.008, .02), between(.35, .7));
            schedule.surge = time + exponential(26, 8);
        }

        if (time > schedule.flicker) {
            addSurge(between(.004, .01), between(.12, .25));
            schedule.flicker = time + exponential(5, .6);
        }

        if (time > schedule.glitch) {
            glitch(between(.4, .8));
            schedule.glitch = time + exponential(44, 14);
        }

        if (time > schedule.syncRoll) {
            state.syncRoll = { y: -.15, strength: between(.4, .8), speed: between(1.2, 1.8) };
            schedule.syncRoll = time + exponential(80, 25);
        }

        if (time > schedule.crawl && state.crawl.strength === 0) {
            state.crawl = { y: 1.15, strength: between(.3, .8), speed: between(.05, .12) };
            schedule.crawl = time + exponential(40, 12);
        }

        if (time > schedule.dropout) {
            const line = textLife.dropout(between(50, 100));

            if (line) {
                state.dropout = { ...line, strength: 1, until: time + between(.04, .08) };
            }

            schedule.dropout = time + exponential(13, 4);
        }

        if (time > schedule.staticBurst) {
            state.staticBurst = { strength: between(.4, .8), startedAt: time, duration: between(.12, .2) };
            schedule.staticBurst = time + exponential(110, 40);
        }

        if (time > schedule.hold) {
            state.hold = { shift: (Math.random() < .5 ? -1 : 1) * Math.round(between(2, 5)), startedAt: time, duration: between(.14, .24) };
            schedule.hold = time + exponential(60, 20);
        }

        if (time > schedule.degauss) {
            if (! isQuiet()) {
                schedule.degauss = time + between(5, 15);

                return;
            }

            degauss();
            schedule.degauss = time + 200 + exponential(200);
        }
    }

    function moveEvents(time, delta) {
        state.roll.y += (.015 + .02 * (slow(time * .05) + 1)) * delta;

        if (state.roll.y > 1.25) {
            state.roll = { y: -.25, width: between(.04, .1) };
        }

        if (state.band.strength > 0) {
            state.band.y += state.band.speed * delta;

            if (state.band.y > 1.3) {
                state.band.strength = 0;
            }
        }

        if (state.syncRoll.strength > 0) {
            state.syncRoll.y += state.syncRoll.speed * delta;

            if (state.syncRoll.y > 1.2) {
                state.syncRoll.strength = 0;
            }
        }

        if (state.crawl.strength > 0) {
            state.crawl.y -= state.crawl.speed * delta;

            if (state.crawl.y < -.15) {
                state.crawl.strength = 0;
            }
        }

        if (time > state.dropout.until) {
            state.dropout.strength = 0;
        }

        if (time > glitchUntil) {
            state.glitch.strength = state.glitch.strength < .01 ? 0 : approach(state.glitch.strength, 0, 18, delta);
        }
    }

    function staticLevel(time) {
        const progress = (time - state.staticBurst.startedAt) / state.staticBurst.duration;

        if (progress < 0 || progress >= 1) {
            return 0;
        }

        return state.staticBurst.strength * (1 - progress);
    }

    /**
     * A slip of the horizontal hold: the picture jumps a few pixels up or
     * down and settles back.
     */
    function holdOffset(time) {
        const progress = (time - state.hold.startedAt) / state.hold.duration;

        if (progress < 0 || progress >= 1) {
            return 0;
        }

        return Math.round(state.hold.shift * Math.pow(1 - progress, 2));
    }

    function updatePicture(time) {
        const isGlitching = time < glitchUntil;
        const hold = holdOffset(time);

        if (! isGlitching && state.disturb < .02 && hold === 0) {
            if (picture.style.transform) {
                picture.style.transform = '';
            }

            return;
        }

        const shift = (isGlitching ? Math.round((Math.random() - .5) * 4 * state.glitch.strength) : 0) + Math.round(fast(time * 25) * 2 * state.disturb);

        picture.style.transform = `translate3d(${shift}px, ${hold}px, 0)`;
    }

    function render(time, delta) {
        const animated = ! reducedMotion.matches;

        state.motion = approach(state.motion, animated ? 1 : 0, 2.5, delta);
        state.disturb = approach(state.disturb, state.disturbTarget, state.disturbTarget > state.disturb ? 6 : 1.6, delta);

        if (animated) {
            runEvents(time);
        }

        moveEvents(time, delta);

        const flicker = (.003 + .003 * slow(time * .9 + 11) + .002 * fast(time * 7.3)) * state.motion;
        const breath = (.014 + .01 * slow(time * .07) + .007 * slow(time * .021 + 40)) * state.motion;
        const surge = surgeLevel(time) * state.motion;

        gl.viewport(0, 0, width, height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(uniforms.uResolution, width, height);
        gl.uniform1f(uniforms.uScale, scale);
        gl.uniform1f(uniforms.uTime, animated ? time : 0);
        gl.uniform1f(uniforms.uSeed, animated ? Math.random() : .5);
        gl.uniform1f(uniforms.uMotion, state.motion);
        gl.uniform1f(uniforms.uFlicker, Math.max(0, flicker));
        gl.uniform1f(uniforms.uBreath, Math.max(0, breath));
        gl.uniform1f(uniforms.uSurge, surge);
        gl.uniform1f(uniforms.uDisturb, state.disturb);
        gl.uniform4f(uniforms.uBand, 1 - state.band.y, state.band.width, state.band.strength, state.band.seed);
        gl.uniform4f(uniforms.uRoll, 1 - state.roll.y, state.roll.width, .3 + .25 * slow(time * .11 + 3), 0);
        gl.uniform3f(uniforms.uGlitch, state.glitch.strength, 1 - state.glitch.y, state.glitch.height);
        gl.uniform1f(uniforms.uDirtSeed, state.dirtSeed);
        gl.uniform2f(uniforms.uSyncRoll, 1 - state.syncRoll.y, state.syncRoll.strength);
        gl.uniform2f(uniforms.uCrawl, 1 - state.crawl.y, state.crawl.strength);
        gl.uniform3f(uniforms.uDropout, 1 - state.dropout.y, state.dropout.halfHeight, state.dropout.strength);
        gl.uniform1f(uniforms.uStatic, staticLevel(time));
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        if (animated) {
            updatePicture(time);
        } else if (picture.style.transform) {
            picture.style.transform = '';
        }

        textLife.frame(time, { flicker: Math.max(0, flicker), breath: Math.max(0, breath), surge, disturb: state.disturb, motion: state.motion });

        return animated || state.motion > .002 || state.disturb > .002;
    }

    function tick(timestamp) {
        frame = null;

        if (isLost || document.hidden) {
            return;
        }

        const time = timestamp / 1000 - startedAt;
        const delta = lastFrameAt ? Math.min(.1, time - lastFrameAt) : 1 / 60;

        lastFrameAt = time;

        if (render(time, delta)) {
            frame = requestAnimationFrame(tick);

            return;
        }

        lastFrameAt = 0;
    }

    function wake() {
        if (! frame && ! isLost && ! document.hidden) {
            frame = requestAnimationFrame(tick);
        }
    }

    document.addEventListener('visibilitychange', () => {
        cancelAnimationFrame(frame);
        frame = null;
        lastFrameAt = 0;
        wake();
    });

    new ResizeObserver(() => {
        resize();
        wake();
    }).observe(screen);

    reducedMotion.addEventListener('change', () => {
        if (reducedMotion.matches) {
            textLife.reset();
        }

        wake();
    });

    document.addEventListener('mother', event => {
        const { type } = event.detail || {};

        if (type === 'processing-start') {
            state.disturbTarget = .6;
        }

        if (type === 'processing-end') {
            state.disturbTarget = 0;

            if (! reducedMotion.matches) {
                addSurge(.02, .5);
            }
        }

        wake();
    });

    canvas.addEventListener('webglcontextlost', event => {
        event.preventDefault();
        isLost = true;
        root.removeAttribute('data-crt');
    });

    resize();
    wake();

    requestAnimationFrame(() => root.setAttribute('data-crt', 'gl'));

    return { canvas };
}
