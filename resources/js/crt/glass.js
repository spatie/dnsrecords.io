import { noise } from './glsl.js';
import { approach, between, exponential, noise1d } from './random.js';
import { createShaderTextLife, createTextLife } from './text-fx.js';
import { createTextLayer } from './text-layer.js';
import { createTextPass, maximumLineEffects } from './text-pass.js';

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
uniform float uDirtSeed;
uniform vec2 uSyncRoll;
uniform vec2 uCrawl;
uniform vec3 uDropout;
uniform float uStatic;
uniform float uBanding;

${noise}

float bloomShimmer(vec2 screenUv, float time) {
    return valueNoise(screenUv * vec2(5.0, 9.0) + time * 0.05) * 0.004;
}

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

    float grille = 0.5 + 0.5 * cos(screenUv.x * cssPixels.x * 6.28318 / 3.0);
    darkness += grille * 0.03;

    float grain = hash12(floor(pixel / max(uScale, 0.5)) + fract(uSeed * 31.7) * 400.0);
    light += tint * grain * 0.036 * uMotion * effectWeight * uSignal;
    darkness += (1.0 - grain) * 0.03 * uMotion;

    vec2 cssPoint = screenUv * cssPixels;
    float smudge = smoothstep(0.52, 0.86, valueFbm(cssPoint / 260.0 + uDirtSeed * 7.0));
    float specks = dust(cssPoint, uDirtSeed * 97.0, 64.0, 0.22) + dust(cssPoint + 31.0, uDirtSeed * 53.0, 151.0, 0.3) * 1.4;
    light += vec3(0.92, 0.94, 1.0) * (smudge * 0.02 + specks * 0.035) * uSignal;
    darkness += smudge * 0.025 + specks * 0.1;

    float phosphorWear = valueFbm(screenUv * vec2(2.2, 1.6) + uDirtSeed * 3.0) - 0.5;
    darkness += phosphorWear * 0.07;
    light += tint * smoothstep(1.1, 0.0, length(centered * vec2(0.8, 1.0))) * 0.012 * uSignal;
    light += tint * overText * (0.004 + bloomShimmer(screenUv, time)) * uSignal;

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

    float syncDistance = screenUv.y - uSyncRoll.x;
    float syncBar = exp(-syncDistance * syncDistance / 0.003) * uSyncRoll.y;
    float syncEdge = exp(-(syncDistance + 0.045) * (syncDistance + 0.045) / 0.00004) * uSyncRoll.y;
    darkness += syncBar * 0.22 * uMotion;
    light += tint * syncEdge * 0.035 * uMotion * uSignal;

    float crawlDistance = screenUv.y - uCrawl.x;
    float crawl = exp(-crawlDistance * crawlDistance / 0.002) * uCrawl.y;
    float crawlStripes = 0.5 + 0.5 * sin(screenUv.y * cssPixels.y * 0.9 + screenUv.x * 14.0 - time * 11.0);
    light += tint * crawl * crawlStripes * 0.03 * uMotion * effectWeight * uSignal;
    darkness += crawl * 0.03 * uMotion;

    float dropoutDistance = abs(screenUv.y - uDropout.x);
    float dropout = smoothstep(uDropout.y, uDropout.y * 0.55, dropoutDistance) * uDropout.z * uMotion;
    float dropoutNoise = hash12(floor(pixel / max(uScale * 2.0, 1.0)) + fract(uSeed * 17.3) * 300.0);
    darkness += dropout * 0.3;
    light += tint * dropout * dropoutNoise * 0.05 * uSignal;

    float staticNoise = hash12(floor(pixel / max(uScale * 1.5, 0.75)) + fract(uSeed * 7.1) * 500.0);
    light += tint * staticNoise * uStatic * 0.06 * uMotion * uSignal;
    darkness += (1.0 - staticNoise) * uStatic * 0.05 * uMotion;

    darkness += uBanding * 0.035 * (0.5 + 0.5 * sin(screenUv.y * 31.0 + time * 0.6)) * uMotion;

    float surgeShape = 0.7 + 0.3 * fbm(vec3(screenUv * 1.5, time * 0.4));
    light += tint * uSurge * surgeShape * uSignal;

    float highlight = smoothstep(0.75, 0.0, length((centered - vec2(-0.55, 0.62)) * vec2(0.8, 1.4)));
    light += vec3(1.0, 0.98, 0.95) * highlight * highlight * 0.03;

    float sheen = smoothstep(0.35, 0.0, abs(bent.y - 0.78 + bent.x * 0.18)) * smoothstep(1.0, 0.2, abs(bent.x + 0.2));
    light += vec3(1.0) * sheen * 0.012;

    float rim = smoothstep(0.55, 1.35, length(centered * vec2(0.92, 1.0)));
    darkness += rim * 0.47;

    vec2 edgeFringe = max(vec2(-centered.x, centered.x), 0.0);
    light += vec3(edgeFringe.x * edgeFringe.x * 0.022, 0.0, edgeFringe.y * edgeFringe.y * 0.028) * uSignal;
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

const restingFringe = .035;

const textLineSelector = '.line, .brand, .prompt, .resolving, .results__header, .message, .terminal-footer p';

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

    let textPass = null;

    try {
        textPass = createTextPass(gl);
    } catch (error) {
        textPass = null;
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
    let outputWidth = 0;
    let outputHeight = 0;
    let textBox = [0, 0, 1, 1];
    let pictureBox = [0, 0, 1, 1];
    let textLayer = null;
    let shaderTextLife = null;
    let isTextReady = false;
    let reveal = { startedAt: -1, longestDelay: 1, box: [0, 0, 1, 1] };
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
        dirtSeed: Math.random(),
        syncRoll: { y: -1, strength: 0, speed: 0 },
        crawl: { y: -1, strength: 0, speed: 0 },
        dropout: { y: -1, halfHeight: 0, strength: 0, until: 0 },
        staticBurst: { strength: 0, startedAt: 0, duration: 1 },
        hold: { shift: 0, startedAt: 0, duration: 1 },
    };

    const now = () => performance.now() / 1000 - startedAt;

    const schedule = {
        band: now() + exponential(6, 2),
        glitch: now() + exponential(22, 8),
        surge: now() + exponential(14, 5),
        bigSurge: now() + exponential(70, 30),
        wobble: now() + exponential(28, 10),
        flicker: now() + exponential(4, .4),
        syncRoll: now() + exponential(45, 15),
        crawl: now() + exponential(20, 8),
        dropout: now() + exponential(7, 2),
        staticBurst: now() + exponential(60, 25),
        hold: now() + exponential(35, 12),
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

        const outputScale = Math.min(Math.min(2, window.devicePixelRatio || 1), Math.sqrt(8000000 / Math.max(1, cssWidth * cssHeight))) * (quality === qualityScales.length - 1 ? .75 : 1);

        outputWidth = isTextReady ? Math.max(1, Math.round(cssWidth * outputScale)) : width;
        outputHeight = isTextReady ? Math.max(1, Math.round(cssHeight * outputScale)) : height;

        if (canvas.width !== outputWidth || canvas.height !== outputHeight) {
            canvas.width = outputWidth;
            canvas.height = outputHeight;
        }

        pictureBox = [picture.offsetLeft, picture.offsetTop, picture.offsetWidth, picture.offsetHeight];

        if (textLayer) {
            textLayer.invalidate();
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

        if (time > schedule.syncRoll) {
            state.syncRoll = { y: -.15, strength: between(.5, 1), speed: between(1.2, 2) };
            schedule.syncRoll = time + exponential(50, 18);
        }

        if (time > schedule.crawl && state.crawl.strength === 0) {
            state.crawl = { y: 1.15, strength: between(.4, 1), speed: between(.05, .12) };
            schedule.crawl = time + exponential(24, 8);
        }

        if (time > schedule.dropout) {
            const line = (isTextReady ? shaderTextLife : textLife).dropout(between(50, 110));

            if (line) {
                state.dropout = { ...line, strength: 1, until: time + between(.04, .09) };
            }

            schedule.dropout = time + exponential(7, 2);
        }

        if (time > schedule.staticBurst) {
            state.staticBurst = { strength: between(.5, 1), startedAt: time, duration: between(.12, .22) };
            schedule.staticBurst = time + exponential(70, 25);
        }

        if (time > schedule.hold) {
            state.hold = { shift: (Math.random() < .5 ? -1 : 1) * Math.round(between(3, 8)), startedAt: time, duration: between(.14, .26) };
            schedule.hold = time + exponential(38, 12);
        }
    }

    function moveGlitches(time, delta) {
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

    let glitchUntil = 0;

    const textLife = createTextLife(picture);

    function glitch(strength) {
        state.glitch = { strength, y: Math.random(), height: between(.004, .02) };
        (isTextReady ? shaderTextLife : textLife).tear(state.glitch.y, strength);
        glitchUntil = now() + between(.12, .26);
        addSurge(.012 * strength, .3);
    }

    function updatePicture(time) {
        const isGlitching = time < glitchUntil;
        const isWobbling = time < state.wobbleUntil;
        const disturb = state.disturb;
        const hold = holdOffset(time);

        if (! isGlitching && ! isWobbling && disturb < .02 && hold === 0) {
            if (picture.style.transform) {
                picture.style.transform = '';
            }

            return [0, 0, 0];
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

        picture.style.transform = `translate3d(${shift}px, ${hold}px, 0) skewX(${skew.toFixed(3)}deg)`;

        return [shift, hold, Math.tan(skew * Math.PI / 180)];
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

        moveGlitches(time, delta);

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
        const curve = (Math.min(window.innerWidth, 900) < 640 ? .02 : .034) * (1 + .05 * slow(time * .11 + 20) * state.motion);
        const breath = (.02 + .015 * slow(time * .07) + .01 * slow(time * .021 + 40)) * state.motion;

        if (isTextReady) {
            textPass.bindGlass(width, height);
        }

        gl.useProgram(program);
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
        gl.uniform1f(uniforms.uDirtSeed, state.dirtSeed);
        gl.uniform2f(uniforms.uSyncRoll, 1 - state.syncRoll.y, state.syncRoll.strength);
        gl.uniform2f(uniforms.uCrawl, 1 - state.crawl.y, state.crawl.strength);
        gl.uniform3f(uniforms.uDropout, 1 - state.dropout.y, state.dropout.halfHeight, state.dropout.strength);
        gl.uniform1f(uniforms.uStatic, staticLevel(time));
        gl.uniform1f(uniforms.uBanding, Math.max(0, slow(time * .045 + 70) - .2) * state.motion);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        let pictureShift = [0, 0, 0];

        if (animated) {
            pictureShift = updatePicture(time);
        } else if (picture.style.transform) {
            picture.style.transform = '';
        }

        const life = {
            flicker: Math.max(0, flicker),
            breath: Math.max(0, breath),
            surge: surgeLevel(time) * state.motion,
            disturb: state.disturb,
            motion: state.motion,
        };

        if (! isTextReady) {
            textLife.frame(time, life);

            return animated || Math.abs(state.motion) > .002 || Math.abs(state.signal - (isOn ? 1 : 0)) > .002 || state.disturb > .002;
        }

        const textAlpha = root.hasAttribute('data-output-stream')
            ? 0
            : shaderTextLife.frame(time, life) * pictureOpacity() * contentOpacity();

        drawText(curve, pictureShift, textAlpha);

        if (isHandoverPending) {
            handOver();
        }

        return animated || Math.abs(state.motion) > .002 || Math.abs(state.signal - (isOn ? 1 : 0)) > .002 || state.disturb > .002;
    }

    /**
     * The opacity and scale of the picture while the screen switches on or
     * off, which CSS animates on the (transparent) DOM picture.
     */
    function pictureTransition() {
        const isPowering = screen.classList.contains('is-powering-on') || screen.classList.contains('is-powering-off') || root.getAttribute('data-power') === 'off';

        if (! isPowering) {
            return null;
        }

        const style = getComputedStyle(picture);
        const matrix = style.transform && style.transform !== 'none' ? new DOMMatrixReadOnly(style.transform) : new DOMMatrixReadOnly();

        return { opacity: parseFloat(style.opacity), scale: [Math.max(.004, matrix.a), Math.max(.004, matrix.d)] };
    }

    function pictureOpacity() {
        const transition = pictureTransition();

        return transition ? transition.opacity : 1;
    }

    function contentOpacity() {
        const content = document.getElementById('screen-content');

        if (! content || ! content.getAnimations().length) {
            return 1;
        }

        return parseFloat(getComputedStyle(content).opacity);
    }

    function caretValues() {
        const caret = textLayer.caret();

        if (! caret || root.getAttribute('data-power') === 'off') {
            return { caret: [0, 0, 0, 0], colour: [0, 0, 0, 0] };
        }

        const isTyping = performance.now() - lastTypedAt < 600;
        const isOn = isTyping || ! isAnimated() || Math.floor(performance.now() / 530) % 2 === 0;
        const [red, green, blue] = (caret.colour.match(/[\d.]+/g) || [228, 228, 231]).map(Number);

        return { caret: [caret.x, caret.top, caret.width, caret.height], colour: [red / 255, green / 255, blue / 255, isOn ? 1 : 0] };
    }

    function drawText(curve, pictureShift, textAlpha) {
        const change = textLayer.update();

        if (change) {
            textPass.uploadText(textLayer, change === true ? null : change);
        }

        if (change === true && isRevealPending) {
            isRevealPending = false;
            startReveal();
        }

        const transition = pictureTransition();
        const { lineA, lineB } = shaderTextLife.lineEffects();
        const { caret, colour } = caretValues();
        const revealElapsed = reveal.startedAt < 0 ? -1 : now() - reveal.startedAt;

        if (revealElapsed > reveal.longestDelay + .6) {
            reveal.startedAt = -1;
        }

        textPass.draw(outputWidth, outputHeight, {
            screen: [screen.clientWidth, screen.clientHeight],
            picture: pictureBox,
            pictureScale: transition ? transition.scale : [1, 1],
            pictureShift,
            curve,
            warm: 1,
            fringe: restingFringe + state.glitch.strength * .1 + state.disturb * .04,
            textAlpha: textAlpha * state.signal,
            glow: .75,
            lineA,
            lineB,
            reveal: [reveal.startedAt < 0 ? -1 : revealElapsed, reveal.longestDelay, 0, 0],
            revealBox: reveal.box,
            scroll: textLayer.scrollOffset,
            ring: textLayer.ring,
            burnBox: textLayer.burn.box,
            caret,
            caretColour: colour,
        });
    }

    let lastTypedAt = 0;
    let isHandoverPending = false;
    let isRevealPending = false;

    function startReveal() {
        const results = textLayer ? textLayer.resultLines() : null;

        if (! results || ! isAnimated()) {
            reveal.startedAt = -1;

            return;
        }

        reveal = {
            startedAt: now(),
            longestDelay: textPass.uploadRows(results),
            box: [results.left, results.top, results.width, results.height],
        };
    }

    /**
     * Hands the text over to the shader once the fonts are there, and keeps
     * the painted text in step with the DOM.
     */
    function startText() {
        textLayer = createTextLayer(picture);
        shaderTextLife = createShaderTextLife(textLayer, { maximumEffects: maximumLineEffects });

        const content = () => document.getElementById('screen-content');
        let phosphorUntil = 0;

        new MutationObserver(mutations => {
            const changes = mutations.filter(mutation => ! (mutation.target === picture && mutation.attributeName === 'style'));

            if (! changes.length) {
                return;
            }

            const changedLines = changes.map(mutation => {
                const target = mutation.target.nodeType === Node.ELEMENT_NODE ? mutation.target : mutation.target.parentElement;

                return target ? target.closest(textLineSelector) : null;
            });

            if (changedLines.every(Boolean)) {
                changedLines.forEach(line => textLayer.invalidateLine(line));
            } else {
                textLayer.invalidate();
            }

            wake();
        }).observe(picture, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'hidden', 'data-label', 'style'] });

        new MutationObserver(() => {
            phosphorUntil = performance.now() + 900;
        }).observe(root, { attributes: true, attributeFilter: ['data-phosphor'] });

        document.addEventListener('input', event => {
            if (event.target.closest('#screen-content')) {
                lastTypedAt = performance.now();
                textLayer.repaintInput();
                wake();
            }
        });

        document.addEventListener('selectionchange', () => {
            lastTypedAt = performance.now();
        });


        ['pointerover', 'pointerout', 'focusin', 'focusout'].forEach(type => {
            picture.addEventListener(type, event => {
                textLayer.invalidateLine(event.target);
                wake();
            });
        });

        document.fonts.addEventListener('loadingdone', () => textLayer.invalidate());
        document.addEventListener('scroll', wake, { capture: true, passive: true });

        setInterval(() => {
            const root = content();

            const dots = root ? root.querySelector('.resolving__dots') : null;

            if (performance.now() < phosphorUntil) {
                textLayer.invalidate();
                wake();
            }

            if (dots) {
                textLayer.invalidateLine(dots);
                wake();
            }
        }, 60);

        textLife.reset();
        isTextReady = true;
        resize();
        textLayer.update();
        textLayer.update();
        textPass.uploadText(textLayer);
        isHandoverPending = true;
    }

    /**
     * Hides the DOM text in the very frame the canvas first shows the same
     * text, so the page never flashes or goes blank in between.
     */
    function handOver() {
        if (root.hasAttribute('data-output-stream')) {
            return;
        }

        isHandoverPending = false;
        root.setAttribute('data-crt', 'gl');
        root.setAttribute('data-text', 'gl');
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

        resize();
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
        const { type, progressive } = event.detail || {};

        if (type === 'lookup-start') {
            state.disturbTarget = .9;
        }

        if (type === 'lookup-end') {
            state.disturbTarget = 0;
            resize();

            if (isTextReady) {
                textLayer.invalidate();
                isRevealPending = ! progressive;
            }

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
        root.removeAttribute('data-text');
    });

    resize();
    wake();

    if (textPass) {
        document.fonts.ready.then(() => {
            if (! isLost) {
                startText();
                wake();
            }
        });
    }

    if (! textPass) {
        requestAnimationFrame(() => root.setAttribute('data-crt', 'gl'));
    }

    return {
        get quality() {
            return qualityScales[quality] * scale / qualityScales[quality];
        },
    };
}
