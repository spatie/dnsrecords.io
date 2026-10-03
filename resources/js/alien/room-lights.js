/*
 * The room around the tube: rows of small indicator lights that switch on
 * and off at their own pace, like the walls of the room Mother is consulted
 * from. Drawn on a canvas a few times a second, only around the screen.
 */

const spacing = 26;
const framesPerSecond = 8;

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
    let timer = null;

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
        });

        draw();
    }

    function draw() {
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);

        lights.forEach(({ x, y, colour, level }) => {
            const [red, green, blue] = colour;
            const glow = .05 + level * .95;

            context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${(glow * .16).toFixed(3)})`;
            context.beginPath();
            context.arc(x, y, 4.2, 0, Math.PI * 2);
            context.fill();

            context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${(.08 + level * .82).toFixed(3)})`;
            context.beginPath();
            context.arc(x, y, 1.6, 0, Math.PI * 2);
            context.fill();
        });
    }

    function tick() {
        const delta = 1 / framesPerSecond;

        lights.forEach(light => {
            if (Math.random() < light.rate * delta) {
                light.isOn = ! light.isOn;
            }

            light.level += ((light.isOn ? 1 : 0) - light.level) * .7;
        });

        draw();
    }

    function start() {
        stop();

        if (reducedMotion.matches || document.hidden || ! canvas.offsetWidth) {
            return;
        }

        timer = setInterval(tick, 1000 / framesPerSecond);
    }

    function stop() {
        clearInterval(timer);
        timer = null;
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
