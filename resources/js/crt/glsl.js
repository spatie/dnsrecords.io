/**
 * Shared GLSL helpers: hashing and 3D simplex noise (after Ashima Arts and
 * Stefan Gustavson), fractal brownian motion on top of it, and a cheap 2D
 * value noise for the dirt on the glass, which never moves.
 */
export const noise = `
float hash12(vec2 point) {
    vec3 p3 = fract(vec3(point.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);

    return fract((p3.x + p3.y) * p3.z);
}

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;

    return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float fbm(vec3 point) {
    float sum = 0.0;
    float amplitude = 0.5;

    for (int octave = 0; octave < 4; octave++) {
        sum += amplitude * snoise(point);
        point = point * 2.03 + vec3(17.1, 9.2, 3.7);
        amplitude *= 0.5;
    }

    return sum;
}

float valueNoise(vec2 point) {
    vec2 cell = floor(point);
    vec2 fraction = fract(point);
    vec2 smoothed = fraction * fraction * (3.0 - 2.0 * fraction);

    float a = hash12(cell);
    float b = hash12(cell + vec2(1.0, 0.0));
    float c = hash12(cell + vec2(0.0, 1.0));
    float d = hash12(cell + vec2(1.0, 1.0));

    return mix(mix(a, b, smoothed.x), mix(c, d, smoothed.x), smoothed.y);
}

float valueFbm(vec2 point) {
    return valueNoise(point) * 0.55 + valueNoise(point * 2.1 + 13.7) * 0.3 + valueNoise(point * 4.3 + 41.3) * 0.15;
}

/*
 * Dust specks on the glass: at most one per cell of the grid, in css pixels,
 * at a random spot and of a random size.
 */
float dust(vec2 cssPoint, float seed, float cellSize, float chance) {
    vec2 cell = floor(cssPoint / cellSize);
    float pick = hash12(cell + seed);

    if (pick > chance) {
        return 0.0;
    }

    vec2 centre = (cell + 0.15 + 0.7 * vec2(hash12(cell + seed + 17.0), hash12(cell + seed + 31.0))) * cellSize;
    float radius = mix(0.45, 1.5, hash12(cell + seed + 53.0));

    return smoothstep(radius + 0.9, radius * 0.25, length(cssPoint - centre)) * mix(0.35, 1.0, pick / chance);
}
`;

/**
 * A single triangle that covers the whole screen, drawn without any vertex
 * buffer by every pass of the glass.
 */
export const fullScreenVertexShader = `#version 300 es
void main() {
    vec2 position = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);

    gl_Position = vec4(position * 2.0 - 1.0, 0.0, 1.0);
}
`;

export function compileShader(gl, type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (! gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader));
    }

    return shader;
}
