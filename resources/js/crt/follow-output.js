/*
 * Keeps the newest output in view, like a real terminal: whenever what is
 * on screen grows, the scroll container follows it to the end. Scrolling
 * up yourself stops the following, scrolling back to the end or a new
 * inquiry resumes it.
 */

const userScrollKeys = ['ArrowUp', 'PageUp', 'Home'];

function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * @param {() => Element|null} scroller The element that scrolls, or null to scroll the page.
 * @param {() => Element|null} watched The element whose growth is followed.
 */
export function followOutput(scroller, watched) {
    let isFollowing = true;
    let frame = null;
    let observedElement = null;

    const scrollingElement = () => scroller() || document.scrollingElement;
    const distanceToEnd = element => element.scrollHeight - element.scrollTop - element.clientHeight;

    function scrollToEnd({ smooth = false } = {}) {
        const element = scrollingElement();

        if (distanceToEnd(element) < 1) {
            return;
        }

        element.scrollTo({ top: element.scrollHeight, behavior: smooth && ! prefersReducedMotion() ? 'smooth' : 'auto' });
    }

    function onGrow() {
        if (! isFollowing || frame) {
            return;
        }

        frame = requestAnimationFrame(() => {
            frame = null;
            scrollToEnd();
        });
    }

    function stopFollowing() {
        isFollowing = false;
    }

    const resizeObserver = new ResizeObserver(onGrow);

    function observe() {
        const element = watched();

        if (element === observedElement) {
            return;
        }

        if (observedElement) {
            resizeObserver.unobserve(observedElement);
        }

        observedElement = element;

        if (element) {
            resizeObserver.observe(element);
        }
    }

    document.addEventListener('wheel', event => {
        if (event.deltaY < 0) {
            stopFollowing();
        }
    }, { passive: true });

    document.addEventListener('touchmove', stopFollowing, { passive: true });

    document.addEventListener('keydown', event => {
        if (userScrollKeys.includes(event.key) && ! event.target.closest('input, textarea')) {
            stopFollowing();
        }
    });

    document.addEventListener('scroll', () => {
        if (distanceToEnd(scrollingElement()) < 8) {
            isFollowing = true;
        }
    }, { capture: true, passive: true });

    observe();

    return {
        /**
         * Starts following again, for a new inquiry or a new page of output.
         */
        follow({ smooth = true } = {}) {
            isFollowing = true;
            observe();
            requestAnimationFrame(() => scrollToEnd({ smooth }));
        },
    };
}
