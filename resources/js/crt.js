const root = document.documentElement;
const screen = document.getElementById('screen');
const picture = document.getElementById('picture');
const content = document.getElementById('screen-content');
const form = document.getElementById('form');
const input = document.getElementById('url');
const cursor = document.getElementById('cursor');
const resolving = document.getElementById('resolving');
const announcer = document.getElementById('announcer');
const results = document.getElementById('results');
const copyButton = document.getElementById('copy-results');
const fxToggle = document.getElementById('fx-toggle');
const degaussButton = document.getElementById('degauss');
const powerButton = document.getElementById('power');
const clock = document.getElementById('clock');
const bootLog = document.getElementById('boot-log');
const phosphorOptions = Array.prototype.slice.call(document.querySelectorAll('[data-phosphor-option]'));

const phosphors = ['green', 'amber', 'white'];

let fxLayer = null;
let isLoadingFxLayer = false;
let isPoweredOn = true;
let glitchTimer = null;
let finishBoot = null;
let characterWidth = 0;

function isFxEnabled() {
    return root.getAttribute('data-fx') === 'on';
}

function remember(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (error) {
        // Storage can be unavailable in private browsing, preferences then last for this page only.
    }
}

function announce(message) {
    announcer.textContent = '';

    setTimeout(() => {
        announcer.textContent = message;
    }, 30);
}

function report(message) {
    resolving.textContent = message;
}

function whenIdle(callback) {
    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(callback, { timeout: 2500 });

        return;
    }

    setTimeout(callback, 1200);
}

function pulse(className, duration) {
    screen.classList.remove(className);

    void screen.offsetWidth;

    screen.classList.add(className);

    setTimeout(() => screen.classList.remove(className), duration);
}

function glitch(intensity = 1) {
    if (! isFxEnabled() || ! isPoweredOn) {
        return;
    }

    pulse('is-glitching', 240);

    if (fxLayer) {
        fxLayer.burst(intensity);
    }
}

function scheduleIdleGlitch() {
    clearTimeout(glitchTimer);

    if (! isFxEnabled()) {
        return;
    }

    glitchTimer = setTimeout(() => {
        if (! document.hidden) {
            glitch(.6);
        }

        scheduleIdleGlitch();
    }, 12000 + Math.random() * 14000);
}

function loadFxLayer() {
    if (fxLayer) {
        fxLayer.start();

        return;
    }

    if (isLoadingFxLayer || ! window.WebGLRenderingContext) {
        return;
    }

    isLoadingFxLayer = true;

    import('./crt-fx.js').then(({ createCrtFxLayer }) => {
        fxLayer = createCrtFxLayer(screen);

        if (fxLayer && isFxEnabled() && isPoweredOn) {
            fxLayer.start();
        }
    });
}

function setFx(isEnabled) {
    root.setAttribute('data-fx', isEnabled ? 'on' : 'off');
    fxToggle.setAttribute('aria-pressed', String(isEnabled));

    remember('crt-fx', isEnabled ? 'on' : 'off');

    if (! isEnabled) {
        clearTimeout(glitchTimer);

        if (fxLayer) {
            fxLayer.stop();
        }

        return;
    }

    loadFxLayer();
    scheduleIdleGlitch();
}

function setPhosphor(phosphor, shouldGlitch = true) {
    root.setAttribute('data-phosphor', phosphor);

    remember('crt-phosphor', phosphor);

    phosphorOptions.forEach(option => {
        option.setAttribute('aria-pressed', String(option.getAttribute('data-phosphor-option') === phosphor));
    });

    if (fxLayer) {
        fxLayer.refreshColor();
    }

    measureCharacterWidth();

    if (shouldGlitch) {
        glitch(.5);
    }
}

function degauss() {
    if (! isPoweredOn) {
        return;
    }

    if (! isFxEnabled()) {
        report('Degaussed. Turn effects on to see the wobble.');

        return;
    }

    pulse('is-degaussing', 1500);

    if (fxLayer) {
        fxLayer.burst(1.4);
    }

    announce('Degaussed.');
}

function setPower(isOn) {
    if (isOn === isPoweredOn) {
        return;
    }

    isPoweredOn = isOn;
    powerButton.setAttribute('aria-pressed', String(isOn));

    if (! isOn) {
        clearTimeout(glitchTimer);

        if (fxLayer) {
            fxLayer.stop();
        }

        if (! isFxEnabled()) {
            screen.classList.add('is-off');
            announce('Screen off. Press any key to turn it back on.');

            return;
        }

        pulse('is-powering-off', 450);
        setTimeout(() => screen.classList.add('is-off'), 430);
        announce('Screen off. Press any key to turn it back on.');

        return;
    }

    screen.classList.remove('is-off');

    if (isFxEnabled()) {
        pulse('is-powering-on', 700);
        loadFxLayer();
        scheduleIdleGlitch();
    }

    announce('Screen on.');
    input.focus();
}

function measureCharacterWidth() {
    const canvas = measureCharacterWidth.canvas || (measureCharacterWidth.canvas = document.createElement('canvas'));
    const context = canvas.getContext('2d');
    const style = window.getComputedStyle(input);

    context.font = `${style.fontSize} ${style.fontFamily}`;
    characterWidth = context.measureText('0000000000').width / 10;

    updateCursor();
}

function updateCursor() {
    if (! characterWidth) {
        return;
    }

    const caretPosition = input.selectionStart === null ? input.value.length : input.selectionStart;
    const hasSelection = input.selectionStart !== input.selectionEnd;
    const left = caretPosition * characterWidth - input.scrollLeft;

    cursor.style.width = `${characterWidth}px`;
    cursor.style.transform = `translateX(${left}px)`;
    cursor.style.visibility = hasSelection || left > input.clientWidth ? 'hidden' : 'visible';
}

function stripIds(element) {
    element.removeAttribute('id');

    Array.prototype.forEach.call(element.querySelectorAll('[id]'), child => child.removeAttribute('id'));
}

function tearScreen() {
    const tear = document.createElement('div');
    const slices = [];

    tear.className = 'tear';
    tear.setAttribute('aria-hidden', 'true');
    tear.setAttribute('inert', '');

    for (let index = 0; index < 6; index++) {
        const slice = document.createElement('div');
        const copy = content.cloneNode(true);

        stripIds(copy);
        slice.className = 'tear__slice';
        slice.appendChild(copy);
        tear.appendChild(slice);
        slices.push({ slice, copy });
    }

    picture.appendChild(tear);

    slices.forEach(({ copy }) => {
        copy.scrollTop = content.scrollTop;

        const copiedInput = copy.querySelector('input');

        if (copiedInput) {
            copiedInput.value = input.value;
        }
    });

    let frame = 0;

    const shuffle = () => {
        slices.forEach(({ slice }) => {
            const top = Math.random() * 90;
            const height = 2 + Math.random() * 12;
            const shift = (Math.random() - .5) * 60;

            slice.style.clipPath = `inset(${top}% 0 ${Math.max(0, 100 - top - height)}% 0)`;
            slice.style.transform = `translateX(${shift}px)`;
        });

        frame++;

        if (frame > 7) {
            clearInterval(interval);
            tear.remove();
        }
    };

    const interval = setInterval(shuffle, 70);

    shuffle();

    if (fxLayer) {
        fxLayer.burst(1.2);
    }
}

const localCommands = {
    degauss: () => degauss(),
    green: () => setPhosphor('green'),
    amber: () => setPhosphor('amber'),
    white: () => setPhosphor('white'),
    'fx on': () => {
        setFx(true);
        report('Effects on.');
    },
    'fx off': () => {
        setFx(false);
        report('Effects off.');
    },
    fx: () => localCommands[isFxEnabled() ? 'fx off' : 'fx on'](),
    'power off': () => setPower(false),
};

function runLocalCommand(command) {
    if (! Object.prototype.hasOwnProperty.call(localCommands, command)) {
        return false;
    }

    localCommands[command]();

    if (phosphors.indexOf(command) !== -1) {
        report(`Phosphor switched to ${command}.`);
    }

    return true;
}

function startSpinner(command) {
    const frames = ['|', '/', '-', '\\'];
    let frame = 0;

    const render = () => {
        resolving.textContent = `resolving ${command} ${frames[frame++ % frames.length]}`;
    };

    render();

    return setInterval(render, 120);
}

let spinner = null;

form.addEventListener('submit', event => {
    event.preventDefault();

    const command = input.value.trim();

    if (command === '') {
        glitch(.4);

        return;
    }

    if (runLocalCommand(command.toLowerCase())) {
        input.value = '';
        updateCursor();

        return;
    }

    const lookupBaseUrl = form.getAttribute('action').replace(/\/$/, '');

    form.action = `${lookupBaseUrl}/${command}`;

    clearInterval(spinner);
    spinner = startSpinner(command);

    if (isFxEnabled()) {
        tearScreen();
    }

    form.submit();
});

window.addEventListener('pageshow', event => {
    if (! event.persisted) {
        return;
    }

    clearInterval(spinner);
    resolving.textContent = '';

    Array.prototype.forEach.call(document.querySelectorAll('.tear'), tear => tear.remove());
});

function isTextSelected() {
    return window.getSelection && window.getSelection().toString() !== '';
}

screen.addEventListener('click', event => {
    if (event.target.closest('a, button, input, label')) {
        return;
    }

    setTimeout(() => {
        if (! isTextSelected()) {
            input.focus({ preventScroll: true });
        }
    }, 200);
});

['input', 'keyup', 'click', 'focus', 'select', 'scroll'].forEach(eventName => {
    input.addEventListener(eventName, updateCursor);
});

input.addEventListener('keydown', () => setTimeout(updateCursor, 0));

if (copyButton && results) {
    copyButton.hidden = false;

    copyButton.addEventListener('click', () => {
        const text = results.textContent.replace(/\n$/, '');

        const confirm = () => {
            copyButton.textContent = 'copied';
            announce('DNS records copied to your clipboard.');
            glitch(.4);

            setTimeout(() => {
                copyButton.textContent = 'copy records';
            }, 1600);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(confirm, () => selectResults());

            return;
        }

        selectResults();
    });
}

function selectResults() {
    const range = document.createRange();

    range.selectNodeContents(results);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);

    report('Records selected, press Ctrl+C or Cmd+C to copy.');
}

function finishTyping() {
    if (results) {
        results.classList.add('is-typed');
    }
}

document.addEventListener('keydown', event => {
    if (finishBoot) {
        finishBoot();

        return;
    }

    finishTyping();

    if (! isPoweredOn && event.key !== 'Tab' && event.key !== 'Shift') {
        event.preventDefault();
        setPower(true);

        return;
    }

    if (event.key === '/' && document.activeElement !== input) {
        event.preventDefault();
        input.focus();

        return;
    }

    if (event.key === 'Escape' && document.activeElement === input && input.value !== '') {
        input.value = '';
        updateCursor();
    }
});

document.addEventListener('pointerdown', () => {
    if (finishBoot) {
        finishBoot();
    }

    finishTyping();
});

fxToggle.addEventListener('click', () => {
    setFx(! isFxEnabled());
    announce(isFxEnabled() ? 'Effects on.' : 'Effects off.');
});

degaussButton.addEventListener('click', degauss);

powerButton.addEventListener('click', () => setPower(! isPoweredOn));

phosphorOptions.forEach(option => {
    option.addEventListener('click', () => {
        const phosphor = option.getAttribute('data-phosphor-option');

        setPhosphor(phosphor);
        announce(`Phosphor switched to ${phosphor}.`);
    });
});

function tickClock() {
    const now = new Date();
    const pad = value => String(value).padStart(2, '0');

    clock.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function runBoot() {
    if (root.getAttribute('data-boot') !== 'pending') {
        return Promise.resolve();
    }

    root.setAttribute('data-boot', 'running');

    try {
        sessionStorage.setItem('crt-booted', '1');
    } catch (error) {
        // Without session storage the boot sequence simply plays on every visit.
    }

    const phosphor = root.getAttribute('data-phosphor');
    const script = [
        { text: 'spatie DR-9000 colour terminal', wait: 380 },
        { text: 'bios 4.04, (c) 1989 spatie systems antwerp', wait: 120 },
        { text: '', wait: 60 },
        { text: 'memory test ....... ', wait: 60, count: 640 },
        { text: `phosphor .......... ${phosphor}, warm`, wait: 180 },
        { text: 'root hints ........ 13 servers', wait: 200 },
        { text: 'resolver .......... online', wait: 160 },
        { text: '', wait: 80 },
        { text: 'ready.', wait: 360 },
    ];

    return new Promise(resolve => {
        const timers = [];
        let elapsed = 0;

        const done = () => {
            timers.forEach(timer => clearTimeout(timer));
            finishBoot = null;
            root.setAttribute('data-boot', 'done');
            bootLog.textContent = '';
            pulse('is-glitching', 240);
            resolve();
        };

        finishBoot = done;

        pulse('is-powering-on', 700);
        elapsed += 450;

        script.forEach(line => {
            elapsed += line.wait;

            timers.push(setTimeout(() => {
                bootLog.textContent += line.text;

                if (! line.count) {
                    bootLog.textContent += '\n';

                    return;
                }

                const base = bootLog.textContent;

                [128, 256, 384, 512, 640].forEach((kilobytes, index) => {
                    timers.push(setTimeout(() => {
                        bootLog.textContent = `${base}${kilobytes}K${kilobytes === line.count ? ' ok\n' : ''}`;
                    }, index * 55));
                });
            }, elapsed));

            if (line.count) {
                elapsed += 300;
            }
        });

        timers.push(setTimeout(done, elapsed + 350));
    });
}

function init() {
    const phosphor = root.getAttribute('data-phosphor');

    setPhosphor(phosphors.indexOf(phosphor) === -1 ? 'amber' : phosphor, false);
    fxToggle.setAttribute('aria-pressed', String(isFxEnabled()));

    cursor.parentNode.parentNode.classList.add('has-block-cursor');

    tickClock();
    setInterval(tickClock, 1000);

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(measureCharacterWidth);
    }

    window.addEventListener('resize', measureCharacterWidth);

    runBoot().then(() => {
        input.focus({ preventScroll: true });
        updateCursor();
    });

    if (isFxEnabled()) {
        scheduleIdleGlitch();

        window.addEventListener('load', () => whenIdle(loadFxLayer));
    }
}

init();
