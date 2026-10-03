/**
 * Lookups are fetched and swapped into the screen, so the monitor stays
 * lit between them. Anything that is not a CRT screen falls back to a
 * normal page load.
 */
export function lookupUrl(form, command) {
    const base = form.getAttribute('action').replace(/\/$/, '');

    return `${base}/${encodeURI(command).replace(/[?#]/g, character => encodeURIComponent(character))}`;
}

function parseScreen(html) {
    const document = new DOMParser().parseFromString(html, 'text/html');
    const content = document.getElementById('screen-content');

    if (! content) {
        return null;
    }

    const description = document.querySelector('meta[name="description"]');
    const status = document.querySelector('.results__count');

    return {
        content,
        title: document.title,
        description: description ? description.getAttribute('content') : null,
        page: document.documentElement.getAttribute('data-page') || 'home',
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
