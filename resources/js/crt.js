import { degaussWobble } from './crt/degauss.js';
import { followOutput } from './crt/follow-output.js';
import { fetchScreen, lookupUrl } from './crt/lookup.js';
import { switchTheme } from './theme-shortcuts.js';

const root = document.documentElement;
const announcer = document.getElementById('announcer');
const screenElement = document.getElementById('screen');

const phosphors = ['white', 'green', 'amber'];

const element = {
    content: () => document.getElementById('screen-content'),
    form: () => document.getElementById('form'),
    history: () => document.getElementById('terminal-history'),
    input: () => document.getElementById('url'),
    resolving: () => document.getElementById('resolving'),
};

let isAwake = true;

const output = followOutput(() => document.getElementById('screen-content'), () => document.getElementById('terminal'));
let powerTimer = null;

function signal(type, detail = {}) {
    document.dispatchEvent(new CustomEvent('crt', { detail: { type, ...detail } }));
}

function restartClass(target, className, duration) {
    target.classList.remove(className);

    void target.offsetWidth;

    target.classList.add(className);

    return setTimeout(() => target.classList.remove(className), duration);
}
let lookupInProgress = null;
const snapshots = new Map();
let snapshotNumber = 0;
let textHandover = 0;
let shaderTextReady = false;

function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

/**
 * Degausses at random moments, a few minutes apart, but never while someone
 * types, a lookup runs or its answer is drawn, and never with reduced motion.
 */
function scheduleDegauss(delay = 150000 + -Math.log(1 - Math.random()) * 150000) {
    setTimeout(() => {
        const isBusy = document.hidden || ! isAwake || lookupInProgress !== null || performance.now() - lastKeyAt < 4000;

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

function saveSnapshot(url, method = 'pushState') {
    const snapshot = ++snapshotNumber;

    snapshots.set(snapshot, {
        html: element.history().innerHTML,
        title: document.title,
        description: document.querySelector('meta[name="description"]').getAttribute('content'),
        page: root.getAttribute('data-page'),
    });

    window.history[method]({ crt: true, snapshot }, '', url);
}

function showGrowingOutput() {
    textHandover++;
    root.setAttribute('data-output-stream', '');

    if (root.getAttribute('data-text') === 'gl') {
        shaderTextReady = true;
        root.removeAttribute('data-text');
    }
}

async function finishGrowingOutput() {
    if (! root.hasAttribute('data-output-stream')) {
        return;
    }

    const handover = ++textHandover;

    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    if (handover !== textHandover) {
        return;
    }

    if (shaderTextReady && root.getAttribute('data-crt') === 'gl') {
        root.setAttribute('data-text', 'gl');
    }

    root.removeAttribute('data-output-stream');
}

function restoreSnapshot(snapshot) {
    lookupInProgress = null;
    textHandover++;
    element.history().innerHTML = snapshot.html;
    document.title = snapshot.title;
    document.querySelector('meta[name="description"]').setAttribute('content', snapshot.description);
    root.setAttribute('data-page', snapshot.page);
    element.input().value = '';
    element.input().readOnly = false;
    report('');
    mountContent();
    signal('lookup-end');
    finishGrowingOutput();
}

function clearScreen() {
    lookupInProgress = null;
    textHandover++;
    element.history().replaceChildren();
    element.input().value = '';
    element.input().readOnly = false;
    report('');
    root.setAttribute('data-page', 'home');
    document.title = 'DNS records lookup ~ dnsrecords.io';
    document.querySelector('meta[name="description"]').setAttribute('content', "DNS record lookups just as you like 'em");
    saveSnapshot(element.form().getAttribute('action'));
    signal('lookup-end');
    finishGrowingOutput();
    output.follow({ smooth: false });
    focusInput();
}

function commandLine(command) {
    const line = document.createElement('div');
    const arrow = document.createElement('span');
    const value = document.createElement('span');

    line.className = 'prompt prompt--history';
    arrow.className = 'prompt__label';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '→';
    value.className = 'prompt__value';
    value.textContent = command;
    line.append(arrow, value);

    return line;
}

function addCopyButton(line) {
    if (! line.matches('.line--record') || line.querySelector('.line__copy')) {
        return;
    }

    const button = document.createElement('button');

    button.type = 'button';
    button.className = 'line__copy';
    button.setAttribute('aria-label', `Copy ${line.querySelector('.line__type').textContent} record value`);
    button.setAttribute('data-label', 'copy');
    line.appendChild(button);
}

async function appendScreen(screenPage, command, attempt) {
    document.title = screenPage.title;

    const description = document.querySelector('meta[name="description"]');

    if (description && screenPage.description !== null) {
        description.setAttribute('content', screenPage.description);
    }

    root.setAttribute('data-page', screenPage.page);
    report('');
    showGrowingOutput();

    const entries = document.adoptNode(screenPage.entries);
    const rows = Array.from(entries.querySelectorAll('.results__output')).flatMap(pre => {
        const lines = Array.from(pre.querySelectorAll(':scope > .line'));
        const resultRows = lines.map(line => ({
            pre,
            line,
            newline: line.nextSibling && line.nextSibling.nodeType === Node.TEXT_NODE ? line.nextSibling : null,
        }));

        pre.replaceChildren();

        return resultRows;
    });

    element.history().append(commandLine(command), ...entries.childNodes);

    element.input().value = '';

    mountContent({ smooth: false });

    const batchSize = Math.max(1, Math.ceil(rows.length / 20));

    for (let index = 0; index < rows.length; index += batchSize) {
        for (const { pre, line, newline } of rows.slice(index, index + batchSize)) {
            if (lookupInProgress !== attempt) {
                return false;
            }

            line.style.setProperty('--delay', '0ms');
            addCopyButton(line);
            pre.append(line, ...(newline ? [newline] : []));
        }

        if (! prefersReducedMotion() && index + batchSize < rows.length) {
            await new Promise(resolve => setTimeout(resolve, 45));
        }
    }

    if (lookupInProgress !== attempt) {
        return false;
    }

    signal('lookup-end', { progressive: true });
    await finishGrowingOutput();

    if (lookupInProgress !== attempt) {
        return false;
    }

    lookupInProgress = null;
    element.input().readOnly = false;
    focusInput();

    if (screenPage.announcement) {
        announce(screenPage.announcement);
    }

    return true;
}

async function lookup(command) {
    if (lookupInProgress !== null) {
        return;
    }

    const url = lookupUrl(element.form(), command);
    const attempt = Symbol('lookup');

    showResolving(command);
    signal('lookup-start');
    lookupInProgress = attempt;
    element.input().readOnly = true;

    const result = await fetchScreen(url);

    if (lookupInProgress !== attempt) {
        return;
    }

    if (result.type !== 'screen') {
        lookupInProgress = null;
        element.input().readOnly = false;
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

    if (! result.screen.entries) {
        window.location.assign(result.url);

        return;
    }

    if (! await appendScreen(result.screen, command, attempt)) {
        return;
    }

    saveSnapshot(result.url);
}

function run(command) {
    const trimmed = command.trim();

    if (trimmed === '') {
        return;
    }

    if (trimmed.toLowerCase() === 'clear') {
        clearScreen();

        return;
    }

    if (switchTheme(trimmed)) {
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

    const clearLink = event.target.closest('.results__actions a');

    if (clearLink) {
        event.preventDefault();
        clearScreen();

        return;
    }

    const copyAll = event.target.closest('.copy-results');

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
    const snapshot = event.state && snapshots.get(event.state.snapshot);

    if (snapshot) {
        restoreSnapshot(snapshot);

        return;
    }

    window.location.reload();
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
    const results = button.closest('.results').querySelector('.results__output');

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

function mountContent({ smooth = true } = {}) {
    const content = element.content();

    content.querySelectorAll('.copy-results').forEach(button => button.hidden = false);
    content.querySelectorAll('.line--record').forEach(addCopyButton);

    output.follow({ smooth });
    focusInput();
}

function init() {
    const phosphor = root.getAttribute('data-phosphor');

    root.setAttribute('data-power', 'on');
    setPhosphor(phosphors.indexOf(phosphor) === -1 ? 'green' : phosphor);
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', event => {
        root.setAttribute('data-motion', event.matches ? 'calm' : 'full');
    });

    mountContent();
    saveSnapshot(window.location.href, 'replaceState');
    loadGlass();
    scheduleDegauss();
}

function showPictureWithoutGlass() {
    root.removeAttribute('data-glass-pending');
    focusInput();
}

function loadGlass() {
    if (! ('WebGL2RenderingContext' in window)) {
        showPictureWithoutGlass();

        return;
    }

    import('./crt/glass.js')
        .then(({ createGlass }) => {
            if (! createGlass(screenElement, document.getElementById('picture'), focusInput)) {
                showPictureWithoutGlass();
            }
        })
        .catch(showPictureWithoutGlass);
}

init();
