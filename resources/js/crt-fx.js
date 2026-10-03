const vertexShaderSource = `
attribute vec2 position;

void main() {
    gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShaderSource = `
precision mediump float;

uniform vec2 resolution;
uniform float time;
uniform float glitch;
uniform vec3 phosphor;

float hash(vec2 point) {
    point = fract(point * vec2(123.34, 456.21));
    point += dot(point, point + 45.32);

    return fract(point.x * point.y);
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;

    float grain = hash(floor(gl_FragCoord.xy) + floor(time * 24.0)) * 0.22;

    float hum = smoothstep(0.0, 1.0, sin(uv.y * 5.0 + time * 1.7) * 0.5 + 0.5) * 0.10;

    float rollPosition = fract(time * 0.045);
    float roll = smoothstep(0.06, 0.0, abs(uv.y - (1.0 - rollPosition))) * 0.22;

    float barRow = floor(uv.y * 48.0);
    float bar = step(1.0 - glitch * 0.3, hash(vec2(barRow, floor(time * 30.0))));
    float tear = bar * hash(vec2(floor(uv.x * 160.0), barRow + time)) * glitch;

    float snow = step(1.0 - glitch * 0.12, hash(gl_FragCoord.xy + time)) * glitch;

    float vignette = smoothstep(0.95, 0.25, distance(uv, vec2(0.5)));

    float intensity = (grain + hum + roll + tear * 0.9 + snow * 0.7) * vignette;

    gl_FragColor = vec4(mix(phosphor, vec3(1.0), 0.25) * intensity, 1.0);
}
`;

function compileShader(gl, type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (! gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);

        return null;
    }

    return shader;
}

function parseColor(value) {
    const hex = value.trim().replace('#', '');

    if (hex.length !== 6) {
        return [1, .7, .25];
    }

    return [0, 2, 4].map(offset => parseInt(hex.substr(offset, 2), 16) / 255);
}

export function createCrtFxLayer(screen) {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power' });

    if (! gl) {
        return null;
    }

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (! vertexShader || ! fragmentShader) {
        return null;
    }

    const program = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (! gl.getProgramParameter(program, gl.LINK_STATUS)) {
        return null;
    }

    gl.useProgram(program);

    const buffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'position');

    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const uniforms = {
        resolution: gl.getUniformLocation(program, 'resolution'),
        time: gl.getUniformLocation(program, 'time'),
        glitch: gl.getUniformLocation(program, 'glitch'),
        phosphor: gl.getUniformLocation(program, 'phosphor'),
    };

    canvas.className = 'screen__fx';
    canvas.setAttribute('aria-hidden', 'true');
    screen.insertBefore(canvas, screen.querySelector('.screen__scanlines'));

    const frameInterval = 1000 / 30;
    const startedAt = performance.now();
    let animationFrame = null;
    let lastFrameAt = 0;
    let glitchLevel = 0;

    function resize() {
        const scale = .5;
        const width = Math.max(1, Math.round(screen.clientWidth * scale));
        const height = Math.max(1, Math.round(screen.clientHeight * scale));

        if (canvas.width === width && canvas.height === height) {
            return;
        }

        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
        gl.uniform2f(uniforms.resolution, width, height);
    }

    function refreshColor() {
        const color = parseColor(window.getComputedStyle(document.documentElement).getPropertyValue('--phosphor'));

        gl.uniform3f(uniforms.phosphor, color[0], color[1], color[2]);
    }

    function render(now) {
        animationFrame = window.requestAnimationFrame(render);

        if (now - lastFrameAt < frameInterval) {
            return;
        }

        lastFrameAt = now;
        glitchLevel = Math.max(0, glitchLevel - .06);

        gl.uniform1f(uniforms.time, (now - startedAt) / 1000);
        gl.uniform1f(uniforms.glitch, glitchLevel);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function start() {
        if (animationFrame || document.hidden) {
            return;
        }

        canvas.style.display = '';
        resize();
        animationFrame = window.requestAnimationFrame(render);
    }

    function stop() {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = null;
        canvas.style.display = 'none';
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            window.cancelAnimationFrame(animationFrame);
            animationFrame = null;

            return;
        }

        if (document.documentElement.getAttribute('data-fx') === 'on' && canvas.style.display !== 'none') {
            start();
        }
    });

    window.addEventListener('resize', resize);

    refreshColor();
    resize();

    return {
        start,
        stop,
        refreshColor,
        burst(intensity) {
            glitchLevel = Math.min(1.0, glitchLevel + intensity);
        },
    };
}
