import { degaussWobble } from './crt/degauss.js';
import { followOutput } from './crt/follow-output.js';
import { fetchScreen, lookupUrl } from './crt/lookup.js';

const root = document.documentElement;
const announcer = document.getElementById('announcer');
const screenElement = document.getElementById('screen');

const phosphors = ['white', 'green', 'amber'];

const element = {
    content: () => document.getElementById('screen-content'),
    form: () => document.getElementById('form'),
    input: () => document.getElementById('url'),
    resolving: () => document.getElementById('resolving'),
    results: () => document.getElementById('results'),
};


let isAwake = true;

const output = followOutput(() => document.getElementById('screen-content'), () => document.getElementById('terminal'));
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

function hasFullMotion() {
    return ! prefersReducedMotion();
}

function remember(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (error) {
        // Storage can be unavailable in private browsing, preferences then last for this page only.
    }
}

function forget(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        // Storage can be unavailable in private browsing, there is nothing to forget then.
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

function setPhosphor(phosphor, { shouldAnnounce = false } = {}) {
    root.setAttribute('data-phosphor', phosphor);

    remember('crt-phosphor', phosphor);

    if (shouldAnnounce) {
        announce(`Phosphor switched to ${phosphor}.`);
    }
}

/**
 * The degauss: the glass adds a shimmer, the screen wobbles. The brightness
 * filter only runs for DOM text, as the shader paints the text otherwise.
 */
function degauss() {
    signal('degauss');
    degaussWobble(screenElement, { brighten: root.getAttribute('data-text') !== 'gl' });
}

let lastKeyAt = 0;
let isSwapping = false;

/**
 * Degausses at random moments, a few minutes apart, but never while someone
 * types, a lookup runs or its answer is drawn, and never with reduced motion.
 */
function scheduleDegauss(delay = 150000 + -Math.log(1 - Math.random()) * 150000) {
    setTimeout(() => {
        const isBusy = document.hidden || ! isAwake || lookupInProgress !== null || isSwapping || performance.now() - lastKeyAt < 4000;

        if (prefersReducedMotion()) {
            scheduleDegauss();

            return;
        }

        if (isBusy) {
            scheduleDegauss(5000 + Math.random() * 10000);

            return;
        }

        degauss();
        scheduleDegauss();
    }, delay);
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
    green: () => setPhosphor('green', { shouldAnnounce: true }),
    amber: () => setPhosphor('amber', { shouldAnnounce: true }),
    white: () => setPhosphor('white', { shouldAnnounce: true }),
    default: () => {
        setPhosphor('green');
        forget('crt-phosphor');
        report('Back to the default green phosphor.');
        announce('Back to the default green phosphor.');
    },
    time: () => {
        const date = new Date();
        const pad = value => String(value).padStart(2, '0');

        report(`${date.toDateString()}, ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`);
    },
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

/**
 * Once the glass shader paints the text, the DOM text is transparent and
 * only its opacity matters, so the decay skips the filter, which would
 * still be painted (slowly in Safari) for nothing.
 */
function decayFrame(opacity, brightness, blur) {
    if (root.getAttribute('data-text') === 'gl') {
        return { opacity };
    }

    return { opacity, filter: `brightness(${brightness}) blur(${blur}px)` };
}

async function swapScreen(screenPage) {
    isSwapping = true;

    const content = element.content();

    document.title = screenPage.title;

    const description = document.querySelector('meta[name="description"]');

    if (description && screenPage.description !== null) {
        description.setAttribute('content', screenPage.description);
    }

    const decay = hasFullMotion() && ! prefersReducedMotion()
        ? [
            decayFrame(1, 1, 0),
            { ...decayFrame(.55, 1.5, .4), offset: .25 },
            decayFrame(0, 1.1, 1.5),
        ]
        : [{ opacity: 1 }, { opacity: 0 }];

    await content.animate(decay, { duration: hasFullMotion() ? 320 : 180, easing: 'cubic-bezier(.3, 0, .6, 1)', fill: 'forwards' }).finished.catch(() => {});

    root.setAttribute('data-page', screenPage.page);

    const nextContent = document.adoptNode(screenPage.content);

    content.replaceWith(nextContent);
    nextContent.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.22, 1, .36, 1)' });

    mountContent();
    signal('lookup-end');
    setTimeout(() => {
        isSwapping = false;
    }, 1500);

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
    lastKeyAt = performance.now();

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

    output.follow();
    focusInput();
}

function init() {
    const phosphor = root.getAttribute('data-phosphor');

    root.setAttribute('data-power', 'on');
    setPhosphor(phosphors.indexOf(phosphor) === -1 ? 'green' : phosphor);
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', event => {
        root.setAttribute('data-motion', event.matches ? 'calm' : 'full');
    });

    history.replaceState({ crt: true }, '', window.location.href);


    mountContent();
    loadGlass();
    scheduleDegauss();
}

function loadGlass() {
    if (! ('WebGL2RenderingContext' in window)) {
        return;
    }

    import('./crt/glass.js')
        .then(({ createGlass }) => createGlass(screenElement, document.getElementById('picture')))
        .catch(() => {});
}

init();
