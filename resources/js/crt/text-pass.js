/*
 * The second pass of the glass: puts the painted text on the curved tube,
 * with the colour fringes, the glow and the line glitches, and lays the
 * glass of the first pass (light and darkness) over it. Runs at the full
 * resolution of the screen, while the first pass, which is far heavier,
 * keeps running at a lower one.
 */

export const maximumLineEffects = 8;

const vertexShader = `#version 300 es
void main() {
    vec2 position = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);

    gl_Position = vec4(position * 2.0 - 1.0, 0.0, 1.0);
}
`;

const fragmentShader = `#version 300 es
precision highp float;

out vec4 outColor;

uniform sampler2D uGlass;
uniform sampler2D uText;
uniform sampler2D uRows;
uniform sampler2D uBurn;
uniform vec4 uRing;
uniform vec4 uBurnBox;
uniform vec2 uResolution;
uniform vec2 uScreen;
uniform vec4 uPicture;
uniform vec2 uPictureScale;
uniform vec3 uPictureShift;
uniform float uCurve;
uniform float uFringe;
uniform float uWarm;
uniform float uTextAlpha;
uniform float uGlow;
uniform vec4 uLineA[${maximumLineEffects}];
uniform vec4 uLineB[${maximumLineEffects}];
uniform vec4 uReveal;
uniform vec4 uRevealBox;
uniform float uScroll;
uniform float uGhostScroll;
uniform float uGhostStrength;
uniform vec4 uCaret;
uniform vec4 uCaretColour;

vec2 barrel(vec2 centered, float amount) {
    return centered * (1.0 + amount * dot(centered, centered));
}

/*
 * Where on the painted picture a point of the screen shows, in css pixels
 * of the picture, after the curve of the glass and the shifts of the picture.
 */
vec2 picturePoint(vec2 screenPoint, float curve) {
    vec2 centered = screenPoint / uScreen * 2.0 - 1.0;
    vec2 source = (barrel(centered, curve) * 0.5 + 0.5) * uScreen;
    vec2 point = source - uPicture.xy;

    point = (point - uPicture.zw * 0.5) / uPictureScale + uPicture.zw * 0.5;
    point.x -= uPictureShift.x + uPictureShift.z * (point.y - uPicture.w * 0.5);
    point.y -= uPictureShift.y;

    return point;
}

/*
 * The painted text is a ring of the scrolling content: a row of the content
 * lives on that row modulo the height of the ring.
 */
vec4 sampleTextAtScroll(vec2 point, float scroll, float lod) {
    float across = point.x / uPicture.z;
    float row = point.y - uRing.x;

    if (across < 0.0 || across > 1.0 || row < 0.0 || row >= uRing.y) {
        return vec4(0.0);
    }

    return textureLod(uText, vec2(across, mod(row + scroll, uRing.y) / uRing.y), lod);
}

vec4 sampleText(vec2 point, float lod) {
    return sampleTextAtScroll(point, uRing.z, lod);
}

vec4 sampleBurn(vec2 point) {
    vec2 uv = (point - uBurnBox.xy) / uBurnBox.zw;

    if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) {
        return vec4(0.0);
    }

    return texture(uBurn, uv);
}

/*
 * The reveal of a fresh lookup: every line is wiped in from the left with a
 * flash, a little later than the line above it.
 */
float reveal(vec2 point, out float brightness) {
    brightness = 1.0;

    if (uReveal.x < 0.0) {
        return 1.0;
    }

    float contentY = point.y + uScroll - uRevealBox.y;

    if (contentY < 0.0 || contentY > uRevealBox.w) {
        return 1.0;
    }

    vec4 row = texelFetch(uRows, ivec2(0, int(contentY)), 0);

    if (row.g < 0.5) {
        return 1.0;
    }

    float local = (uReveal.x - row.r * uReveal.y) / 0.5;

    if (local <= 0.0) {
        return 0.0;
    }

    float wipe = clamp(local / 0.45, 0.0, 1.0);
    float across = (point.x - uRevealBox.x) / uRevealBox.z;

    brightness = local < 0.45 ? mix(2.2, 1.7, local / 0.45) : mix(1.7, 1.0, clamp((local - 0.45) / 0.55, 0.0, 1.0));

    return across <= wipe ? 1.0 : 0.0;
}

/*
 * One colour channel of the text, with the line glitches applied. The
 * channel picks which side a torn line splits its colours to.
 */
vec4 textAt(vec2 screenPoint, float curve, float channel) {
    vec2 point = picturePoint(screenPoint, curve);
    float alpha = 1.0;
    float echoShift = 0.0;
    float echoAlpha = 0.0;

    for (int index = 0; index < ${maximumLineEffects}; index++) {
        vec4 a = uLineA[index];

        if (point.y >= a.x && point.y < a.y) {
            vec4 b = uLineB[index];

            point.x -= a.z + b.x * channel;
            alpha *= a.w;
            echoShift = b.y;
            echoAlpha = b.z;

            break;
        }
    }

    float brightness;
    float shown = reveal(point, brightness);
    vec4 colour = sampleText(point, 0.0) * alpha * shown;

    if (echoAlpha > 0.0) {
        colour += sampleText(point - vec2(echoShift, 0.0), 0.0) * echoAlpha * (1.0 - colour.a);
    }

    return vec4(colour.rgb * brightness, colour.a);
}

void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;
    vec2 screenPoint = vec2(uv.x, 1.0 - uv.y) * uScreen;

    vec4 glass = texture(uGlass, uv) * uWarm;

    vec4 red = textAt(screenPoint, uCurve * (1.0 + uFringe), -1.0);
    vec4 green = textAt(screenPoint, uCurve, 0.0);
    vec4 blue = textAt(screenPoint, uCurve * (1.0 - uFringe), 1.0);

    vec4 text = vec4(red.r, green.g, blue.b, max(green.a, max(red.a, blue.a)));
    vec2 point = picturePoint(screenPoint, uCurve);

    if (uGhostStrength > 0.0) {
        vec4 ghost = sampleTextAtScroll(point, uGhostScroll, 1.0);

        text.rgb += ghost.rgb * uGhostStrength * (1.0 - min(text.a, 1.0) * 0.7);
        text.a = max(text.a, ghost.a * uGhostStrength * 0.65);
    }

    if (uCaretColour.a > 0.0 && point.x >= uCaret.x && point.x <= uCaret.x + uCaret.z && point.y >= uCaret.y && point.y <= uCaret.y + uCaret.w) {
        text = vec4(uCaretColour.rgb, 1.0);
    }

    vec4 glow = sampleText(point, 2.5) * 0.55 + sampleText(point, 4.5) * 0.5 + sampleText(point, 6.0) * 0.3;

    text += sampleBurn(point) * (1.0 - text.a);

    text *= uTextAlpha;
    text.rgb += glow.rgb * uGlow * uTextAlpha * (1.0 - text.a);

    float darkness = glass.a;

    outColor = vec4(text.rgb * (1.0 - darkness) + glass.rgb, 1.0 - (1.0 - min(text.a, 1.0)) * (1.0 - darkness));
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

function texture(gl, unit, filter) {
    const handle = gl.createTexture();

    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, handle);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    return handle;
}

export function createTextPass(gl) {
    const program = gl.createProgram();

    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertexShader));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragmentShader));
    gl.linkProgram(program);

    if (! gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program));
    }

    const uniforms = {};

    for (let index = 0; index < gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS); index++) {
        const name = gl.getActiveUniform(program, index).name;

        uniforms[name.replace('[0]', '')] = gl.getUniformLocation(program, name);
    }

    const glassTexture = texture(gl, 0, gl.LINEAR);
    const textTexture = texture(gl, 1, gl.LINEAR_MIPMAP_LINEAR);
    const rowsTexture = texture(gl, 2, gl.NEAREST);
    const burnTexture = texture(gl, 3, gl.LINEAR);

    gl.activeTexture(gl.TEXTURE1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    const framebuffer = gl.createFramebuffer();

    gl.activeTexture(gl.TEXTURE2);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));

    let glassWidth = 0;
    let glassHeight = 0;
    let textVersion = -1;
    let textWidth = 0;
    let textHeight = 0;
    let burnVersion = -1;

    return {
        /**
         * Points the first pass at a texture of the given size.
         */
        bindGlass(width, height) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, glassTexture);

            if (width !== glassWidth || height !== glassHeight) {
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
                glassWidth = width;
                glassHeight = height;
            }

            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, glassTexture, 0);
        },

        /**
         * Uploads the painted text, all of it or only the rows that changed.
         */
        uploadText(layer, regions = null) {
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, textTexture);
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

            const isSameSize = layer.canvas.width === textWidth && layer.canvas.height === textHeight;

            if (regions && isSameSize) {
                regions.forEach(region => gl.texSubImage2D(gl.TEXTURE_2D, 0, region.x, region.y, gl.RGBA, gl.UNSIGNED_BYTE, region.canvas));
            } else if (isSameSize) {
                gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, layer.canvas);
            } else {
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, layer.canvas);
                textWidth = layer.canvas.width;
                textHeight = layer.canvas.height;
            }

            textVersion = layer.version;
            gl.generateMipmap(gl.TEXTURE_2D);

            const burn = layer.burn;

            if (burn.version !== burnVersion && burn.canvas.width > 0) {
                burnVersion = burn.version;
                gl.activeTexture(gl.TEXTURE3);
                gl.bindTexture(gl.TEXTURE_2D, burnTexture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, burn.canvas);
            }

            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        },

        /**
         * For every css pixel row of the results, when its line starts its
         * reveal, so the shader can wipe the lines in one after another.
         */
        uploadRows(results) {
            const height = Math.max(1, Math.min(8192, Math.ceil(results.height)));
            const rows = new Uint8Array(height * 4);
            const longestDelay = Math.max(.001, ...results.lines.map(line => line.delay));

            results.lines.forEach(line => {
                for (let row = Math.max(0, Math.floor(line.top)); row < Math.min(height, Math.ceil(line.bottom)); row++) {
                    rows[row * 4] = Math.round(line.delay / longestDelay * 255);
                    rows[row * 4 + 1] = 255;
                }
            });

            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, rowsTexture);
            gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, rows);

            return longestDelay;
        },

        draw(width, height, values) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, width, height);
            gl.useProgram(program);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, glassTexture);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, textTexture);
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, rowsTexture);
            gl.activeTexture(gl.TEXTURE3);
            gl.bindTexture(gl.TEXTURE_2D, burnTexture);

            gl.uniform1i(uniforms.uBurn, 3);
            gl.uniform4f(uniforms.uRing, ...values.ring);
            gl.uniform4f(uniforms.uBurnBox, ...values.burnBox);
            gl.uniform1i(uniforms.uGlass, 0);
            gl.uniform1i(uniforms.uText, 1);
            gl.uniform1i(uniforms.uRows, 2);
            gl.uniform2f(uniforms.uResolution, width, height);
            gl.uniform2f(uniforms.uScreen, ...values.screen);
            gl.uniform4f(uniforms.uPicture, ...values.picture);
            gl.uniform2f(uniforms.uPictureScale, ...values.pictureScale);
            gl.uniform3f(uniforms.uPictureShift, ...values.pictureShift);
            gl.uniform1f(uniforms.uCurve, values.curve);
            gl.uniform1f(uniforms.uFringe, values.fringe);
            gl.uniform1f(uniforms.uWarm, values.warm);
            gl.uniform1f(uniforms.uTextAlpha, values.textAlpha);
            gl.uniform1f(uniforms.uGlow, values.glow);
            gl.uniform4fv(uniforms.uLineA, values.lineA);
            gl.uniform4fv(uniforms.uLineB, values.lineB);
            gl.uniform4f(uniforms.uReveal, ...values.reveal);
            gl.uniform4f(uniforms.uRevealBox, ...values.revealBox);
            gl.uniform1f(uniforms.uScroll, values.scroll);
            gl.uniform1f(uniforms.uGhostScroll, values.ghostScroll);
            gl.uniform1f(uniforms.uGhostStrength, values.ghostStrength);
            gl.uniform4f(uniforms.uCaret, ...values.caret);
            gl.uniform4f(uniforms.uCaretColour, ...values.caretColour);

            gl.drawArrays(gl.TRIANGLES, 0, 3);
        },
    };
}
