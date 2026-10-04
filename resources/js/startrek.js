/**
 * The LCARS console swaps scan results into the lower deck without a page
 * load. Anything that is not an LCARS page falls back to normal navigation.
 */
import { withLookupParameter, withoutLookupParameter } from './crt/lookup.js';

const root = document.documentElement;
const body = document.body;
const form = document.getElementById('scan-form');
const input = document.getElementById('domain');
const statusText = document.getElementById('status-text');
const announcer = document.getElementById('announcer');
const content = () => document.getElementById('lcars-content');

let scanInProgress = null;

function announce(message) {
    announcer.textContent = '';

    setTimeout(() => {
        announcer.textContent = message;
    }, 30);
}

function setStatus(message) {
    statusText.textContent = message;
}

function flash(element) {
    element.classList.remove('is-flashing');

    void element.offsetWidth;

    element.classList.add('is-flashing');

    setTimeout(() => element.classList.remove('is-flashing'), 340);
}

function scanUrl(command) {
    const base = form.getAttribute('action').replace(/\/$/, '');

    return `${base}/${encodeURI(command).replace(/[?#]/g, character => encodeURIComponent(character))}`;
}

function parsePage(html) {
    const page = new DOMParser().parseFromString(html, 'text/html');
    const screen = page.getElementById('lcars-content');

    if (! screen || page.documentElement.getAttribute('data-interface') !== root.getAttribute('data-interface')) {
        return null;
    }

    const description = page.querySelector('meta[name="description"]');
    const domain = page.getElementById('domain');
    const status = page.getElementById('status-text');

    return {
        screen,
        title: page.title,
        description: description ? description.getAttribute('content') : null,
        page: page.documentElement.getAttribute('data-page') || 'home',
        domain: domain ? domain.value : '',
        status: status ? status.textContent.trim() : '',
    };
}

async function fetchPage(url) {
    let response;

    try {
        response = await fetch(withLookupParameter(url), {
            credentials: 'same-origin',
            headers: { Accept: 'text/html' },
        });
    } catch (error) {
        return { type: 'navigate', url };
    }

    const responseUrl = withoutLookupParameter(response.url || url);

    if (response.status === 429) {
        return { type: 'message', message: (await response.text()).trim() || 'Too many DNS lookups, please try again later.' };
    }

    if (! (response.headers.get('Content-Type') || '').includes('text/html')) {
        return { type: 'navigate', url: responseUrl };
    }

    const page = parsePage(await response.text());

    return page
        ? { type: 'page', url: responseUrl, page }
        : { type: 'navigate', url: responseUrl };
}

function render(page) {
    content().replaceWith(page.screen);

    document.title = page.title;
    root.setAttribute('data-page', page.page);
    if (page.domain !== '' || ! page.screen.querySelector('.alert--danger')) {
        input.value = page.domain;
    }
    setStatus(page.status);

    const description = document.querySelector('meta[name="description"]');

    if (description && page.description !== null) {
        description.setAttribute('content', page.description);
    }

    enhance();
}

function summarize(page) {
    const count = page.screen.querySelectorAll('.record').length;
    const alert = page.screen.querySelector('.alert__body');

    if (count) {
        return `${count} ${count === 1 ? 'record' : 'records'} found for ${page.domain}.`;
    }

    return alert ? alert.textContent.trim() : page.title;
}

async function scan(command, { push = true } = {}) {
    const url = command === null ? window.location.href : scanUrl(command);
    const attempt = Symbol('scan');

    scanInProgress = attempt;
    body.classList.add('is-scanning');
    setStatus(command ? `Scanning ${command}` : 'Accessing');

    const result = await fetchPage(url);

    if (scanInProgress !== attempt) {
        return;
    }

    scanInProgress = null;
    body.classList.remove('is-scanning');

    if (result.type === 'navigate') {
        window.location.href = result.url;

        return;
    }

    if (result.type === 'message') {
        setStatus('Unable to comply');
        announce(result.message);

        return;
    }

    render(result.page);

    if (push && result.url !== window.location.href) {
        history.pushState({ lcars: true }, '', result.url);
    }

    announce(summarize(result.page));
}

function copyText(text, onCopied) {
    navigator.clipboard.writeText(text).then(onCopied, () => setStatus('Select the text to copy'));
}

function confirmCopy(button, label) {
    button.classList.add('is-copied');
    button.textContent = 'Copied';

    setTimeout(() => {
        button.classList.remove('is-copied');
        button.textContent = label;
    }, 1400);
}

function rawRecords() {
    const raw = document.getElementById('raw-records');

    return raw ? raw.textContent : '';
}

/**
 * Buttons that only work with JavaScript are added once it has loaded.
 */
function enhance() {
    const copyRaw = document.getElementById('copy-raw');
    const toggleRaw = document.getElementById('toggle-raw');
    const canCopy = navigator.clipboard !== undefined;

    if (toggleRaw) {
        toggleRaw.hidden = false;
    }

    if (! canCopy) {
        return;
    }

    if (copyRaw) {
        copyRaw.hidden = false;
    }

    document.querySelectorAll('.record').forEach(record => {
        if (record.querySelector('.record__copy')) {
            return;
        }

        const button = document.createElement('button');
        const value = record.querySelector('.record__value');

        button.type = 'button';
        button.className = 'record__copy';
        button.textContent = 'Copy';
        button.setAttribute('aria-label', `Copy ${record.querySelector('.record__type').textContent} value ${value.textContent}`);

        record.append(button);
    });
}

form.addEventListener('submit', event => {
    event.preventDefault();

    const command = input.value.trim();

    flash(form.querySelector('.scan__button'));

    if (command === '') {
        setStatus('Domain required');
        input.focus();

        return;
    }

    scan(command);
});

document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
    }

    const commandLink = event.target.closest('[data-command]');

    if (commandLink) {
        event.preventDefault();
        flash(commandLink);
        scan(commandLink.getAttribute('data-command'));

        return;
    }

    const copyRaw = event.target.closest('#copy-raw');

    if (copyRaw) {
        flash(copyRaw);
        copyText(rawRecords(), () => {
            confirmCopy(copyRaw, 'Copy raw');
            announce('Raw records copied.');
        });

        return;
    }

    const toggleRaw = event.target.closest('#toggle-raw');

    if (toggleRaw) {
        const raw = document.getElementById('raw-records');
        const isExpanded = toggleRaw.getAttribute('aria-expanded') === 'true';

        flash(toggleRaw);
        toggleRaw.setAttribute('aria-expanded', String(! isExpanded));
        raw.hidden = isExpanded;

        return;
    }

    const copyRecord = event.target.closest('.record__copy');

    if (copyRecord) {
        const value = copyRecord.parentNode.querySelector('.record__value');

        copyText(value.textContent.trim(), () => confirmCopy(copyRecord, 'Copy'));
    }
});

document.addEventListener('keydown', event => {
    if (event.key === '/' && document.activeElement !== input && ! event.metaKey && ! event.ctrlKey) {
        event.preventDefault();
        input.focus();
        input.select();
    }
});

window.addEventListener('popstate', () => scan(null, { push: false }));

history.replaceState({ lcars: true }, '', window.location.href);

enhance();
