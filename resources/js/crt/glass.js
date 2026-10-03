import { noise } from './glsl.js';
import { createCurveWatch, initialCurveQuality, tuneCurve } from './curve-quality.js';
import { createCurvedText, createTextLife } from './text-fx.js';

/*
 * The CRT glass over the terminal: curvature, bezel, scanlines, grain,
 * flicker, rolling interference, flashes and glitches. The text underneath
 * stays real DOM, so the glass only adds light (rgb) and darkness (alpha) on
 * top of it. Nothing here runs on a fixed interval: every event is scheduled
 * by a random process and every slow change follows layered noise.
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
uniform float uSignal;
uniform vec3 uPhosphor;
uniform float uCurve;
uniform float uRadius;
uniform vec4 uText;
uniform float uFlicker;
uniform float uBreath;
uniform float uSurge;
uniform float uDisturb;
uniform vec4 uBand;
uniform vec4 uRoll;
uniform vec3 uGlitch;

${noise}

float roundedBox(vec2 point, vec2 halfSize, float radius) {
    vec2 d = abs(point) - halfSize + radius;

    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - radius;
}

vec2 barrel(vec2 centered, float amount) {
    return centered * (1.0 + amount * dot(centered, centered));
}

float screenMask(vec2 centered, float amount, vec2 pixels) {
    vec2 bent = barrel(centered, amount);
    float distanceToEdge = roundedBox(bent * pixels * 0.5, pixels * 0.5, uRadius);

    return smoothstep(0.0, -1.5 * uScale, distanceToEdge);
}

void main() {
    vec2 pixel = gl_FragCoord.xy;
    vec2 uv = pixel / uResolution;
    vec2 centered = uv * 2.0 - 1.0;
    vec2 cssPixels = uResolution / uScale;

    vec2 bent = barrel(centered, uCurve);
    vec2 screenUv = bent * 0.5 + 0.5;

    float mask = screenMask(centered, uCurve, cssPixels);
    float maskRed = screenMask(centered, uCurve + 0.006, cssPixels);
    float maskBlue = screenMask(centered, uCurve - 0.006, cssPixels);

    float edgeDistance = -roundedBox(bent * cssPixels * 0.5, cssPixels * 0.5, uRadius);
    float bezelShadow = 1.0 - smoothstep(0.0, 26.0, edgeDistance);

    vec2 textUv = vec2(uv.x, 1.0 - uv.y);
    vec2 textDelta = max(uText.xy - textUv, textUv - uText.zw);
    float overText = 1.0 - smoothstep(-0.02, 0.03, max(textDelta.x, textDelta.y));
    float effectWeight = mix(1.0, 0.55, overText);

    vec3 tint = mix(uPhosphor, vec3(1.0), 0.35);
    vec3 light = vec3(0.0);
    float darkness = 0.0;

    float time = uTime;
    float rowsPerPixel = cssPixels.y;

    float scan = 0.5 + 0.5 * cos(screenUv.y * rowsPerPixel * 6.28318 / 3.0);
    darkness += scan * 0.1;

    float grain = hash12(floor(pixel / max(uScale, 0.5)) + fract(uSeed * 31.7) * 400.0);
    light += tint * grain * 0.026 * uMotion * effectWeight * uSignal;
    darkness += (1.0 - grain) * 0.018 * uMotion;

    float haze = fbm(vec3(screenUv * vec2(2.0, 3.0), time * 0.03 + uSeed)) * 0.5 + 0.5;
    light += tint * (0.006 + uFlicker + haze * 0.008) * uSignal;
    darkness += uBreath * (0.6 + 0.4 * haze);

    float rollDistance = screenUv.y - uRoll.x;
    float roll = exp(-rollDistance * rollDistance / (uRoll.y * uRoll.y)) * uRoll.z;
    float rollTexture = 0.65 + 0.35 * snoise(vec3(screenUv.x * 6.0, screenUv.y * 40.0, time * 0.8));
    light += tint * roll * rollTexture * 0.045 * uMotion * uSignal;

    float bandDistance = screenUv.y - uBand.x;
    float band = exp(-bandDistance * bandDistance / (uBand.y * uBand.y)) * uBand.z;
    float bandLines = smoothstep(0.2, 0.9, snoise(vec3(screenUv.x * 2.0, screenUv.y * 220.0, time * 3.0 + uBand.w)));
    light += tint * band * (0.035 + bandLines * 0.05) * uMotion * effectWeight * uSignal;
    darkness += band * 0.05 * uMotion;

    float disturbance = uDisturb * uMotion;
    float streaks = smoothstep(0.55, 1.0, snoise(vec3(screenUv.y * 90.0, time * 7.0, uSeed))) * smoothstep(0.3, 1.0, snoise(vec3(screenUv.x * 3.0, screenUv.y * 9.0, time * 2.0)));
    light += tint * streaks * disturbance * 0.08 * effectWeight;
    darkness += disturbance * 0.04 * (0.5 + 0.5 * snoise(vec3(screenUv.y * 6.0, time * 1.5, 7.0)));

    float tearDistance = abs(screenUv.y - uGlitch.y);
    float tear = smoothstep(uGlitch.z, 0.0, tearDistance) * uGlitch.x;
    float tearShimmer = 0.55 + 0.45 * snoise(vec3(screenUv.x * 3.0, uGlitch.y * 20.0, time * 6.0));
    light += tint * tear * tearShimmer * 0.05 * uMotion * effectWeight;

    float surgeShape = 0.7 + 0.3 * fbm(vec3(screenUv * 1.5, time * 0.4));
    light += tint * uSurge * surgeShape * uSignal;

    float highlight = smoothstep(0.75, 0.0, length((centered - vec2(-0.55, 0.62)) * vec2(0.8, 1.4)));
    light += vec3(1.0, 0.98, 0.95) * highlight * highlight * 0.03;

    float sheen = smoothstep(0.35, 0.0, abs(bent.y - 0.78 + bent.x * 0.18)) * smoothstep(1.0, 0.2, abs(bent.x + 0.2));
    light += vec3(1.0) * sheen * 0.012;

    float rim = smoothstep(0.55, 1.35, length(centered * vec2(0.92, 1.0)));
    darkness += rim * 0.42;
    darkness += bezelShadow * 0.55;

    light += vec3(maskRed - mask, 0.0, maskBlue - mask) * 0.5 * uSignal;

    light *= mask;
    darkness = mix(1.0, clamp(darkness, 0.0, 0.85), mask);

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

/**
 * Smooth one dimensional value noise with a random table per page load, so
 * the slow changes never repeat the same way twice.
 */
function noise1d() {
    const size = 512;
    const table = Array.from({ length: size }, () => Math.random() * 2 - 1);

    return value => {
        const index = Math.floor(value);
        const fraction = value - index;
        const smooth = fraction * fraction * (3 - 2 * fraction);
        const a = table[((index % size) + size) % size];
        const b = table[(((index + 1) % size) + size) % size];

        return a + (b - a) * smooth;
    };
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

const restingFringe = .035;

const phosphorColors = {
    white: [.89, .89, .91],
    green: [.49, 1, .65],
    amber: [1, .76, .4],
};

export function createGlass(screen, picture) {
    const root = document.documentElement;
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: 'high-performance',
    });

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

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const slow = noise1d();
    const fast = noise1d();
    const startedAt = performance.now() / 1000;
    const qualityScales = [1, .75, .5];

    let quality = 0;
    let scale = 1;
    let frame = null;
    let lastFrameAt = 0;
    let isLost = false;
    let width = 0;
    let height = 0;
    let textBox = [0, 0, 1, 1];
    let frameTimes = [];

    const state = {
        motion: 0,
        signal: 1,
        disturb: 0,
        disturbTarget: 0,
        surge: 0,
        phosphor: (phosphorColors[root.getAttribute('data-phosphor')] || phosphorColors.white).slice(),
        band: { y: -1, width: .1, strength: 0, speed: 0, seed: 0 },
        roll: { y: Math.random(), width: .06, speed: .03 },
        glitch: { strength: 0, y: .5, height: .01 },
        wobbleUntil: 0,
    };

    const now = () => performance.now() / 1000 - startedAt;

    const schedule = {
        band: now() + exponential(6, 2),
        glitch: now() + exponential(22, 8),
        surge: now() + exponential(14, 5),
        bigSurge: now() + exponential(70, 30),
        wobble: now() + exponential(28, 10),
        flicker: now() + exponential(4, .4),
    };

    const surges = [];

    function isAnimated() {
        return ! reducedMotion.matches;
    }

    function resize() {
        const cssWidth = screen.clientWidth;
        const cssHeight = screen.clientHeight;
        const budget = 2200000;
        const baseScale = Math.min(1, Math.sqrt(budget / Math.max(1, cssWidth * cssHeight)));

        scale = baseScale * qualityScales[quality];
        width = Math.max(1, Math.round(cssWidth * scale));
        height = Math.max(1, Math.round(cssHeight * scale));

        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }

        const content = document.getElementById('screen-content');
        const terminal = document.getElementById('terminal');
        const screenBox = screen.getBoundingClientRect();
        const textElement = terminal || content;

        if (textElement) {
            const box = textElement.getBoundingClientRect();
            const contentBox = content.getBoundingClientRect();

            textBox = [
                (box.left - screenBox.left) / screenBox.width,
                (contentBox.top - screenBox.top) / screenBox.height,
                (box.right - screenBox.left) / screenBox.width,
                (contentBox.bottom - screenBox.top) / screenBox.height,
            ];
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

        return Math.min(level, .09);
    }

    function runEvents(time) {
        if (time > schedule.band && state.band.strength < .05) {
            state.band = {
                y: -.2,
                width: between(.03, .16),
                strength: between(.4, 1),
                speed: between(.05, .3),
                seed: Math.random() * 100,
            };
            schedule.band = time + exponential(9, 2.5);
        }

        if (time > schedule.surge) {
            addSurge(between(.012, .03), between(.35, .7));
            schedule.surge = time + exponential(16, 4);
        }

        if (time > schedule.bigSurge) {
            addSurge(between(.04, .06), between(.6, 1.1));
            schedule.bigSurge = time + exponential(80, 30);
        }

        if (time > schedule.flicker) {
            addSurge(between(.006, .014), between(.12, .25));
            schedule.flicker = time + exponential(3.5, .4);
        }

        if (time > schedule.glitch) {
            glitch(between(.5, 1));
            schedule.glitch = time + exponential(26, 7);
        }

        if (time > schedule.wobble) {
            state.wobbleUntil = time + between(.35, .7);
            schedule.wobble = time + exponential(30, 9);
        }
    }

    let glitchUntil = 0;
    let curvedText = null;
    let curveWatch = null;

    const textLife = createTextLife(picture);

    function glitch(strength) {
        state.glitch = { strength, y: Math.random(), height: between(.004, .02) };
        textLife.tear(state.glitch.y, strength);
        glitchUntil = now() + between(.12, .26);
        addSurge(.012 * strength, .3);
    }

    function updatePicture(time) {
        const isGlitching = time < glitchUntil;
        const isWobbling = time < state.wobbleUntil;
        const disturb = state.disturb;

        if (! isGlitching && ! isWobbling && disturb < .02) {
            if (picture.style.transform) {
                picture.style.transform = '';
            }

            return;
        }

        let shift = 0;
        let skew = 0;

        if (isGlitching) {
            shift += Math.round((Math.random() - .5) * 6 * state.glitch.strength);
        }

        if (isWobbling) {
            skew += Math.sin(time * 38) * .25 * Math.min(1, (state.wobbleUntil - time) * 4);
        }

        shift += Math.round(fast(time * 25) * 2 * disturb);

        picture.style.transform = `translate3d(${shift}px, 0, 0) skewX(${skew.toFixed(3)}deg)`;
    }

    function render(time, delta) {
        const animated = isAnimated();
        const isOn = root.getAttribute('data-power') !== 'off';

        state.motion = approach(state.motion, animated ? 1 : 0, 2.5, delta);
        state.signal = approach(state.signal, isOn ? 1 : 0, isOn ? 2.5 : 4, delta);
        state.disturb = approach(state.disturb, state.disturbTarget, state.disturbTarget > state.disturb ? 6 : 1.6, delta);

        const target = phosphorColors[root.getAttribute('data-phosphor')] || phosphorColors.white;

        state.phosphor = state.phosphor.map((channel, index) => approach(channel, target[index], 3, delta));

        if (animated) {
            runEvents(time);
        }

        const rollSpeed = .02 + .025 * (slow(time * .05) + 1);

        state.roll.y += rollSpeed * delta;

        if (state.roll.y > 1.25) {
            state.roll = { y: -.25, width: between(.04, .1), speed: rollSpeed };
        }

        if (state.band.strength > 0) {
            state.band.y += state.band.speed * delta;

            if (state.band.y > 1.3) {
                state.band.strength = 0;
            }
        }

        if (time > glitchUntil) {
            state.glitch.strength = state.glitch.strength < .01 ? 0 : approach(state.glitch.strength, 0, 18, delta);
        }

        const flicker = (.004 + .004 * slow(time * .9 + 11) + .003 * fast(time * 7.3)) * state.motion;
        const curve = Math.min(window.innerWidth, 900) < 640 ? .02 : .034;
        const breath = (.02 + .015 * slow(time * .07) + .01 * slow(time * .021 + 40)) * state.motion;

        gl.viewport(0, 0, width, height);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.uniform2f(uniforms.uResolution, width, height);
        gl.uniform1f(uniforms.uScale, scale);
        gl.uniform1f(uniforms.uTime, animated ? time : 0);
        gl.uniform1f(uniforms.uSeed, animated ? Math.random() : .5);
        gl.uniform1f(uniforms.uMotion, state.motion);
        gl.uniform1f(uniforms.uSignal, state.signal);
        gl.uniform3f(uniforms.uPhosphor, ...state.phosphor);
        gl.uniform1f(uniforms.uCurve, curve);
        gl.uniform1f(uniforms.uRadius, Math.min(width, height) / scale * .035);
        gl.uniform4f(uniforms.uText, ...textBox);
        gl.uniform1f(uniforms.uFlicker, Math.max(0, flicker));
        gl.uniform1f(uniforms.uBreath, Math.max(0, breath));
        gl.uniform1f(uniforms.uSurge, surgeLevel(time) * state.motion);
        gl.uniform1f(uniforms.uDisturb, state.disturb);
        gl.uniform4f(uniforms.uBand, 1 - state.band.y, state.band.width, state.band.strength, state.band.seed);
        gl.uniform4f(uniforms.uRoll, 1 - state.roll.y, state.roll.width, .35 + .3 * slow(time * .11 + 3), 0);
        gl.uniform3f(uniforms.uGlitch, state.glitch.strength, 1 - state.glitch.y, state.glitch.height);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        if (animated) {
            updatePicture(time);
        } else if (picture.style.transform) {
            picture.style.transform = '';
        }

        textLife.frame(time, {
            flicker: Math.max(0, flicker),
            breath: Math.max(0, breath),
            surge: surgeLevel(time) * state.motion,
            disturb: state.disturb,
            motion: state.motion,
        });

        if (curvedText) {
            curvedText.setFringe(restingFringe + state.glitch.strength * .1 + state.disturb * .04);
        }

        return animated || Math.abs(state.motion) > .002 || Math.abs(state.signal - (isOn ? 1 : 0)) > .002 || state.disturb > .002;
    }

    function adapt(delta) {
        frameTimes.push(delta);

        if (frameTimes.length < 60) {
            return;
        }

        const sorted = frameTimes.slice().sort((a, b) => a - b);
        const median = sorted[30];

        frameTimes = [];

        if (median <= 1 / 45) {
            return;
        }

        if (quality < qualityScales.length - 1) {
            quality++;
            resize();

            return;
        }

        if (curvedText) {
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

        const keepGoing = render(time, delta);

        if (keepGoing) {
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
        if (document.hidden) {
            cancelAnimationFrame(frame);
            frame = null;
            lastFrameAt = 0;

            return;
        }

        wake();
    });

    new MutationObserver(wake).observe(root, { attributes: true, attributeFilter: ['data-motion', 'data-phosphor', 'data-power', 'data-page'] });
    new ResizeObserver(() => {
        resize();
        wake();
    }).observe(screen);
    reducedMotion.addEventListener('change', wake);

    document.addEventListener('crt', event => {
        const { type } = event.detail || {};

        if (type === 'lookup-start') {
            state.disturbTarget = .9;
        }

        if (type === 'lookup-end') {
            state.disturbTarget = 0;
            resize();

            if (isAnimated()) {
                addSurge(.03, .5);
            }
        }

        if (type === 'degauss' && isAnimated()) {
            addSurge(.05, 1.2);
            state.disturb = .6;
            state.wobbleUntil = now() + 1.2;
        }

        if (type === 'glitch' && isAnimated()) {
            glitch(.6);
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

    curvedText = createCurvedText(picture, { curve: Math.min(window.innerWidth, 900) < 640 ? .02 : .034, fringe: restingFringe, quality: initialCurveQuality() });
    curveWatch = createCurveWatch(curvedText);
    tuneCurve(curvedText, restingFringe);

    requestAnimationFrame(() => root.setAttribute('data-crt', 'gl'));

    return {
        get quality() {
            return qualityScales[quality] * scale / qualityScales[quality];
        },
    };
}
