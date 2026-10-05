<script>
    (function () {
        const root = document.documentElement;
        let storedPhosphor = null;

        try {
            storedPhosphor = localStorage.getItem('crt-phosphor');
            localStorage.removeItem('crt-fx');
        } catch (error) {}

        const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        root.className = root.className.replace('no-js', 'js');
        root.setAttribute('data-motion', prefersReducedMotion ? 'calm' : 'full');
        root.setAttribute('data-phosphor', ['white', 'green', 'amber'].indexOf(storedPhosphor) === -1 ? 'green' : storedPhosphor);
    })();
</script>
