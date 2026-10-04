const root = document.documentElement;
const theme = root.dataset.interface;
const windowElement = document.querySelector('.window');
const titlebar = windowElement?.querySelector('.window__titlebar');
const desktopMode = window.matchMedia('(min-width: 701px)');
const minimumWidth = theme === 'system7' ? 360 : 430;
const minimumHeight = theme === 'system7' ? 280 : 320;
const topInset = theme === 'system7' ? 21 : 4;
const bottomInset = theme === 'winxp' ? 40 : 4;

let unzoomed = null;

function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
}

function rectAt(left, top, width, height) {
    return {
        left,
        top,
        width,
        height,
    };
}

function applyRect(rect) {
    windowElement.style.left = `${rect.left}px`;
    windowElement.style.top = `${rect.top}px`;
    windowElement.style.width = `${rect.width}px`;
    windowElement.style.height = `${rect.height}px`;
}

function currentRect() {
    const rect = windowElement.getBoundingClientRect();

    return rectAt(rect.left, rect.top, rect.width, rect.height);
}

function fitRect(rect) {
    const width = Math.min(rect.width, window.innerWidth - 8);
    const height = Math.min(rect.height, window.innerHeight - topInset - bottomInset);

    return rectAt(
        clamp(rect.left, 4, Math.max(4, window.innerWidth - width - 4)),
        clamp(rect.top, topInset, Math.max(topInset, window.innerHeight - bottomInset - height)),
        width,
        height,
    );
}

function startInteraction(event, mode) {
    if (! desktopMode.matches || event.button !== 0 || windowElement.hidden) {
        return;
    }

    if (mode === 'move' && event.target.closest('button, a, input, summary')) {
        return;
    }

    if (unzoomed) {
        return;
    }

    event.preventDefault();

    const target = event.currentTarget;
    const initial = currentRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const outline = theme === 'system7' ? document.createElement('div') : null;

    if (outline) {
        outline.className = 'system7-window-outline';
        Object.assign(outline.style, {
            left: `${initial.left}px`,
            top: `${initial.top}px`,
            width: `${initial.width}px`,
            height: `${initial.height}px`,
        });
        document.body.append(outline);
    }

    target.setPointerCapture(event.pointerId);

    function moved(pointerEvent) {
        const deltaX = pointerEvent.clientX - startX;
        const deltaY = pointerEvent.clientY - startY;
        let next;

        if (mode === 'move') {
            next = fitRect(rectAt(initial.left + deltaX, initial.top + deltaY, initial.width, initial.height));
        } else {
            const maxWidth = Math.max(minimumWidth, window.innerWidth - initial.left - 4);
            const maxHeight = Math.max(minimumHeight, window.innerHeight - bottomInset - initial.top - 4);

            next = rectAt(initial.left, initial.top,
                clamp(initial.width + deltaX, minimumWidth, maxWidth),
                clamp(initial.height + deltaY, minimumHeight, maxHeight));
        }

        if (outline) {
            Object.assign(outline.style, {
                left: `${next.left}px`,
                top: `${next.top}px`,
                width: `${next.width}px`,
                height: `${next.height}px`,
            });
        } else {
            applyRect(next);
        }
    }

    function finished(pointerEvent) {
        target.removeEventListener('pointermove', moved);
        target.removeEventListener('pointerup', finished);
        target.removeEventListener('pointercancel', finished);

        if (outline) {
            if (pointerEvent.type === 'pointerup') {
                applyRect(rectAt(
                    parseFloat(outline.style.left),
                    parseFloat(outline.style.top),
                    parseFloat(outline.style.width),
                    parseFloat(outline.style.height),
                ));
            }

            outline.remove();
        }
    }

    target.addEventListener('pointermove', moved);
    target.addEventListener('pointerup', finished);
    target.addEventListener('pointercancel', finished);
}

function toggleZoom() {
    if (! desktopMode.matches) {
        return;
    }

    if (unzoomed) {
        applyRect(fitRect(unzoomed));
        unzoomed = null;
        root.removeAttribute('data-window-zoomed');

        return;
    }

    unzoomed = currentRect();
    applyRect(rectAt(4, topInset, window.innerWidth - 8, window.innerHeight - topInset - bottomInset));
    root.setAttribute('data-window-zoomed', 'true');
}

if (windowElement && (theme === 'system7' || theme === 'winxp')) {
    titlebar.addEventListener('pointerdown', event => startInteraction(event, 'move'));
    windowElement.querySelector('[data-window-resize]').addEventListener('pointerdown', event => startInteraction(event, 'resize'));

    document.querySelectorAll('[data-window-action]').forEach(button => {
        button.addEventListener('click', () => {
            if (! desktopMode.matches) {
                return;
            }

            if (button.dataset.windowAction === 'maximize') {
                toggleZoom();
            } else {
                windowElement.hidden = true;
            }
        });
    });

    document.querySelectorAll('[data-window-restore]').forEach(button => {
        button.addEventListener('click', () => {
            windowElement.hidden = false;
        });
    });

    window.addEventListener('resize', () => {
        if (! desktopMode.matches) {
            windowElement.removeAttribute('style');
            windowElement.hidden = false;
            unzoomed = null;
            root.removeAttribute('data-window-zoomed');

            return;
        }

        if (unzoomed) {
            applyRect(rectAt(4, topInset, window.innerWidth - 8, window.innerHeight - topInset - bottomInset));
        } else {
            applyRect(fitRect(currentRect()));
        }
    });
}
