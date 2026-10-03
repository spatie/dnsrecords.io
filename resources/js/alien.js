import { fetchScreen, lookupUrl } from './crt/lookup.js';
import { typeOut } from './alien/typewriter.js';
import { createRoomLights } from './alien/room-lights.js';

const root = document.documentElement;
const announcer = document.getElementById('announcer');
const screenElement = document.getElementById('screen');

const element = {
    content: () => document.getElementById('screen-content'),
    exchange: () => document.getElementById('exchange'),
    form: () => document.getElementById('form'),
    input: () => document.getElementById('url'),
    status: () => document.getElementById('resolving'),
    results: () => document.getElementById('results'),
};

let typing = null;
let lookupInProgress = null;
let hasOverride = false;

function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    }
}

function report(message) {
    const status = element.status();

    if (status) {
        status.classList.remove('mother-processing');
        status.textContent = message;
    }
}

function finishTyping() {
    if (typing && ! typing.isDone) {
        typing.finish();
    }
}

function type({ skip = null } = {}) {
    const exchange = element.exchange();

    finishTyping();

    if (! exchange) {
        return;
    }

    typing = typeOut(exchange, {
        skip,
        instant: prefersReducedMotion(),
        onDone: () => {
            const copyButton = document.getElementById('copy-results');

            if (copyButton) {
                copyButton.hidden = false;
            }
        },
    });
}

function line(text, { label = null, attributes = {} } = {}) {
    const paragraph = document.createElement('p');

    paragraph.className = 'mother-line';
    paragraph.setAttribute('data-line', '');
    Object.entries(attributes).forEach(([name, value]) => paragraph.setAttribute(name, value));

    if (label) {
        const labelElement = document.createElement('span');

        labelElement.className = 'mother-label';
        labelElement.textContent = label;
        paragraph.append(labelElement, ' ');
    }

    paragraph.append(text);

    return paragraph;
}

function inquiryLine(inquiry) {
    const paragraph = line('', { label: 'Inquiry', attributes: { 'data-inquiry': '' } });
    const echo = document.createElement('span');

    paragraph.classList.add('mother-line--inquiry');
    echo.className = 'mother-line__echo';
    echo.textContent = inquiry;
    paragraph.append(echo);

    return paragraph;
}

/**
 * Clears the screen the way a phosphor does: the old picture lingers a
 * moment and fades, then the new one is written.
 */
async function clearScreen(target) {
    if (! target || prefersReducedMotion()) {
        return;
    }

    await target.animate([
        { opacity: 1, filter: 'brightness(1) blur(0)' },
        { opacity: .5, filter: 'brightness(1.35) blur(.3px)', offset: .2 },
        { opacity: 0, filter: 'brightness(1) blur(1.2px)' },
    ], { duration: 360, easing: 'cubic-bezier(.3, 0, .6, 1)', fill: 'forwards' }).finished.catch(() => {});
}

async function respond(inquiry, responseLines) {
    const exchange = element.exchange();

    finishTyping();
    await clearScreen(exchange);

    const lines = [inquiryLine(inquiry)];

    responseLines.forEach((text, index) => lines.push(line(text, { label: index === 0 ? 'Response' : null })));
    lines.slice(2).forEach(paragraph => paragraph.classList.add('mother-line--detail'));
    lines.push(line('Interface 2037 ready for inquiry', { attributes: { class: 'mother-line mother-line--ready' } }));

    exchange.getAnimations().forEach(animation => animation.cancel());
    exchange.replaceChildren(...lines);
    exchange.setAttribute('data-announce', `Response: ${responseLines.join(' ')}`);
    report('');
    type();
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
    copy: () => copyRecords(),
    terminal: () => window.location.assign('/'),
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

async function showProcessing(inquiry) {
    const exchange = element.exchange();

    finishTyping();
    await clearScreen(exchange);

    exchange.getAnimations().forEach(animation => animation.cancel());
    exchange.replaceChildren(inquiryLine(inquiry));
    type();

    const status = element.status();

    if (status) {
        status.textContent = 'Processing';
        status.classList.add('mother-processing');
    }
}

async function swapScreen(screenPage) {
    const content = element.content();

    document.title = screenPage.title;

    const description = document.querySelector('meta[name="description"]');

    if (description && screenPage.description !== null) {
        description.setAttribute('content', screenPage.description);
    }

    root.setAttribute('data-page', screenPage.page);

    const nextContent = document.adoptNode(screenPage.content);
    const currentInquiry = content.querySelector('[data-inquiry] .mother-line__echo');
    const nextInquiry = nextContent.querySelector('[data-inquiry] .mother-line__echo');
    const isSameInquiry = currentInquiry && nextInquiry && currentInquiry.textContent.trim().toLowerCase() === nextInquiry.textContent.trim().toLowerCase();

    if (! isSameInquiry) {
        await clearScreen(content.querySelector('#exchange'));
    }

    content.replaceWith(nextContent);
    mountContent({ skip: isSameInquiry ? '[data-inquiry]' : null });
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

    const [result] = await Promise.all([
        fetchScreen(url),
        showProcessing(command),
    ]);

    if (lookupInProgress !== attempt) {
        return;
    }

    lookupInProgress = null;

    if (result.type !== 'screen') {
        signal('processing-end');
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

    await swapScreen(result.screen);
}

function run(command) {
    const inquiry = command.trim();
    const input = element.input();

    if (inquiry === '') {
        finishTyping();

        return;
    }

    if (input) {
        input.value = '';
        updateMirror();
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
        run(commandButton.getAttribute('data-command'));

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

    if (typing && ! typing.isDone) {
        finishTyping();
    }

    setTimeout(() => {
        if (window.getSelection().toString() === '') {
            focusInput();
        }
    }, 200);
});

document.addEventListener('keydown', event => {
    if (typing && ! typing.isDone && ! ['Shift', 'Alt', 'Control', 'Meta', 'Tab'].includes(event.key)) {
        finishTyping();
    }

    const input = element.input();

    if (event.key === '/' && document.activeElement !== input && ! event.target.closest('input, textarea')) {
        event.preventDefault();
        focusInput();
    }

    if (event.key === 'Escape' && input && document.activeElement === input) {
        input.value = '';
        updateMirror();
    }
});

/**
 * Keeps the mirror of the inquiry input in step with what is typed, with
 * the block cursor at the caret position.
 */
function updateMirror() {
    const input = element.input();
    const mirror = document.getElementById('inquiry-mirror');

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

function mountContent({ skip = null } = {}) {
    const content = element.content();

    content.scrollTop = 0;
    type({ skip });
    root.classList.remove('mother-boot');
    focusInput();
    updateMirror();
}

function loadGlass() {
    if (! ('WebGL2RenderingContext' in window)) {
        return;
    }

    const load = () => import('./alien/mother-glass.js')
        .then(({ createMotherGlass }) => createMotherGlass(screenElement, document.getElementById('picture')))
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

    const startTyping = () => mountContent();

    if (document.fonts && document.fonts.status !== 'loaded') {
        Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 600))]).then(startTyping);
    } else {
        startTyping();
    }

    createRoomLights(document.getElementById('room-lights'), screenElement);
    loadGlass();
}

init();
