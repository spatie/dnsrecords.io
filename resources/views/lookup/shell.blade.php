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
            var url = new URL(window.location.href);

            url.searchParams.set('{{ $lookupParameter }}', '1');

            window.location.replace(url.toString());
        })();
    </script>
    <style>
        html { background: #050a07; color: #9effb4; font-family: monospace; }
    </style>
</head>
<body>
    <noscript>
        <p><a href="?{{ $lookupParameter }}=1">Look up the DNS records</a></p>
    </noscript>
</body>
</html>
