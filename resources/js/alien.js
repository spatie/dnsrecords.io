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
    transcript: () => document.getElementById('transcript'),
    form: () => document.getElementById('form'),
    input: () => document.getElementById('url'),
    mirror: () => document.getElementById('inquiry-mirror'),
    status: () => document.getElementById('resolving'),
};

const underlineFlashDuration = 80;
const minimumProcessing = 420;
const typingGlyphInterval = 50;
const exitCommands = ['exit', 'home', 'terminal', 'default'];

let writing = null;
let booting = null;
let lookupInProgress = null;
let hasOverride = false;
let lastKeystrokeAt = 0;

/**
 * Following the answer, like the terminal: while Mother writes, the screen
 * scrolls along so the newest output stays in view, and the new prompt
 * after it. Scrolling up stops it, scrolling back to the bottom or a new
 * inquiry starts it again.
 */
const follow = { isOn: true, newest: null };

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

function latestExchange() {
    const exchanges = element.transcript().querySelectorAll('.exchange');

    return exchanges[exchanges.length - 1] || null;
}

function smallFontSize() {
    return parseFloat(getComputedStyle(element.transcript()).fontSize) || 16;
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

function scrollToEnd() {
    const content = element.content();
    const target = content.scrollHeight - content.clientHeight;

    if (target > content.scrollTop + 2) {
        content.scrollTo({ top: target, behavior: scrollBehavior() });
    }
}

/**
 * Scrolls along whenever a new line of the answer comes into view, so a
 * smooth scroll is not restarted on every frame.
 */
function followNewest(container) {
    const shown = container.querySelectorAll('.is-shown');
    const newest = shown[shown.length - 1] || null;
    const content = element.content();

    if (! follow.isOn || ! newest || newest === follow.newest) {
        return;
    }

    follow.newest = newest;

    const padding = parseFloat(getComputedStyle(content).paddingBottom) || 0;
    const bottom = newest.getBoundingClientRect().bottom - content.getBoundingClientRect().top + content.scrollTop;
    const target = Math.min(content.scrollHeight - content.clientHeight, bottom + padding - content.clientHeight);

    if (target > content.scrollTop + 2) {
        content.scrollTo({ top: target, behavior: scrollBehavior() });
    }
}

function restartFollowing() {
    follow.isOn = true;
    follow.newest = null;
}

function stopFollowing() {
    follow.isOn = false;
}

document.addEventListener('wheel', event => {
    if (event.deltaY < 0) {
        stopFollowing();
    }
}, { passive: true });

document.addEventListener('touchmove', stopFollowing, { passive: true });

document.addEventListener('keydown', event => {
    if (['ArrowUp', 'PageUp', 'Home'].includes(event.key) && ! event.target.closest('input, textarea')) {
        stopFollowing();
    }
});

document.addEventListener('scroll', event => {
    if (event.target === element.content() && isAtBottom(event.target)) {
        follow.isOn = true;
    }
}, true);

/**
 * The prompt for the next inquiry comes back under the answer, armed by a
 * beam like in the film, in view and focused.
 */
function showPrompt() {
    const form = element.form();

    form.classList.remove('is-busy');
    updateMirror();
    focusInput();

    if (follow.isOn) {
        scrollToEnd();
    }

    if (! prefersReducedMotion() && ! booting) {
        phosphor.beam(form.querySelector('.inquiry__field'));
    }
}

/**
 * Writes an answer. The prompt comes back once it is written, except under
 * the boot output, where it is there right away.
 */
function write(container) {
    finishWriting();

    const isBootOutput = ! container || container.classList.contains('exchange--boot');

    if (isBootOutput) {
        showPrompt();
    }

    if (! container) {
        return;
    }

    if (! isBootOutput) {
        element.form().classList.add('is-busy');
    }

    writing = writeOut(container, {
        instant: prefersReducedMotion(),
        onUpdate: edges => {
            sparkAround(edges);
            followNewest(container);
        },
        onDone: () => {
            container.querySelectorAll('[data-copy]').forEach(button => {
                button.hidden = false;
            });

            if (! isBootOutput) {
                showPrompt();
            }
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
 * Enters an inquiry, as in the film: it becomes a line of its own under a
 * ready line, its underline drawn hot for a moment, and the answer will be
 * written under it. Returns where the answer goes.
 */
function startTurn(inquiry) {
    const form = element.form();
    const input = element.input();
    const turn = document.createElement('section');
    const ready = document.createElement('p');
    const echo = document.createElement('p');
    const exchange = document.createElement('div');

    finishWriting();

    turn.className = 'turn';
    ready.className = 'mother-ready';
    ready.textContent = 'Interface 2037 ready for inquiry';
    echo.className = 'mother-echo';
    echo.textContent = inquiry;
    exchange.className = 'exchange';
    turn.append(ready, echo, exchange);
    element.transcript().append(turn);

    form.classList.add('is-busy');
    input.value = '';
    updateMirror();
    restartFollowing();
    scrollToEnd();

    if (! prefersReducedMotion()) {
        echo.classList.add('is-flashing');
        phosphor.flare(echo);
        setTimeout(() => echo.classList.remove('is-flashing'), underlineFlashDuration);
    }

    return exchange;
}

function respond(inquiry, responseLines) {
    const exchange = startTurn(inquiry);

    exchange.append(...responseLines.map((text, index) => line(text, { className: index > 0 ? 'mother-line--detail' : '' })));
    exchange.setAttribute('data-announce', `Response: ${responseLines.join(' ')}`);
    report('');
    write(exchange);
    announce(`Response: ${responseLines.join(' ')}`);
}

/**
 * The raw dig lines of the latest records on screen.
 */
function rawRecords(turn = null) {
    const recordSets = (turn || element.transcript()).querySelectorAll('.records');
    const records = recordSets[recordSets.length - 1];

    if (! records) {
        return '';
    }

    return Array.from(records.querySelectorAll('[data-raw]')).map(record => record.getAttribute('data-raw')).join('\n');
}

function copyText(text) {
    if (! text) {
        return Promise.reject(new Error('No records in memory.'));
    }

    if (! navigator.clipboard || ! navigator.clipboard.writeText) {
        return Promise.reject(new Error('Select the records and press Cmd+C or Ctrl+C.'));
    }

    return navigator.clipboard.writeText(text).catch(() => {
        throw new Error('Select the records and press Cmd+C or Ctrl+C.');
    });
}

function copyRecords(button) {
    copyText(rawRecords(button.closest('.turn'))).then(() => {
        announce('Records copied to your clipboard.');
        button.classList.add('is-copied');
        setTimeout(() => button.classList.remove('is-copied'), 1600);
    }, error => announce(error.message));
}

const chances = ['what are my chances', 'what are my chances?', 'what are our chances', 'what are our chances?'];

const localCommands = {
    copy: inquiry => copyText(rawRecords()).then(
        () => respond(inquiry, ['Records transferred to clipboard.']),
        error => respond(inquiry, ['Unable to comply.', error.message]),
    ),
    'emergency command override 100375': inquiry => {
        hasOverride = true;
        respond(inquiry, ['Override accepted.']);
    },
    'special order 937': inquiry => specialOrder(inquiry),
    'what is special order 937': inquiry => specialOrder(inquiry),
    'what is special order 937?': inquiry => specialOrder(inquiry),
    'request enhancement': inquiry => respond(inquiry, ['No further enhancement.', 'Special order 937.', 'Science officer eyes only.']),
};

chances.forEach(question => {
    localCommands[question] = inquiry => respond(inquiry, ['Does not compute.']);
});

exitCommands.forEach(command => {
    localCommands[command] = () => window.location.assign('/');
});

function specialOrder(inquiry) {
    if (! hasOverride) {
        respond(inquiry, ['Unable to clarify.', 'Special order 937.', 'Science officer eyes only.']);

        return;
    }

    respond(inquiry, [
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
 * While the records are fetched the space for the answer fills with noise,
 * like the start of the boot sequence in the film.
 */
function showProcessing(exchange) {
    report('Processing');

    if (prefersReducedMotion()) {
        return null;
    }

    const area = phosphor.localRect(exchange);
    const fontSize = smallFontSize();

    area.y += fontSize;
    area.height = Math.max(fontSize * 1.45 * 4, Math.min(fontSize * 1.45 * 10, screenElement.clientHeight - area.y - fontSize * 2));
    area.width = Math.max(area.width, screenElement.clientWidth * .6);

    return phosphor.noise(area, { intensity: .55, fontSize });
}

/**
 * Puts the answer from the server under the inquiry. A page without an
 * answer (after 'clear') wipes the screen instead.
 */
function placeAnswer(screenPage, exchange) {
    document.title = screenPage.title;

    const description = document.querySelector('meta[name="description"]');

    if (description && screenPage.description !== null) {
        description.setAttribute('content', screenPage.description);
    }

    root.setAttribute('data-page', screenPage.page);

    const nextTranscript = document.adoptNode(screenPage.content).querySelector('#transcript');
    const answer = nextTranscript ? nextTranscript.querySelector('.turn .exchange') : null;

    if (! answer) {
        element.transcript().replaceChildren(...(nextTranscript ? nextTranscript.childNodes : []));
        element.content().scrollTop = 0;
        restartFollowing();
        write(latestExchange());

        return;
    }

    exchange.append(...answer.childNodes);
    exchange.setAttribute('data-announce', answer.getAttribute('data-announce') || '');
    write(exchange);

    if (exchange.getAttribute('data-announce')) {
        announce(exchange.getAttribute('data-announce'));
    }
}

async function lookup(command) {
    const url = lookupUrl(element.form(), command);
    const attempt = Symbol('lookup');
    const exchange = startTurn(command);

    lookupInProgress = attempt;
    signal('processing-start');

    const startedAt = performance.now();
    const noise = showProcessing(exchange);
    const result = await fetchScreen(url);

    if (noise) {
        await wait(Math.max(0, minimumProcessing - (performance.now() - startedAt)));
        await noise.stop();
    }

    if (lookupInProgress !== attempt) {
        return;
    }

    lookupInProgress = null;
    report('');
    signal('processing-end');

    if (result.type === 'navigate') {
        window.location.assign(result.url);

        return;
    }

    if (result.type === 'message') {
        exchange.append(line(result.message));
        write(exchange);
        announce(result.message);

        return;
    }

    history.pushState({ mother: true }, '', result.url);
    placeAnswer(result.screen, exchange);
}

function run(command) {
    const inquiry = command.trim();

    finishBoot();

    if (inquiry === '' || lookupInProgress) {
        finishWriting();

        return;
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

    if (! selection || selection.isCollapsed || ! selection.rangeCount) {
        return;
    }

    const range = selection.getRangeAt(0);
    const records = Array.from(element.transcript().querySelectorAll('[data-raw]')).filter(record => selection.containsNode(record, true));

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
        run(commandButton.getAttribute('data-command'));

        return;
    }

    const copyButton = event.target.closest('[data-copy]');

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
 * Typing brings the prompt back into view when the screen was scrolled up.
 */
function revealPrompt() {
    const content = element.content();
    const form = element.form();

    if (form.getBoundingClientRect().bottom <= content.getBoundingClientRect().bottom) {
        return;
    }

    restartFollowing();
    scrollToEnd();
}

document.addEventListener('keydown', event => {
    if (! ['Shift', 'Alt', 'Control', 'Meta', 'Tab'].includes(event.key)) {
        finishBoot();
        finishWriting();
    }

    const input = element.input();

    if (event.key === '/' && document.activeElement !== input && ! event.target.closest('input, textarea')) {
        event.preventDefault();
        focusInput();

        return;
    }

    if (! input) {
        return;
    }

    const isPrintable = event.key.length === 1 && ! event.metaKey && ! event.ctrlKey && ! event.altKey;
    const selection = window.getSelection();
    const isElsewhere = document.activeElement !== input || selection.rangeCount === 0 || selection.toString() !== '';

    if (isPrintable && isElsewhere && ! event.target.closest('textarea, input:not(#url)')) {
        selection.removeAllRanges();
        input.focus({ preventScroll: true });
        input.setSelectionRange(input.value.length, input.value.length);
    }

    if (document.activeElement !== input) {
        return;
    }

    if (event.key === 'Escape') {
        input.value = '';
        updateMirror();

        return;
    }

    revealPrompt();
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
 * While typing the cursor block stays lit and dark overstruck glyphs
 * flicker inside it, the film's cursor; at rest it blinks.
 */
function startCursor() {
    let lastChangeAt = 0;

    const tick = now => {
        requestAnimationFrame(tick);

        const mirror = element.mirror();
        const cursor = mirror?.querySelector('.inquiry__cursor');

        if (! cursor) {
            return;
        }

        const isTyping = ! prefersReducedMotion() && now - lastKeystrokeAt < 700;

        if (mirror.classList.contains('is-typing') !== isTyping) {
            mirror.classList.toggle('is-typing', isTyping);
        }

        if (! isTyping || now - lastChangeAt < typingGlyphInterval) {
            return;
        }

        lastChangeAt = now;
        cursor.setAttribute('data-a', randomGlyph());
        cursor.setAttribute('data-b', randomGlyph());
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
        const candidates = Array.from(document.querySelectorAll('.mother-ready, .mother-echo, .matrix__title, .mother-line, .records > .record, .roots__row'))
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
    if (event.state && event.state.mother) {
        window.location.reload();
    }
});

/**
 * Switching the screen on, as in the film: a burst of noise over the whole
 * screen, then Mother writes and a beam arms the prompt. Any key, click or
 * tap skips straight to the end, and the prompt takes typing from the very
 * first moment.
 */
function bootArea() {
    const transcript = phosphor.localRect(element.transcript());
    const top = transcript.y + (parseFloat(getComputedStyle(element.transcript()).paddingTop) || 0);
    const width = screenElement.clientWidth;
    const height = screenElement.clientHeight;

    return { x: transcript.x, y: top, width: width - transcript.x * 2, height: Math.max(height * .5, height - top * 1.6) };
}

async function boot() {
    const content = element.content();
    const isResult = root.getAttribute('data-page') === 'result';
    const noise = phosphor.noise(bootArea(), { duration: isResult ? .55 : .9, intensity: 1, fontSize: smallFontSize() });

    let isOnScreen = false;

    const showScreen = () => {
        if (isOnScreen) {
            return;
        }

        isOnScreen = true;
        booting = null;
        content.classList.remove('is-booting');
        write(latestExchange());
    };

    content.classList.add('is-booting');
    root.classList.remove('mother-boot');

    booting = () => {
        phosphor.stopAll();
        showScreen();
    };

    await noise.done;
    showScreen();
}

function mount() {
    if (prefersReducedMotion()) {
        root.classList.remove('mother-boot');
        write(latestExchange());
    } else {
        boot();
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
