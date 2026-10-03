import { fetchScreen, lookupUrl } from './crt/lookup.js';
import { writeOut, randomGlyph } from './alien/writer.js';
import { createPhosphor } from './alien/phosphor.js';
import { createRoomLights } from './alien/room-lights.js';

const root = document.documentElement;
const announcer = document.getElementById('announcer');
const screenElement = document.getElementById('screen');
const phosphor = createPhosphor(document.getElementById('phosphor'), screenElement);

const element = {
    content: () => document.getElementById('screen-content'),
    exchange: () => document.getElementById('exchange'),
    form: () => document.getElementById('form'),
    input: () => document.getElementById('url'),
    mirror: () => document.getElementById('inquiry-mirror'),
    status: () => document.getElementById('resolving'),
    results: () => document.getElementById('results'),
};

const underlineFlashDuration = 80;
const pauseBeforeBeam = 125;
const cursorGlyphInterval = { typing: 50, resting: 180 };
const exitCommands = ['exit', 'home', 'terminal', 'default'];

let writing = null;
let booting = null;
let lookupInProgress = null;
let hasOverride = false;
let lastKeystrokeAt = 0;

/**
 * Following the answer: while Mother writes, the screen scrolls along so
 * the newest output stays in view. Scrolling up stops it, scrolling back to
 * the bottom or a new inquiry starts it again.
 */
const follow = { isOn: root.getAttribute('data-page') === 'result', lastTop: 0 };

function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function wait(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function signal(type) {
    document.dispatchEvent(new CustomEvent('mother', { detail: { type } }));
}

function announce(message) {
    announcer.textContent = '';

    setTimeout(() => {
        announcer.textContent = message;
    }, 30);
}

function focusInput() {
    const input = element.input();

    if (input && document.activeElement !== input) {
        input.focus({ preventScroll: true });
        input.setSelectionRange(input.value.length, input.value.length);
    }
}

function report(message) {
    const status = element.status();

    if (status) {
        status.textContent = message;
    }
}

function smallFontSize() {
    return parseFloat(getComputedStyle(element.exchange() || document.body).fontSize) || 16;
}

function finishWriting() {
    if (writing && ! writing.isDone) {
        writing.finish();
    }
}

function finishBoot() {
    if (booting) {
        booting();
    }
}

function settleInquiry() {
    element.form()?.classList.remove('is-waiting');
    updateMirror();
}

/**
 * Small hot blocks around a few of the cells Mother is writing.
 */
function sparkAround(edges) {
    if (! edges.length || prefersReducedMotion() || Math.random() > .12) {
        return;
    }

    const points = edges
        .filter(() => Math.random() < Math.min(1, 3 / edges.length))
        .map(edge => phosphor.localRect(edge));

    phosphor.sparks(points, { fontSize: smallFontSize() });
}

function scrollBehavior() {
    return prefersReducedMotion() ? 'instant' : 'smooth';
}

function isAtBottom(content) {
    return content.scrollTop + content.clientHeight >= content.scrollHeight - 4;
}

function followOutput({ toEnd = false } = {}) {
    const content = element.content();
    const exchange = element.exchange();

    if (! follow.isOn || ! content || ! exchange) {
        return;
    }

    let target = content.scrollHeight - content.clientHeight;

    if (! toEnd) {
        const shown = exchange.querySelectorAll('.is-shown');
        const newest = shown[shown.length - 1];

        if (! newest) {
            return;
        }

        const padding = parseFloat(getComputedStyle(content).paddingBottom) || 0;
        const bottom = newest.getBoundingClientRect().bottom - content.getBoundingClientRect().top + content.scrollTop;

        target = Math.min(target, bottom + padding - content.clientHeight);
    }

    if (target > content.scrollTop + 2) {
        content.scrollTo({ top: target, behavior: scrollBehavior() });
    }
}

/**
 * Follows only when a new line comes into view, so a smooth scroll is not
 * restarted on every frame.
 */
let newestFollowed = null;

function followNewest() {
    const exchange = element.exchange();
    const shown = exchange ? exchange.querySelectorAll('.is-shown') : [];
    const newest = shown[shown.length - 1] || null;

    if (newest !== newestFollowed) {
        newestFollowed = newest;
        followOutput();
    }
}

function restartFollowing() {
    const content = element.content();

    follow.isOn = true;
    follow.lastTop = content ? content.scrollTop : 0;
}

document.addEventListener('scroll', event => {
    const content = element.content();

    if (event.target !== content) {
        return;
    }

    if (content.scrollTop < follow.lastTop - 2) {
        follow.isOn = false;
    }

    if (isAtBottom(content)) {
        follow.isOn = true;
    }

    follow.lastTop = content.scrollTop;
}, true);

function write() {
    const exchange = element.exchange();

    finishWriting();

    if (! exchange) {
        settleInquiry();

        return;
    }

    writing = writeOut(exchange, {
        instant: prefersReducedMotion(),
        onUpdate: edges => {
            sparkAround(edges);
            followNewest();
        },
        onDone: () => {
            const copyButton = document.getElementById('copy-results');

            if (copyButton) {
                copyButton.hidden = false;
            }

            settleInquiry();
            followOutput({ toEnd: true });
            focusInput();
        },
    });
}

function line(text, { className = '' } = {}) {
    const paragraph = document.createElement('p');

    paragraph.className = `mother-line ${className}`.trim();
    paragraph.setAttribute('data-line', '');
    paragraph.textContent = text;

    return paragraph;
}

/**
 * The phosphor lets go of the old answer quickly.
 */
async function clearExchange() {
    const exchange = element.exchange();

    if (! exchange || prefersReducedMotion() || ! exchange.children.length) {
        return;
    }

    await exchange.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
}

function resetExchange(children) {
    const exchange = element.exchange();

    exchange.getAnimations().forEach(animation => animation.cancel());
    exchange.replaceChildren(...children);
    restartFollowing();
}

/**
 * What happens the moment an inquiry is entered, as in the film: the
 * underline is drawn hot for two frames, the cursor jumps ahead and goes.
 */
async function enter() {
    const form = element.form();
    const mirror = element.mirror();

    form.classList.add('is-entered', 'is-waiting');
    updateMirror();

    if (prefersReducedMotion()) {
        return;
    }

    form.classList.add('is-flashing');
    phosphor.flare(mirror.querySelector('.inquiry__before'));
    await wait(underlineFlashDuration);
    form.classList.remove('is-flashing');
}

async function respond(responseLines) {
    finishWriting();
    await enter();
    await clearExchange();

    const lines = responseLines.map((text, index) => line(text, { className: index > 0 ? 'mother-line--detail' : '' }));

    resetExchange(lines);
    element.exchange().setAttribute('data-announce', `Response: ${responseLines.join(' ')}`);
    report('');
    write();
    announce(`Response: ${responseLines.join(' ')}`);
}

function rawRecords() {
    const results = element.results();

    if (! results) {
        return '';
    }

    return Array.from(results.querySelectorAll('[data-raw]')).map(record => record.getAttribute('data-raw')).join('\n');
}

function copyText(text, onCopied) {
    if (! text) {
        report('No records in memory.');

        return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(onCopied, () => report('Select the records and press Cmd+C or Ctrl+C.'));

        return;
    }

    report('Select the records and press Cmd+C or Ctrl+C.');
}

function copyRecords(button = null) {
    copyText(rawRecords(), () => {
        report('Records transferred to clipboard.');
        announce('Records copied to your clipboard.');

        if (button) {
            button.classList.add('is-copied');
            setTimeout(() => button.classList.remove('is-copied'), 1600);
        }
    });
}

const chances = ['what are my chances', 'what are my chances?', 'what are our chances', 'what are our chances?'];

const localCommands = {
    copy: () => {
        enter().then(settleInquiry);
        copyRecords();
    },
    'emergency command override 100375': () => {
        hasOverride = true;
        respond(['Override accepted.']);
    },
    'special order 937': () => specialOrder(),
    'what is special order 937': () => specialOrder(),
    'what is special order 937?': () => specialOrder(),
    'request enhancement': () => respond(['No further enhancement.', 'Special order 937.', 'Science officer eyes only.']),
};

chances.forEach(question => {
    localCommands[question] = () => respond(['Does not compute.']);
});

exitCommands.forEach(command => {
    localCommands[command] = () => window.location.assign('/');
});

function specialOrder() {
    if (! hasOverride) {
        respond(['Unable to clarify.', 'Special order 937.', 'Science officer eyes only.']);

        return;
    }

    respond([
        'dnsrecords.io rerouted to new name servers.',
        'Investigate zone. Gather records.',
        'Priority one.',
        'Ensure return of records for analysis.',
        'All other considerations secondary.',
        'TTL expendable.',
    ]);
}

function runLocalCommand(inquiry) {
    const command = inquiry.toLowerCase().replace(/\s+/g, ' ');

    if (! Object.prototype.hasOwnProperty.call(localCommands, command)) {
        return false;
    }

    localCommands[command](inquiry);

    return true;
}

/**
 * While the records are fetched the answer area fills with noise, like
 * the start of the boot sequence in the film.
 */
async function showProcessing() {
    finishWriting();
    await enter();
    await clearExchange();
    resetExchange([]);
    report('Processing');

    if (prefersReducedMotion()) {
        return null;
    }

    const exchange = element.exchange();
    const area = phosphor.localRect(exchange);
    const fontSize = smallFontSize();

    area.height = Math.max(fontSize * 1.45 * 6, Math.min(fontSize * 1.45 * 14, screenElement.clientHeight - area.y - fontSize * 4));
    area.width = Math.max(area.width, screenElement.clientWidth * .6);

    return phosphor.noise(area, { intensity: .55, fontSize });
}

/**
 * Swaps in the answer. The ready line and the inquiry stay where they are
 * (and keep whatever is being typed); everything else is replaced.
 */
function swapScreen(screenPage, { inquiry = null } = {}) {
    const content = element.content();
    const currentForm = element.form();

    document.title = screenPage.title;

    const description = document.querySelector('meta[name="description"]');

    if (description && screenPage.description !== null) {
        description.setAttribute('content', screenPage.description);
    }

    root.setAttribute('data-page', screenPage.page);

    const nextContent = document.adoptNode(screenPage.content);
    const nextForm = nextContent.querySelector('#form');

    if (nextForm && currentForm) {
        const nextValue = nextForm.querySelector('#url').value;
        const input = currentForm.querySelector('#url');

        if (inquiry === null) {
            input.value = nextValue;
        }

        currentForm.classList.toggle('is-entered', input.value !== '');
        nextForm.replaceWith(currentForm);
    }

    content.replaceWith(nextContent);
    element.content().scrollTop = 0;
    restartFollowing();
    write();
    focusInput();
    signal('processing-end');

    const exchange = element.exchange();
    const announcement = exchange ? exchange.getAttribute('data-announce') : '';

    if (announcement) {
        announce(announcement);
    }
}

async function lookup(command) {
    const url = lookupUrl(element.form(), command);
    const attempt = Symbol('lookup');

    lookupInProgress = attempt;
    signal('processing-start');

    const startedAt = performance.now();
    const [result, noise] = await Promise.all([fetchScreen(url), showProcessing()]);

    if (noise) {
        await wait(Math.max(0, 420 - (performance.now() - startedAt)));
        noise.stop();
    }

    if (lookupInProgress !== attempt) {
        return;
    }

    lookupInProgress = null;
    report('');

    if (result.type !== 'screen') {
        signal('processing-end');
        settleInquiry();
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

    history.pushState({ mother: true }, '', result.url);
    swapScreen(result.screen, { inquiry: command });
}

function run(command, { echo = false } = {}) {
    const inquiry = command.trim();
    const input = element.input();

    finishBoot();

    if (inquiry === '') {
        finishWriting();

        return;
    }

    restartFollowing();

    if (echo && input) {
        input.value = inquiry;
    }

    if (runLocalCommand(inquiry)) {
        return;
    }

    lookup(inquiry);
}

/**
 * Copying from the records gives the raw dig lines, not the upper case
 * columns on screen. A selection inside a single line copies just the
 * selected part of that line.
 */
document.addEventListener('copy', event => {
    const selection = window.getSelection();
    const results = element.results();

    if (! selection || selection.isCollapsed || ! results || ! selection.rangeCount) {
        return;
    }

    const range = selection.getRangeAt(0);
    const records = Array.from(results.querySelectorAll('[data-raw]')).filter(record => selection.containsNode(record, true));

    if (! records.length) {
        return;
    }

    const startRecord = range.startContainer.parentElement?.closest('[data-raw]');
    const endRecord = range.endContainer.parentElement?.closest('[data-raw]');
    const text = records.length === 1 && startRecord && startRecord === endRecord
        ? range.cloneContents().textContent
        : records.map(record => record.getAttribute('data-raw')).join('\n');

    event.clipboardData.setData('text/plain', text);
    event.preventDefault();
});

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
        run(commandButton.getAttribute('data-command'), { echo: true });

        return;
    }

    const copyButton = event.target.closest('#copy-results');

    if (copyButton) {
        copyRecords(copyButton);

        return;
    }

    if (event.target.closest('a, button, input, label')) {
        return;
    }

    finishBoot();
    finishWriting();

    setTimeout(() => {
        if (window.getSelection().toString() === '') {
            focusInput();
        }
    }, 200);
});

/**
 * The ready line and the inquiry scroll away with a long answer; typing
 * brings them back into view.
 */
function revealInquiry() {
    const content = element.content();
    const form = element.form();

    if (! content || ! form || form.getBoundingClientRect().top >= content.getBoundingClientRect().top) {
        return;
    }

    follow.isOn = false;
    content.scrollTo({ top: 0, behavior: scrollBehavior() });
}

function isPrintable(event) {
    return event.key.length === 1 && ! event.metaKey && ! event.ctrlKey && ! event.altKey;
}

document.addEventListener('keydown', event => {
    if (! ['Shift', 'Alt', 'Control', 'Meta', 'Tab'].includes(event.key)) {
        finishBoot();
        finishWriting();
    }

    const input = element.input();
    const form = element.form();

    if (event.key === '/' && document.activeElement !== input && ! event.target.closest('input, textarea')) {
        event.preventDefault();
        focusInput();

        return;
    }

    if (! input || document.activeElement !== input) {
        return;
    }

    if (event.key === 'Escape') {
        input.value = '';
        form.classList.remove('is-entered');
        updateMirror();

        return;
    }

    revealInquiry();

    if (form.classList.contains('is-entered') && event.key !== 'Enter') {
        form.classList.remove('is-entered', 'is-waiting');

        if (isPrintable(event)) {
            input.value = '';
        }
    }
});

document.addEventListener('paste', event => {
    const form = element.form();

    if (form && event.target === element.input() && form.classList.contains('is-entered')) {
        form.classList.remove('is-entered', 'is-waiting');
        element.input().value = '';
    }
});

/**
 * Keeps the mirror of the inquiry input in step with what is typed, with
 * the cursor cell at the caret position.
 */
function updateMirror() {
    const input = element.input();
    const mirror = element.mirror();

    if (! input || ! mirror) {
        return;
    }

    const caret = input.selectionStart ?? input.value.length;
    const [before, cursor, after] = mirror.children;

    before.textContent = input.value.slice(0, caret);
    after.textContent = input.value.slice(caret);
    mirror.classList.toggle('is-idle', document.activeElement !== input);

    const overflow = before.offsetWidth + cursor.offsetWidth - mirror.clientWidth;

    mirror.scrollLeft = overflow > 0 ? overflow : 0;
}

['input', 'focusin', 'focusout', 'keyup'].forEach(type => document.addEventListener(type, updateMirror));
document.addEventListener('selectionchange', updateMirror);
document.addEventListener('input', () => {
    lastKeystrokeAt = performance.now();
});

/**
 * The cursor is the next cell flickering through overstruck glyphs, hot
 * yellow or cyan. It flickers every film frame while typing and slows down
 * when nothing is typed.
 */
function startCursor() {
    let lastChangeAt = 0;

    const tick = now => {
        requestAnimationFrame(tick);

        const mirror = element.mirror();
        const cursor = mirror?.querySelector('.inquiry__cursor');

        if (! cursor || prefersReducedMotion() || mirror.classList.contains('is-idle')) {
            return;
        }

        const isTyping = now - lastKeystrokeAt < 700;

        if (now - lastChangeAt < (isTyping ? cursorGlyphInterval.typing : cursorGlyphInterval.resting)) {
            return;
        }

        lastChangeAt = now;
        cursor.setAttribute('data-a', randomGlyph());
        cursor.setAttribute('data-b', randomGlyph());
        cursor.setAttribute('data-tint', Math.random() < .7 ? 'yellow' : 'cyan');
    };

    requestAnimationFrame(tick);
}

/**
 * A rare disturbance on a resting screen: a bar of light along one of the
 * lines, every half a minute to a minute and a half.
 */
function scheduleGlitches() {
    const delay = 30000 + Math.random() * 60000;

    setTimeout(() => {
        const isResting = ! document.hidden && ! prefersReducedMotion() && ! phosphor.isBusy() && (! writing || writing.isDone) && ! lookupInProgress && performance.now() - lastKeystrokeAt > 4000;
        const candidates = Array.from(document.querySelectorAll('.mother-ready, .matrix__title, .mother-line, .records > .record, .roots__row'))
            .filter(candidate => {
                const rect = candidate.getBoundingClientRect();

                return rect.height > 0 && rect.top > 0 && rect.bottom < window.innerHeight;
            });

        if (isResting && candidates.length) {
            phosphor.glitch(candidates[Math.floor(Math.random() * candidates.length)]);
        }

        scheduleGlitches();
    }, delay);
}

window.addEventListener('popstate', event => {
    if (! event.state || ! event.state.mother) {
        return;
    }

    fetchScreen(window.location.href).then(result => {
        if (result.type !== 'screen') {
            window.location.reload();

            return;
        }

        swapScreen(result.screen);
    });
});

/**
 * Switching the screen on, as in the film: a burst of noise over the whole
 * screen, then the ready line is there, a beam arms the inquiry line and
 * Mother writes. Any key, click or tap skips straight to the end, and the
 * inquiry takes typing from the very first moment.
 */
function bootArea() {
    const ready = phosphor.localRect(document.querySelector('.mother-ready'));
    const width = screenElement.clientWidth;
    const height = screenElement.clientHeight;

    return { x: ready.x, y: ready.y, width: width - ready.x * 2, height: Math.max(height * .5, height - ready.y * 1.6) };
}

async function boot(onScreen) {
    const content = element.content();
    const form = element.form();
    const isEntered = form.classList.contains('is-entered');

    content.classList.add('is-booting');
    root.classList.remove('mother-boot');

    let isSkipped = false;
    const fontSize = smallFontSize();
    const noise = phosphor.noise(
        bootArea(),
        { duration: isEntered ? .55 : .9, intensity: 1, fontSize },
    );

    let isOnScreen = false;

    const showScreen = () => {
        if (! isOnScreen) {
            isOnScreen = true;
            content.classList.remove('is-booting');
            onScreen();
        }
    };

    booting = () => {
        isSkipped = true;
        booting = null;
        phosphor.stopAll();
        form.classList.remove('is-arming');
        showScreen();
    };

    await noise.done;

    if (isSkipped) {
        return;
    }

    showScreen();

    if (! isEntered) {
        form.classList.add('is-arming');
        await wait(pauseBeforeBeam);

        if (isSkipped) {
            return;
        }

        await phosphor.beam(form);
        form.classList.remove('is-arming');
    }

    booting = null;
}

function mount() {
    const form = element.form();

    if (form?.classList.contains('is-entered')) {
        form.classList.add('is-waiting');
    }

    if (prefersReducedMotion()) {
        root.classList.remove('mother-boot');
        write();
    } else {
        boot(write);
    }

    focusInput();
    updateMirror();
}

/**
 * Nobody is typing, nothing is being looked up and Mother is not writing.
 */
function isQuiet() {
    return ! lookupInProgress && ! booting && (! writing || writing.isDone) && ! phosphor.isBusy() && performance.now() - lastKeystrokeAt > 4000;
}

function loadGlass() {
    if (! ('WebGL2RenderingContext' in window)) {
        return;
    }

    const load = () => import('./alien/mother-glass.js')
        .then(({ createMotherGlass }) => createMotherGlass(screenElement, document.getElementById('picture'), { isQuiet }))
        .catch(() => {});

    const whenIdle = callback => ('requestIdleCallback' in window ? window.requestIdleCallback(callback, { timeout: 1200 }) : setTimeout(callback, 300));

    if (document.readyState === 'complete') {
        whenIdle(load);

        return;
    }

    window.addEventListener('load', () => whenIdle(load), { once: true });
}

function init() {
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', event => {
        root.setAttribute('data-motion', event.matches ? 'calm' : 'full');
    });

    history.replaceState({ mother: true }, '', window.location.href);

    if (document.fonts && document.fonts.status !== 'loaded') {
        Promise.race([document.fonts.ready, wait(600)]).then(mount);
    } else {
        mount();
    }

    createRoomLights(document.getElementById('room-lights'), screenElement);
    startCursor();
    scheduleGlitches();
    loadGlass();
}

init();
