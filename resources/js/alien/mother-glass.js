import { noise } from '../crt/glsl.js';
import { createCurveWatch, initialCurveQuality, tuneCurve } from '../crt/curve-quality.js';
import { createCurvedText } from '../crt/text-fx.js';

/*
 * The glass of Mother's tube, adapted from the CRT glass of the main
 * terminal. Tuned to look like a 1979 monitor filmed on 35mm: a rounder
 * tube, heavier scanlines, a faint aperture grille, a slow hum bar rolling
 * through the picture (the beat between the monitor and the camera), soft
 * halation and very rare glitches. Mother is steady; the room is not.
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
uniform float uCurve;
uniform float uRadius;
uniform float uFlicker;
uniform float uSurge;
uniform float uDisturb;
uniform vec2 uHum;
uniform vec3 uGlitch;
uniform float uDirtSeed;
uniform vec2 uSyncRoll;

${noise}

float roundedBox(vec2 point, vec2 halfSize, float radius) {
    vec2 d = abs(point) - halfSize + radius;

    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - radius;
}

vec2 barrel(vec2 centered, float amount) {
    return centered * (1.0 + amount * dot(centered, centered));
}

void main() {
    vec2 pixel = gl_FragCoord.xy;
    vec2 uv = pixel / uResolution;
    vec2 centered = uv * 2.0 - 1.0;
    vec2 cssPixels = uResolution / uScale;

    vec2 bent = barrel(centered, uCurve);
    vec2 screenUv = bent * 0.5 + 0.5;

    float edge = roundedBox(bent * cssPixels * 0.5, cssPixels * 0.5, uRadius);
    float mask = smoothstep(0.0, -1.5 * uScale, edge);
    float bezelShadow = 1.0 - smoothstep(0.0, 22.0, -edge);

    vec3 phosphor = vec3(0.58, 1.0, 0.66);
    vec3 light = vec3(0.0);
    float darkness = 0.0;
    float time = uTime;

    float scan = 0.5 + 0.5 * cos(screenUv.y * cssPixels.y * 6.28318 / 3.0);
    darkness += scan * 0.2;

    float grille = 0.5 + 0.5 * cos(screenUv.x * cssPixels.x * 6.28318 / 3.0);
    darkness += grille * 0.035;

    float grain = hash12(floor(pixel / max(uScale, 0.5)) + fract(uSeed * 31.7) * 400.0);
    light += phosphor * grain * 0.026 * uMotion;
    darkness += (1.0 - grain) * 0.026 * uMotion;

    vec2 cssPoint = screenUv * cssPixels;
    float smudge = smoothstep(0.55, 0.88, valueFbm(cssPoint / 280.0 + uDirtSeed * 7.0));
    float specks = dust(cssPoint, uDirtSeed * 97.0, 80.0, 0.18) + dust(cssPoint + 31.0, uDirtSeed * 53.0, 170.0, 0.25) * 1.3;
    light += vec3(0.9, 0.95, 0.92) * (smudge * 0.016 + specks * 0.028);
    darkness += smudge * 0.02 + specks * 0.08;
    darkness += (valueFbm(screenUv * vec2(2.0, 1.5) + uDirtSeed * 3.0) - 0.5) * 0.05;

    float syncDistance = screenUv.y - uSyncRoll.x;
    darkness += exp(-syncDistance * syncDistance / 0.003) * uSyncRoll.y * 0.18 * uMotion;

    float glowField = fbm(vec3(screenUv * vec2(1.6, 2.2), time * 0.02 + 3.0)) * 0.5 + 0.5;
    float centreGlow = smoothstep(1.25, 0.0, length(centered * vec2(0.85, 1.0)));
    light += phosphor * (0.012 + centreGlow * 0.022 + glowField * 0.01 + uFlicker);

    float humDistance = fract(screenUv.y - uHum.x + 1.0) - 0.5;
    float hum = exp(-humDistance * humDistance / 0.012);
    light += phosphor * hum * 0.022 * uHum.y * uMotion;
    darkness += (1.0 - hum) * 0.025 * uHum.y * uMotion;

    float disturbance = uDisturb * uMotion;
    float streaks = smoothstep(0.55, 1.0, snoise(vec3(screenUv.y * 80.0, time * 6.0, uSeed))) * smoothstep(0.3, 1.0, snoise(vec3(screenUv.x * 3.0, screenUv.y * 8.0, time * 2.0)));
    light += phosphor * streaks * disturbance * 0.07;
    darkness += disturbance * 0.05 * (0.5 + 0.5 * snoise(vec3(screenUv.y * 5.0, time * 1.4, 7.0)));

    float tear = smoothstep(uGlitch.z, 0.0, abs(screenUv.y - uGlitch.y)) * uGlitch.x;
    light += phosphor * tear * (0.55 + 0.45 * snoise(vec3(screenUv.x * 3.0, uGlitch.y * 20.0, time * 6.0))) * 0.06 * uMotion;

    light += phosphor * uSurge * (0.7 + 0.3 * fbm(vec3(screenUv * 1.5, time * 0.4)));

    float highlight = smoothstep(0.8, 0.0, length((centered - vec2(-0.5, 0.6)) * vec2(0.8, 1.4)));
    light += vec3(1.0, 0.99, 0.96) * highlight * highlight * 0.035;

    float sheen = smoothstep(0.3, 0.0, abs(bent.y - 0.8 + bent.x * 0.2)) * smoothstep(1.0, 0.2, abs(bent.x + 0.25));
    light += vec3(1.0) * sheen * 0.014;

    darkness += smoothstep(0.6, 1.45, length(centered * vec2(0.9, 1.0))) * 0.34;
    darkness += bezelShadow * 0.5;

    light *= mask;
    darkness = mix(1.0, clamp(darkness, 0.0, 0.88), mask);

    outColor = vec4(light, darkness);
}
`;

function compile(gl, type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (! gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader));
    }

    return shader;
}

function exponential(mean, minimum = 0) {
    return minimum + -Math.log(1 - Math.random()) * mean;
}

function between(min, max) {
    return min + Math.random() * (max - min);
}

function approach(current, target, speed, delta) {
    return current + (target - current) * (1 - Math.exp(-speed * delta));
}

const restingFringe = .018;

function curveFor(width) {
    return width < 720 ? .022 : .045;
}

export function createMotherGlass(screen, picture) {
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
    const startedAt = performance.now() / 1000;
    const now = () => performance.now() / 1000 - startedAt;

    let scale = 1;
    let width = 0;
    let height = 0;
    let frame = null;
    let lastFrameAt = 0;
    let isLost = false;
    let slowFrames = 0;
    let curvedText = null;
    let curveWatch = null;

    const state = {
        motion: 0,
        disturb: 0,
        disturbTarget: 0,
        hum: Math.random(),
        dirtSeed: Math.random(),
        syncRoll: { y: -1, strength: 0, speed: 0 },
        hold: { shift: 0, startedAt: 0, duration: 1 },
        humStrength: 1,
        glitch: { strength: 0, y: .5, height: .01 },
        surges: [],
    };

    const schedule = {
        flicker: now() + exponential(3, .5),
        glitch: now() + exponential(40, 15),
        jolt: now() + exponential(45, 20),
        syncRoll: now() + exponential(70, 25),
        hold: now() + exponential(60, 20),
    };

    let joltUntil = 0;

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
        state.surges.push({ startedAt: now(), amplitude, duration });
    }

    function surgeLevel(time) {
        let level = 0;

        state.surges = state.surges.filter(surge => {
            const progress = (time - surge.startedAt) / surge.duration;

            if (progress >= 1) {
                return false;
            }

            level += surge.amplitude * (progress < .2 ? progress / .2 : Math.pow(1 - (progress - .2) / .8, 2));

            return true;
        });

        return Math.min(level, .08);
    }

    function runEvents(time) {
        if (time > schedule.flicker) {
            addSurge(between(.004, .012), between(.1, .22));
            schedule.flicker = time + exponential(3, .5);
        }

        if (time > schedule.glitch) {
            state.glitch = { strength: between(.5, 1), y: Math.random(), height: between(.004, .014) };
            schedule.glitch = time + exponential(40, 15);
        }

        if (time > schedule.syncRoll) {
            state.syncRoll = { y: -.15, strength: between(.4, .8), speed: between(1, 1.6) };
            schedule.syncRoll = time + exponential(70, 25);
        }

        if (time > schedule.hold) {
            state.hold = { shift: (Math.random() < .5 ? -1 : 1) * Math.round(between(2, 6)), startedAt: time, duration: between(.16, .28) };
            schedule.hold = time + exponential(60, 20);
        }

        if (time > schedule.jolt) {
            joltUntil = time + between(.12, .25);
            addSurge(.02, .35);
            schedule.jolt = time + exponential(45, 20);
        }
    }

    function render(time, delta) {
        const animated = ! reducedMotion.matches;

        state.motion = approach(state.motion, animated ? 1 : 0, 2.5, delta);
        state.disturb = approach(state.disturb, state.disturbTarget, state.disturbTarget > state.disturb ? 6 : 1.6, delta);
        state.glitch.strength = state.glitch.strength < .01 ? 0 : approach(state.glitch.strength, 0, 14, delta);
        state.hum = (state.hum + delta * .045) % 1;

        if (state.syncRoll.strength > 0) {
            state.syncRoll.y += state.syncRoll.speed * delta;

            if (state.syncRoll.y > 1.2) {
                state.syncRoll.strength = 0;
            }
        }

        if (animated) {
            runEvents(time);
        }

        const flicker = animated ? .003 * Math.sin(time * 1.7) * Math.sin(time * 4.3) + .002 : .002;

        gl.viewport(0, 0, width, height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(uniforms.uResolution, width, height);
        gl.uniform1f(uniforms.uScale, scale);
        gl.uniform1f(uniforms.uTime, animated ? time : 0);
        gl.uniform1f(uniforms.uSeed, animated ? Math.random() : .5);
        gl.uniform1f(uniforms.uMotion, state.motion);
        gl.uniform1f(uniforms.uCurve, curveFor(window.innerWidth));
        gl.uniform1f(uniforms.uRadius, Math.min(width, height) / scale * .05);
        gl.uniform1f(uniforms.uFlicker, Math.max(0, flicker));
        gl.uniform1f(uniforms.uSurge, surgeLevel(time) * state.motion);
        gl.uniform1f(uniforms.uDisturb, state.disturb);
        gl.uniform2f(uniforms.uHum, 1 - state.hum, state.humStrength);
        gl.uniform3f(uniforms.uGlitch, state.glitch.strength, 1 - state.glitch.y, state.glitch.height);
        gl.uniform1f(uniforms.uDirtSeed, state.dirtSeed);
        gl.uniform2f(uniforms.uSyncRoll, 1 - state.syncRoll.y, state.syncRoll.strength);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        const isJolting = animated && time < joltUntil;
        const shift = (isJolting ? Math.round((Math.random() - .5) * 4) : 0) + (state.disturb > .05 ? Math.round((Math.random() - .5) * 2 * state.disturb) : 0);

        const holdProgress = (time - state.hold.startedAt) / state.hold.duration;
        const hold = animated && holdProgress >= 0 && holdProgress < 1 ? Math.round(state.hold.shift * Math.pow(1 - holdProgress, 2)) : 0;

        picture.style.transform = shift || hold ? `translate3d(${shift}px, ${hold}px, 0)` : '';
        picture.style.opacity = animated ? Math.min(.999, 1 - .03 * (.5 + .5 * Math.sin(time * .9)) + surgeLevel(time) * 1.5).toFixed(3) : '';

        if (curvedText) {
            curvedText.setFringe(restingFringe + state.glitch.strength * .08 + state.disturb * .04);
        }

        return animated || state.motion > .002 || state.disturb > .002;
    }

    function adapt(delta) {
        slowFrames = delta > 1 / 40 ? slowFrames + 1 : Math.max(0, slowFrames - 1);

        if (slowFrames > 90 && curvedText) {
            curvedText.setQuality('off');
        }
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
            adapt(delta);

            if (curveWatch) {
                curveWatch.frame(time, delta);
            }

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

    reducedMotion.addEventListener('change', wake);

    document.addEventListener('mother', event => {
        const { type } = event.detail || {};

        if (type === 'processing-start') {
            state.disturbTarget = .7;
        }

        if (type === 'processing-end') {
            state.disturbTarget = 0;

            if (! reducedMotion.matches) {
                addSurge(.025, .5);
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

    curvedText = createCurvedText(picture, { curve: curveFor(window.innerWidth), fringe: restingFringe, quality: initialCurveQuality() });
    curveWatch = createCurveWatch(curvedText);
    tuneCurve(curvedText);

    requestAnimationFrame(() => root.setAttribute('data-crt', 'gl'));

    return { canvas };
}
