/**
 * Lookups are fetched and swapped into the screen, so the monitor stays
 * lit between them. Anything that is not a CRT screen falls back to a
 * normal page load.
 */
export function lookupUrl(form, command) {
    const base = form.getAttribute('action').replace(/\/$/, '');

    return `${base}/${encodeURI(command).replace(/[?#]/g, character => encodeURIComponent(character))}`;
}

/**
 * Only a page of the same interface can be swapped in. Every other page,
 * like Mother, LCARS or the old interface, needs its own styles and
 * scripts, so it is opened with a normal page load.
 */
export function isSameInterface(page, current = document) {
    const interfaceName = current.documentElement.getAttribute('data-interface');

    return interfaceName !== null && page.documentElement.getAttribute('data-interface') === interfaceName;
}

function parseScreen(html) {
    const page = new DOMParser().parseFromString(html, 'text/html');
    const content = page.getElementById('screen-content');

    if (! content || ! isSameInterface(page)) {
        return null;
    }

    const description = page.querySelector('meta[name="description"]');
    const status = page.querySelector('.results__count');

    return {
        content,
        entries: content.querySelector('#terminal-history'),
        title: page.title,
        description: description ? description.getAttribute('content') : null,
        page: page.documentElement.getAttribute('data-page') || 'home',
        announcement: status ? status.textContent.trim() : '',
    };
}

export async function fetchScreen(url) {
    let response;

    try {
        response = await fetch(url, {
            credentials: 'same-origin',
            headers: { Accept: 'text/html' },
        });
    } catch (error) {
        return { type: 'navigate', url };
    }

    const contentType = response.headers.get('Content-Type') || '';

    if (response.status === 429) {
        return { type: 'message', message: (await response.text()).trim() || 'Too many DNS lookups, please try again later.' };
    }

    if (! contentType.includes('text/html')) {
        return { type: 'navigate', url: response.url || url };
    }

    const screen = parseScreen(await response.text());

    if (! screen) {
        return { type: 'navigate', url: response.url || url };
    }

    return { type: 'screen', url: response.url || url, screen };
}
