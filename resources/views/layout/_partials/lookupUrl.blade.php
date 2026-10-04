@use('App\Http\Middleware\ServeLookupShell')

<script>
    (function () {
        var url = new URL(window.location.href);

        if (! url.searchParams.has('{{ ServeLookupShell::$lookupParameter }}')) {
            return;
        }

        url.searchParams.delete('{{ ServeLookupShell::$lookupParameter }}');

        window.history.replaceState(window.history.state, '', url.toString());
    })();
</script>
