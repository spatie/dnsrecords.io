<script>
    (function () {
        var root = document.documentElement;
        var storedFx = null;
        var storedPhosphor = null;
        var hasBooted = false;

        try {
            storedFx = localStorage.getItem('crt-fx');
            storedPhosphor = localStorage.getItem('crt-phosphor');
            hasBooted = sessionStorage.getItem('crt-booted') === '1';
        } catch (error) {}

        var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        root.className = root.className.replace('no-js', 'js');
        root.setAttribute('data-fx', storedFx || (prefersReducedMotion ? 'off' : 'on'));
        root.setAttribute('data-phosphor', storedPhosphor || 'amber');

        if (root.getAttribute('data-fx') === 'on' && root.getAttribute('data-page') === 'home' && ! hasBooted) {
            root.setAttribute('data-boot', 'pending');
        }
    })();
</script>
