<!DOCTYPE html>
<html lang="en" class="no-js">

<head>
    <meta charset="utf-8">
    <meta http-equiv="x-ua-compatible" content="ie=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover">
    <link rel="dns-prefetch" href="https://fonts.googleapis.com">

    <title>DNS records lookup ~ dnsrecords.io</title>
    <meta name="description" content="DNS record lookups just a you like 'em" />

    <link href="https://fonts.googleapis.com/css?family=Fira+Mono:400,700" rel="stylesheet">
    <link rel="stylesheet" href="{{ mix('/css/app.css') }}">
    <script src="{{ mix('/js/app.js') }}" defer></script>

    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="manifest" href="/manifest.json">
    <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#151d21">
    <meta name="theme-color" content="#ffffff">
</head>

<body class="layout">
    @include('googletagmanager::script')

    @yield('content')
</body>
</html>
