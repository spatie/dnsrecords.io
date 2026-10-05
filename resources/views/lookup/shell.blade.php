<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <meta name="color-scheme" content="dark">
    <title>dnsrecords.io</title>
    <script>
        (function () {
            const url = new URL(window.location.href);

            url.searchParams.set('{{ $lookupParameter }}', '1');

            window.lookUp = function () {
                document.cookie = '{{ $blockedCookieName }}=; path=/; max-age=0; samesite=lax';

                window.location.replace(url.toString());
            };

            const isAutomated = navigator.webdriver || /headless/i.test(navigator.userAgent);
            const wasBlocked = /(?:^|; ){{ $blockedCookieName }}=/.test(document.cookie);

            if (isAutomated || wasBlocked) {
                document.documentElement.setAttribute('data-blocked', '');

                return;
            }

            window.lookUp();
        })();
    </script>
    <style>
        html { background: #050a07; color: #9effb4; font-family: monospace; }
        button { font: inherit; }
        .blocked { display: none; }
        [data-blocked] .blocked { display: block; }
    </style>
</head>
<body>
    <div class="blocked">
        <p>Automated DNS lookups are not allowed.</p>
        <p><button type="button" onclick="lookUp()">I'm a person, look up the DNS records</button></p>
    </div>

    <noscript>
        <p>Looking up DNS records needs JavaScript. You can also use the form on the <a href="/">homepage</a>.</p>
    </noscript>
</body>
</html>
