import { approach } from '../crt/random.js';

/*
 * The room around the tube: rows of small indicator lights that switch on
 * and off at their own pace, like the walls of the room Mother is consulted
 * from. Drawn on a canvas around the screen; on every frame only the
 * lights that change are drawn again, so the fades stay smooth and cheap.
 */

const spacing = 26;

const colours = [
    { colour: [255, 236, 200], weight: .78 },
    { colour: [255, 190, 110], weight: .16 },
    { colour: [255, 110, 90], weight: .06 },
];

function pickColour() {
    let roll = Math.random();

    for (const { colour, weight } of colours) {
        if (roll < weight) {
            return colour;
        }

        roll -= weight;
    }

    return colours[0].colour;
}

export function createRoomLights(canvas, screen) {
    const context = canvas.getContext('2d');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    let lights = [];
    let ratio = 1;
    let frame = null;
    let lastFrameAt = null;

    function layout() {
        ratio = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(window.innerWidth * ratio);
        canvas.height = Math.round(window.innerHeight * ratio);

        const screenBox = screen.getBoundingClientRect();
        const margin = 18;

        lights = [];

        for (let y = spacing / 2; y < window.innerHeight; y += spacing) {
            for (let x = spacing / 2; x < window.innerWidth; x += spacing) {
                const isUnderScreen = x > screenBox.left - margin && x < screenBox.right + margin && y > screenBox.top - margin && y < screenBox.bottom + margin;

                if (isUnderScreen || Math.random() < .12) {
                    continue;
                }

                lights.push({
                    x,
                    y,
                    colour: pickColour(),
                    isOn: Math.random() < .45,
                    level: 0,
                    rate: .05 + Math.random() * .6,
                });
            }
        }

        lights.forEach(light => {
            light.level = light.isOn ? 1 : 0;
            light.drawnLevel = light.level;
        });

        draw();
    }

    function drawLight(light) {
        const [red, green, blue] = light.colour;
        const glow = .05 + light.level * .95;

        context.clearRect(light.x - 6, light.y - 6, 12, 12);

        context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${(glow * .16).toFixed(3)})`;
        context.beginPath();
        context.arc(light.x, light.y, 4.2, 0, Math.PI * 2);
        context.fill();

        context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${(.08 + light.level * .82).toFixed(3)})`;
        context.beginPath();
        context.arc(light.x, light.y, 1.6, 0, Math.PI * 2);
        context.fill();

        light.drawnLevel = light.level;
    }

    function draw() {
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);
        lights.forEach(drawLight);
    }

    /**
     * Every frame, a few lights switch at random and fade towards their new
     * state; only the lights that changed are drawn again.
     */
    function tick(now) {
        frame = requestAnimationFrame(tick);

        const delta = lastFrameAt === null ? 0 : Math.min(.1, (now - lastFrameAt) / 1000);

        lastFrameAt = now;

        lights.forEach(light => {
            if (Math.random() < light.rate * delta) {
                light.isOn = ! light.isOn;
            }

            light.level = approach(light.level, light.isOn ? 1 : 0, 14, delta);

            if (Math.abs(light.level - light.drawnLevel) > .004) {
                drawLight(light);
            }
        });
    }

    function start() {
        stop();

        if (reducedMotion.matches || document.hidden || ! canvas.offsetWidth) {
            return;
        }

        lastFrameAt = null;
        frame = requestAnimationFrame(tick);
    }

    function stop() {
        cancelAnimationFrame(frame);
        frame = null;
    }

    let resizeFrame = null;

    window.addEventListener('resize', () => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => {
            layout();
            start();
        });
    });

    document.addEventListener('visibilitychange', start);
    reducedMotion.addEventListener('change', start);

    if (! canvas.offsetWidth) {
        return;
    }

    layout();
    start();
}
