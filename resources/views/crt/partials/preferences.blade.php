<script>
    (function () {
        var root = document.documentElement;
        var storedFx = null;
        var storedPhosphor = null;

        try {
            storedFx = localStorage.getItem('crt-fx');
            storedPhosphor = localStorage.getItem('crt-phosphor');
        } catch (error) {}

        var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        root.className = root.className.replace('no-js', 'js');
        root.setAttribute('data-fx', storedFx || (prefersReducedMotion ? 'off' : 'on'));
        root.setAttribute('data-phosphor', ['white', 'green', 'amber'].indexOf(storedPhosphor) === -1 ? 'white' : storedPhosphor);
    })();
</script>
