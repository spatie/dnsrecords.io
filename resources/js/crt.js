import { fetchScreen, lookupUrl } from './crt/lookup.js';

const root = document.documentElement;
const announcer = document.getElementById('announcer');
const windowElement = document.getElementById('window');
const windowTitle = document.getElementById('window-title');
const fxToggle = document.getElementById('fx-toggle');
const phosphorOptions = Array.prototype.slice.call(document.querySelectorAll('[data-phosphor-option]'));

const phosphors = ['white', 'green', 'amber'];

const element = {
    content: () => document.getElementById('screen-content'),
    form: () => document.getElementById('form'),
    input: () => document.getElementById('url'),
    resolving: () => document.getElementById('resolving'),
    results: () => document.getElementById('results'),
};

const copyIcon = '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M7 6.5V4.75A1.75 1.75 0 0 1 8.75 3h6.5A1.75 1.75 0 0 1 17 4.75v6.5A1.75 1.75 0 0 1 15.25 13H13.5M4.75 7h6.5A1.75 1.75 0 0 1 13 8.75v6.5A1.75 1.75 0 0 1 11.25 17h-6.5A1.75 1.75 0 0 1 3 15.25v-6.5A1.75 1.75 0 0 1 4.75 7z"/></svg>';
const checkIcon = '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4.5 10.5l3.5 3.5 7.5-8" stroke="#30d158"/></svg>';

let isAwake = true;
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

    remember('crt-fx', isEnabled ? 'on' : 'off');
}

function setPhosphor(phosphor, { shouldAnnounce = false } = {}) {
    root.setAttribute('data-phosphor', phosphor);

    remember('crt-phosphor', phosphor);

    phosphorOptions.forEach(option => {
        option.setAttribute('aria-checked', String(option.getAttribute('data-phosphor-option') === phosphor));
    });

    if (shouldAnnounce) {
        announce(`Terminal colour switched to ${phosphor}.`);
    }
}

/**
 * A springy wobble with a brief shimmer of colour, a wink at the degauss
 * button of old monitors.
 */
function degauss() {
    if (prefersReducedMotion() || ! isFxEnabled()) {
        windowElement.animate([{ filter: 'none' }, { filter: 'hue-rotate(40deg) saturate(1.4)' }, { filter: 'none' }], { duration: 900, easing: 'ease-in-out' });
        announce('Degaussed.');

        return;
    }

    const keyframes = [];
    const frames = 40;

    for (let frame = 0; frame <= frames; frame++) {
        const progress = frame / frames;
        const amplitude = Math.exp(-4.2 * progress) * (1 - Math.exp(-progress * 30));

        keyframes.push({
            transform: `rotate(${(Math.sin(progress * Math.PI * 7) * .6 * amplitude).toFixed(3)}deg) scale(${(1 + Math.sin(progress * Math.PI * 5) * .008 * amplitude).toFixed(4)})`,
            filter: `hue-rotate(${(Math.sin(progress * Math.PI * 6) * 60 * amplitude).toFixed(1)}deg)`,
        });
    }

    windowElement.animate(keyframes, { duration: 1600, easing: 'linear' });
    announce('Degaussed.');
}

function setAwake(isOn) {
    if (isOn === isAwake) {
        return;
    }

    isAwake = isOn;
    root.setAttribute('data-power', isOn ? 'on' : 'off');

    if (isOn) {
        announce('Display is awake.');
        focusInput();

        return;
    }

    announce('Display is asleep. Press any key to wake it.');
}

const localCommands = {
    degauss: () => degauss(),
    green: () => setPhosphor('green', { shouldAnnounce: true }),
    amber: () => setPhosphor('amber', { shouldAnnounce: true }),
    white: () => setPhosphor('white', { shouldAnnounce: true }),
    'fx on': () => {
        setFx(true);
        report('Glow and motion are on.');
    },
    'fx off': () => {
        setFx(false);
        report('Glow and motion are off.');
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
        report(`Terminal colour switched to ${command}.`);
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

    await content.animate([
        { opacity: 1, transform: 'none' },
        { opacity: 0, transform: 'translateY(-4px)' },
    ], { duration: 180, easing: 'cubic-bezier(.4, 0, 1, 1)', fill: 'forwards' }).finished.catch(() => {});

    root.setAttribute('data-page', screenPage.page);

    const nextContent = document.adoptNode(screenPage.content);

    content.replaceWith(nextContent);
    nextContent.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.22, 1, .36, 1)' });

    mountContent();

    if (screenPage.announcement) {
        announce(screenPage.announcement);
    }
}

async function lookup(command) {
    const url = lookupUrl(element.form(), command);
    const attempt = Symbol('lookup');

    showResolving(command);
    lookupInProgress = attempt;

    const result = await fetchScreen(url);

    if (lookupInProgress !== attempt) {
        return;
    }

    lookupInProgress = null;

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
            copyLine.innerHTML = checkIcon;
            setTimeout(() => {
                copyLine.innerHTML = copyIcon;
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
        label.textContent = 'Copied';

        setTimeout(() => {
            button.classList.remove('is-copied');
            label.textContent = 'Copy all';
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
    announce(isFxEnabled() ? 'Glow and motion are on.' : 'Glow and motion are off.');
});

phosphorOptions.forEach(option => {
    option.addEventListener('click', () => setPhosphor(option.getAttribute('data-phosphor-option'), { shouldAnnounce: true }));

    option.addEventListener('keydown', event => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];

        if (! step) {
            return;
        }

        event.preventDefault();

        const next = phosphorOptions[(phosphorOptions.indexOf(option) + step + phosphorOptions.length) % phosphorOptions.length];

        next.focus();
        setPhosphor(next.getAttribute('data-phosphor-option'), { shouldAnnounce: true });
    });
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
        button.innerHTML = copyIcon;
        line.appendChild(button);
    });

    if (windowTitle) {
        windowTitle.textContent = content.getAttribute('data-title') || 'dnsrecords.io';
        fadeIn(windowTitle, 400);
    }

    content.scrollTop = 0;
    focusInput();
}

function init() {
    const phosphor = root.getAttribute('data-phosphor');

    root.setAttribute('data-power', 'on');
    setPhosphor(phosphors.indexOf(phosphor) === -1 ? 'white' : phosphor);
    fxToggle.setAttribute('aria-pressed', String(isFxEnabled()));

    history.replaceState({ crt: true }, '', window.location.href);

    mountContent();
}

init();
