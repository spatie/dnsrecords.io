import { fetchScreen, lookupUrl } from './crt/lookup.js';
import { switchTheme } from './theme-shortcuts.js';
import './interfaces/window-controls.js';
import './interfaces/matrix-rain.js';
import './interfaces/matrix-construct.js';
import { mountSignals } from './interfaces/matrix-signal.js';
import './interfaces/matrix-input-effects.js';

const root = document.documentElement;
const form = document.getElementById('form');
const input = document.getElementById('url');
const entries = document.getElementById('entries');
const status = document.getElementById('status');
const windowStatus = document.getElementById('window-status');
const submitButton = form.querySelector('button[type="submit"]');
const windowBody = document.querySelector('.window__body');
const system7Thumb = document.getElementById('system7-scroll-thumb');
const system7Count = document.getElementById('system7-count');
const clearResultsLink = document.getElementById('clear-results');
const homeTitle = document.title.replace(/^.* DNS records/, 'DNS records lookup');
const homeDescription = 'Look up DNS records in a different interface';
const snapshots = new Map();

let snapshotNumber = 0;
let lookupInProgress = null;

root.classList.replace('no-js', 'js');
entries.querySelectorAll('.copy-records').forEach(button => button.hidden = false);

function clearInput() {
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
}

function setStatus(message) {
    status.textContent = message;
    if (root.dataset.interface === 'matrix') {
        status.parentElement.hidden = message === 'Ready';
    }
    if (windowStatus) {
        windowStatus.textContent = message;
    }
}

function updateSystem7Scroll() {
    if (! system7Thumb) {
        return;
    }

    const track = system7Thumb.parentElement;
    const maximum = Math.max(0, windowBody.scrollHeight - windowBody.clientHeight);
    const height = Math.max(22, track.clientHeight * windowBody.clientHeight / windowBody.scrollHeight);

    system7Thumb.style.height = `${Math.min(track.clientHeight, height)}px`;
    system7Thumb.style.top = `${maximum ? windowBody.scrollTop / maximum * (track.clientHeight - height) : 0}px`;
}

function saveSnapshot(url, method = 'pushState') {
    const snapshot = ++snapshotNumber;

    snapshots.set(snapshot, {
        html: entries.innerHTML,
        title: document.title,
        description: document.querySelector('meta[name="description"]').content,
        status: status.textContent,
    });

    window.history[method]({ interface: root.getAttribute('data-interface'), snapshot }, '', url);
}

function clearResults() {
    root.classList.remove('is-decoding');
    entries.replaceChildren();
    clearInput();
    input.readOnly = false;
    submitButton.disabled = false;
    lookupInProgress = null;
    document.title = homeTitle;
    document.querySelector('meta[name="description"]').content = homeDescription;
    setStatus(root.dataset.interface === 'matrix' ? 'Ready' : 'Ready for a domain');
    if (root.dataset.interface === 'matrix') {
        clearResultsLink.hidden = true;
    }
    if (system7Count) {
        system7Count.textContent = '0 items';
    }
    saveSnapshot(form.action);
    input.focus({ preventScroll: true });
    requestAnimationFrame(updateSystem7Scroll);
}

function addNotice(message) {
    const notice = document.createElement('p');

    notice.className = 'notice notice--error';
    notice.setAttribute('role', 'alert');
    notice.textContent = message;
    entries.prepend(notice);
    if (root.dataset.interface === 'matrix') {
        clearResultsLink.hidden = false;
    }
    setStatus(message);
}

function addResponse(screenPage, command) {
    const responseEntries = screenPage.content.querySelector('#entries');

    if (! responseEntries) {
        return false;
    }

    const answer = document.createElement('div');
    const commandLine = document.createElement('p');

    answer.className = 'entry';
    if (root.dataset.interface === 'matrix') {
        answer.classList.add('entry--decoded');
    }
    commandLine.className = 'entry__command';
    commandLine.textContent = `> ${command}`;
    const responseChildren = Array.from(document.adoptNode(responseEntries).children);
    const matrixEntry = root.dataset.interface === 'matrix'
        ? responseChildren.find(child => child.matches('.entry--decoded'))
        : null;

    const outputChildren = matrixEntry
        ? [...matrixEntry.children].filter(child => ! child.matches('.entry__command')).concat(responseChildren.filter(child => child !== matrixEntry))
        : responseChildren;

    if (! outputChildren.length) {
        addNotice(`No output for ${command}.`);

        return true;
    }

    answer.append(...(root.dataset.interface === 'matrix' ? [] : [commandLine]), ...outputChildren);

    answer.querySelectorAll('.copy-records').forEach(button => button.hidden = false);
    entries.prepend(answer);
    if (root.dataset.interface === 'matrix') {
        clearResultsLink.hidden = false;
    }
    root.classList.remove('is-decoding');
    answer.scrollIntoView({ block: 'start', behavior: 'auto' });

    document.title = screenPage.title;

    if (screenPage.description !== null) {
        document.querySelector('meta[name="description"]').content = screenPage.description;
    }

    const count = Number(answer.querySelector('.matrix-signal')?.dataset.recordCount
        ?? answer.querySelectorAll('.record:not(.record--continued)').length);

    setStatus(count ? `${count} records found` : 'Response received');
    if (system7Count) {
        system7Count.textContent = `${count} items`;
    }
    requestAnimationFrame(updateSystem7Scroll);

    return true;
}

async function lookup(command) {
    if (lookupInProgress !== null) {
        return;
    }

    const attempt = Symbol('lookup');

    lookupInProgress = attempt;
    root.classList.toggle('is-decoding', root.dataset.interface === 'matrix');
    input.readOnly = true;
    submitButton.disabled = true;
    setStatus(`Looking up ${command}…`);

    const result = await fetchScreen(lookupUrl(form, command));

    if (lookupInProgress !== attempt) {
        return;
    }

    lookupInProgress = null;
    root.classList.remove('is-decoding');
    input.readOnly = false;
    submitButton.disabled = false;

    if (result.type === 'navigate') {
        window.location.assign(result.url);

        return;
    }

    if (result.type === 'message') {
        addNotice(result.message);

        return;
    }

    if (! addResponse(result.screen, command)) {
        window.location.assign(result.url);

        return;
    }

    clearInput();
    input.focus({ preventScroll: true });
    saveSnapshot(result.url);
    if (root.dataset.interface === 'matrix') {
        mountSignals(entries.firstElementChild);
    }
}

form.addEventListener('submit', event => {
    event.preventDefault();

    const command = input.value.trim();

    if (command === '') {
        input.focus();

        return;
    }

    if (command.toLowerCase() === 'clear') {
        clearResults();

        return;
    }

    if (switchTheme(command)) {
        return;
    }

    lookup(command);
});

document.addEventListener('click', event => {
    const lookupLink = event.target.closest('a[href="#url"]');

    if (lookupLink) {
        event.preventDefault();
        const menu = lookupLink.closest('details');

        if (menu) {
            menu.open = false;
        }

        input.focus();

        return;
    }

    const clearLink = event.target.closest('#clear-results, [data-clear]');

    if (clearLink) {
        event.preventDefault();
        clearResults();

        return;
    }

    const scrollButton = event.target.closest('[data-scroll]');

    if (scrollButton) {
        windowBody.scrollBy({ top: scrollButton.dataset.scroll === 'up' ? -windowBody.clientHeight * .8 : windowBody.clientHeight * .8 });

        return;
    }

    const copyLatest = event.target.closest('[data-copy-latest]');

    if (copyLatest) {
        const menu = copyLatest.closest('details');

        if (menu) {
            menu.open = false;
        }

        const latestCopy = entries.querySelector('.result .copy-records');

        if (latestCopy) {
            latestCopy.click();
        } else {
            setStatus('No records to copy');
        }

        return;
    }

    const copyButton = event.target.closest('.copy-records');

    if (! copyButton) {
        return;
    }

    const result = copyButton.closest('.result');
    const signalData = result.querySelector('.matrix-signal__data');
    const text = signalData
        ? JSON.parse(signalData.textContent).raw
        : Array.from(result.querySelectorAll('[data-raw]'))
            .map(record => record.getAttribute('data-raw'))
            .join('\n');

    if (! navigator.clipboard?.writeText) {
        setStatus('Select the records and press Cmd+C or Ctrl+C to copy.');

        return;
    }

    navigator.clipboard.writeText(text).then(() => {
        copyButton.textContent = signalData ? '[ COPIED ]' : 'Copied';
        setStatus('Records copied');
        setTimeout(() => copyButton.textContent = signalData ? '[ COPY RECORDS ]' : 'Copy records', 1500);
    }, () => setStatus('Select the records and press Cmd+C or Ctrl+C to copy.'));
});

window.addEventListener('popstate', event => {
    const snapshot = event.state && snapshots.get(event.state.snapshot);

    if (! snapshot) {
        window.location.reload();

        return;
    }

    entries.innerHTML = snapshot.html;
    if (root.dataset.interface === 'matrix') {
        clearResultsLink.hidden = entries.children.length === 0;
        const restoredEntry = entries.querySelector('.entry--decoded');

        if (restoredEntry) {
            mountSignals(restoredEntry);
        }
    }
    document.title = snapshot.title;
    document.querySelector('meta[name="description"]').content = snapshot.description;
    clearInput();
    input.readOnly = false;
    submitButton.disabled = false;
    lookupInProgress = null;
    setStatus(snapshot.status);
    if (system7Count) {
        system7Count.textContent = `${entries.querySelectorAll('.record:not(.record--continued)').length} items`;
    }
    input.focus({ preventScroll: true });
    requestAnimationFrame(updateSystem7Scroll);
});

function updateClock() {
    const clock = document.getElementById('clock');

    if (! clock) {
        return;
    }

    clock.textContent = new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date());
}

updateClock();
setInterval(updateClock, 30000);
saveSnapshot(window.location.href, 'replaceState');

if (root.dataset.interface === 'matrix') {
    const initialEntry = entries.querySelector('.entry--decoded');

    if (initialEntry) {
        mountSignals(initialEntry);
    } else {
        root.removeAttribute('data-matrix-booting');
    }
}

if (system7Thumb) {
    windowBody.addEventListener('scroll', updateSystem7Scroll, { passive: true });
    new ResizeObserver(updateSystem7Scroll).observe(windowBody);
    updateSystem7Scroll();
}
