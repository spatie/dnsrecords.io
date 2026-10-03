import { fetchScreen, lookupUrl } from './crt/lookup.js';

const root = document.documentElement;
const announcer = document.getElementById('announcer');
const screenElement = document.getElementById('screen');
const fxToggle = document.getElementById('fx-toggle');
const phosphorToggle = document.getElementById('phosphor-toggle');
const clock = document.getElementById('clock');

const phosphors = ['white', 'green', 'amber'];

const element = {
    content: () => document.getElementById('screen-content'),
    form: () => document.getElementById('form'),
    input: () => document.getElementById('url'),
    resolving: () => document.getElementById('resolving'),
    results: () => document.getElementById('results'),
};


let isAwake = true;
let powerTimer = null;

function signal(type) {
    document.dispatchEvent(new CustomEvent('crt', { detail: { type } }));
}

function restartClass(target, className, duration) {
    target.classList.remove(className);

    void target.offsetWidth;

    target.classList.add(className);

    return setTimeout(() => target.classList.remove(className), duration);
}
let lookupInProgress = null;

function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

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

function fadeIn(target, duration = 360) {
    target.animate([{ opacity: 0, transform: 'translateY(3px)' }, { opacity: 1, transform: 'none' }], {
        duration,
        easing: 'cubic-bezier(.22, 1, .36, 1)',
    });
}

function report(message) {
    const resolving = element.resolving();

    if (! resolving) {
        return;
    }

    resolving.textContent = message;

    if (message !== '') {
        fadeIn(resolving);
    }
}

function focusInput() {
    const input = element.input();

    if (input && document.activeElement !== input) {
        input.focus({ preventScroll: true });
    }
}

function setFx(isEnabled) {
    root.setAttribute('data-fx', isEnabled ? 'on' : 'off');
    fxToggle.setAttribute('aria-pressed', String(isEnabled));
    fxToggle.textContent = isEnabled ? 'fx on' : 'fx off';

    remember('crt-fx', isEnabled ? 'on' : 'off');
}

function setPhosphor(phosphor, { shouldAnnounce = false } = {}) {
    root.setAttribute('data-phosphor', phosphor);

    remember('crt-phosphor', phosphor);

    phosphorToggle.textContent = phosphor;

    if (shouldAnnounce) {
        announce(`Phosphor switched to ${phosphor}.`);
    }
}

/**
 * A springy wobble with a brief shimmer of colour, a wink at the degauss
 * button of old monitors.
 */
function degauss() {
    signal('degauss');

    if (prefersReducedMotion() || ! isFxEnabled()) {
        screenElement.animate([{ filter: 'none' }, { filter: 'brightness(1.4)' }, { filter: 'none' }], { duration: 900, easing: 'ease-in-out' });
        announce('Degaussed.');

        return;
    }

    const keyframes = [];
    const frames = 40;

    for (let frame = 0; frame <= frames; frame++) {
        const progress = frame / frames;
        const amplitude = Math.exp(-4.2 * progress) * (1 - Math.exp(-progress * 30));

        keyframes.push({
            transform: `skewX(${(Math.sin(progress * Math.PI * 7) * 1.4 * amplitude).toFixed(3)}deg) scale(${(1 + Math.sin(progress * Math.PI * 5) * .006 * amplitude).toFixed(4)})`,
            filter: `brightness(${(1 + Math.abs(Math.sin(progress * Math.PI * 6)) * .5 * amplitude).toFixed(3)})`,
        });
    }

    screenElement.animate(keyframes, { duration: 1600, easing: 'linear' });
    announce('Degaussed.');
}

function setAwake(isOn) {
    if (isOn === isAwake) {
        return;
    }

    isAwake = isOn;
    clearTimeout(powerTimer);

    if (isOn) {
        screenElement.classList.remove('is-powering-off');
        root.setAttribute('data-power', 'on');
        powerTimer = restartClass(screenElement, 'is-powering-on', 1000);
        announce('Display is awake.');
        focusInput();

        return;
    }

    screenElement.classList.remove('is-powering-on');
    powerTimer = restartClass(screenElement, 'is-powering-off', 1100);
    setTimeout(() => {
        if (! isAwake) {
            root.setAttribute('data-power', 'off');
        }
    }, 600);

    announce('Display is asleep. Press any key to wake it.');
}

const localCommands = {
    degauss: () => degauss(),
    green: () => setPhosphor('green', { shouldAnnounce: true }),
    amber: () => setPhosphor('amber', { shouldAnnounce: true }),
    white: () => setPhosphor('white', { shouldAnnounce: true }),
    'fx on': () => {
        setFx(true);
        report('Effects on.');
    },
    'fx off': () => {
        setFx(false);
        report('Effects off.');
    },
    fx: () => localCommands[isFxEnabled() ? 'fx off' : 'fx on'](),
    'power off': () => setAwake(false),
    sleep: () => setAwake(false),
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

function showResolving(command) {
    const resolving = element.resolving();

    if (! resolving) {
        return;
    }

    const label = document.createElement('span');
    const dots = document.createElement('span');

    label.textContent = `Resolving ${command}`;
    dots.className = 'resolving__dots';
    dots.setAttribute('aria-hidden', 'true');
    dots.innerHTML = '<i></i><i></i><i></i>';

    resolving.replaceChildren(label, dots);
    fadeIn(resolving, 300);
}

async function swapScreen(screenPage) {
    const content = element.content();

    document.title = screenPage.title;

    const description = document.querySelector('meta[name="description"]');

    if (description && screenPage.description !== null) {
        description.setAttribute('content', screenPage.description);
    }

    const decay = isFxEnabled() && ! prefersReducedMotion()
        ? [
            { opacity: 1, filter: 'brightness(1) blur(0px)' },
            { opacity: .55, filter: 'brightness(1.5) blur(.4px)', offset: .25 },
            { opacity: 0, filter: 'brightness(1.1) blur(1.5px)' },
        ]
        : [{ opacity: 1 }, { opacity: 0 }];

    await content.animate(decay, { duration: isFxEnabled() ? 320 : 180, easing: 'cubic-bezier(.3, 0, .6, 1)', fill: 'forwards' }).finished.catch(() => {});

    root.setAttribute('data-page', screenPage.page);

    const nextContent = document.adoptNode(screenPage.content);

    content.replaceWith(nextContent);
    nextContent.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.22, 1, .36, 1)' });

    mountContent();
    signal('lookup-end');

    if (screenPage.announcement) {
        announce(screenPage.announcement);
    }
}

async function lookup(command) {
    const url = lookupUrl(element.form(), command);
    const attempt = Symbol('lookup');

    showResolving(command);
    signal('lookup-start');
    lookupInProgress = attempt;

    const result = await fetchScreen(url);

    if (lookupInProgress !== attempt) {
        return;
    }

    lookupInProgress = null;

    if (result.type !== 'screen') {
        signal('lookup-end');
    }

    if (result.type === 'navigate') {
        window.location.assign(result.url);

        return;
    }

    if (result.type === 'message') {
        report(result.message);
        announce(result.message);

        return;
    }

    history.pushState({ crt: true }, '', result.url);

    await swapScreen(result.screen);
}

function run(command) {
    const trimmed = command.trim();

    if (trimmed === '') {
        return;
    }

    if (runLocalCommand(trimmed.toLowerCase())) {
        const input = element.input();

        if (input) {
            input.value = '';
        }

        return;
    }

    lookup(trimmed);
}

document.addEventListener('submit', event => {
    if (event.target.id !== 'form') {
        return;
    }

    event.preventDefault();
    run(element.input().value);
});

document.addEventListener('click', event => {
    const commandButton = event.target.closest('[data-command]');

    if (commandButton) {
        const input = element.input();

        if (input) {
            input.value = commandButton.getAttribute('data-command');
        }

        run(commandButton.getAttribute('data-command'));

        return;
    }

    const copyAll = event.target.closest('#copy-results');

    if (copyAll) {
        copyResults(copyAll);

        return;
    }

    const copyLine = event.target.closest('.line__copy');

    if (copyLine) {
        const value = copyLine.parentNode.querySelector('.line__value');

        copyText(value ? value.textContent.trim() : '', copyLine, () => {
            copyLine.setAttribute('data-label', 'copied');
            setTimeout(() => {
                copyLine.setAttribute('data-label', 'copy');
                copyLine.classList.remove('is-copied');
            }, 1400);
        });
    }
});

window.addEventListener('popstate', event => {
    if (event.state && event.state.crt) {
        fetchScreen(window.location.href).then(result => {
            if (result.type !== 'screen') {
                window.location.reload();

                return;
            }

            swapScreen(result.screen);
        });
    }
});

function copyText(text, trigger, onCopied) {
    const confirm = () => {
        trigger.classList.add('is-copied');
        onCopied();
        announce('Copied to your clipboard.');
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(confirm, () => report('Select the text and press Cmd+C or Ctrl+C to copy.'));

        return;
    }

    report('Select the text and press Cmd+C or Ctrl+C to copy.');
}

function copyResults(button) {
    const results = element.results();

    if (! results) {
        return;
    }

    const label = button.querySelector('.action__label');

    copyText(results.textContent.replace(/\n$/, ''), button, () => {
        label.textContent = 'copied';

        setTimeout(() => {
            button.classList.remove('is-copied');
            label.textContent = 'copy all';
        }, 1600);
    });
}

function isTextSelected() {
    return window.getSelection && window.getSelection().toString() !== '';
}

document.getElementById('screen').addEventListener('click', event => {
    if (event.target.closest('a, button, input, label')) {
        return;
    }

    setTimeout(() => {
        if (! isTextSelected()) {
            focusInput();
        }
    }, 200);
});

document.addEventListener('keydown', event => {
    const input = element.input();

    if (! isAwake && ['Tab', 'Shift', 'Alt', 'Control', 'Meta'].indexOf(event.key) === -1) {
        setAwake(true);

        return;
    }

    if (event.key === '/' && document.activeElement !== input && ! event.target.closest('input, textarea')) {
        event.preventDefault();
        focusInput();

        return;
    }

    if (event.key === 'Escape' && input && document.activeElement === input && input.value !== '') {
        input.value = '';
    }
});

fxToggle.addEventListener('click', () => {
    setFx(! isFxEnabled());
    announce(isFxEnabled() ? 'Effects on.' : 'Effects off.');
});

phosphorToggle.addEventListener('click', () => {
    const current = phosphors.indexOf(root.getAttribute('data-phosphor'));

    setPhosphor(phosphors[(current + 1) % phosphors.length], { shouldAnnounce: true });
});

function tickClock() {
    const date = new Date();
    const pad = value => String(value).padStart(2, '0');

    clock.textContent = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function mountContent() {
    const content = element.content();
    const copyButton = document.getElementById('copy-results');

    if (copyButton) {
        copyButton.hidden = false;
    }

    content.querySelectorAll('.line--record').forEach(line => {
        if (line.querySelector('.line__copy')) {
            return;
        }

        const button = document.createElement('button');

        button.type = 'button';
        button.className = 'line__copy';
        button.setAttribute('aria-label', `Copy ${line.querySelector('.line__type').textContent} record value`);
        button.setAttribute('data-label', 'copy');
        line.appendChild(button);
    });

    content.scrollTop = 0;
    focusInput();
}

function init() {
    const phosphor = root.getAttribute('data-phosphor');

    root.setAttribute('data-power', 'on');
    setPhosphor(phosphors.indexOf(phosphor) === -1 ? 'white' : phosphor);
    fxToggle.setAttribute('aria-pressed', String(isFxEnabled()));
    fxToggle.textContent = isFxEnabled() ? 'fx on' : 'fx off';

    history.replaceState({ crt: true }, '', window.location.href);

    tickClock();
    setInterval(tickClock, 10000);

    mountContent();
    loadGlass();
}

function loadGlass() {
    if (! ('WebGL2RenderingContext' in window)) {
        return;
    }

    const load = () => import('./crt/glass.js')
        .then(({ createGlass }) => createGlass(screenElement, document.getElementById('picture')))
        .catch(() => {});

    const whenIdle = callback => ('requestIdleCallback' in window ? window.requestIdleCallback(callback, { timeout: 1200 }) : setTimeout(callback, 300));

    if (document.readyState === 'complete') {
        whenIdle(load);

        return;
    }

    window.addEventListener('load', () => whenIdle(load), { once: true });
}

init();
