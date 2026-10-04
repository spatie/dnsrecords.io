<?php

use Illuminate\Support\Facades\Process;

dataset('homePages', ['/', '/old', '/lcars', '/muthur', '/matrix', '/system7', '/winxp']);

dataset('plainLookups', [
    '/spatie.be',
    '/kilcadiri.com.tr',
    '/ip',
    '/old/spatie.be',
    '/lcars/spatie.be',
    '/muthur/spatie.be',
    '/matrix/spatie.be',
    '/system7/spatie.be',
    '/winxp/spatie.be',
    '/spatie.be%2Fen%2Fvacancies',
]);

it('caches the home pages at the edge', function (string $path) {
    $response = $this
        ->get("{$this->baseUrl}{$path}")
        ->assertSuccessful();

    expect($response->headers->getCookies())->toBeEmpty()
        ->and($response->headers->get('Cache-Control'))->toContain('public')
        ->and($response->headers->get('Cache-Control'))->toContain('s-maxage=604800');
})->with('homePages');

it('caches the home pages for crawlers too', function () {
    $response = $this
        ->withHeader('User-Agent', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')
        ->withoutHeader('Sec-Fetch-Mode')
        ->get("{$this->baseUrl}/")
        ->assertSuccessful()
        ->assertSee('data-interface="terminal"', false);

    expect($response->headers->get('Cache-Control'))->toContain('public');
});

it('does not cache the home page when it selects a theme', function () {
    $response = $this
        ->get("{$this->baseUrl}/?theme=terminal")
        ->assertRedirect('/');

    expect($response->headers->get('Cache-Control'))->not->toContain('public');
});

it('answers plain lookup urls with a page that can be cached at the edge', function (string $path) {
    $response = $this
        ->get("{$this->baseUrl}{$path}")
        ->assertSuccessful()
        ->assertSee("url.searchParams.set('lookup', '1')", false)
        ->assertSee('<a href="?lookup=1">', false)
        ->assertHeader('X-Robots-Tag', 'noindex, nofollow');

    expect($response->headers->getCookies())->toBeEmpty()
        ->and($response->headers->get('Cache-Control'))->toContain('public')
        ->and($response->headers->get('Cache-Control'))->toContain('s-maxage=604800');

    Process::assertNothingRan();
})->with('plainLookups');

it('answers plain lookup urls with the same page for every url', function () {
    $shell = $this->get("{$this->baseUrl}/spatie.be")->getContent();

    expect($this->get("{$this->baseUrl}/ip")->getContent())->toBe($shell)
        ->and($this->get("{$this->baseUrl}/lcars/kilcadiri.com.tr")->getContent())->toBe($shell);
});

it('answers plain lookup urls from crawlers without waking the lookup', function () {
    $this
        ->withHeader('User-Agent', 'Mozilla/4.0 (compatible; Win32; WinHttp.WinHttpRequest.5)')
        ->withoutHeader('Sec-Fetch-Mode')
        ->withoutHeader('Accept-Language')
        ->get("{$this->baseUrl}/kilcadiri.com.tr")
        ->assertSuccessful()
        ->assertSee("url.searchParams.set('lookup', '1')", false);

    Process::assertNothingRan();
});

it('looks up domains when the lookup parameter is present', function () {
    $response = $this
        ->get("{$this->baseUrl}/spatie.be?lookup=1")
        ->assertSuccessful()
        ->assertSee('103.133.1.1');

    expect($response->headers->get('Cache-Control'))->not->toContain('public');
});

it('still blocks crawlers that follow the lookup parameter', function () {
    $this
        ->withHeader('User-Agent', 'ClaudeBot/1.0')
        ->get("{$this->baseUrl}/spatie.be?lookup=1")
        ->assertForbidden();

    $this
        ->withoutHeader('Sec-Fetch-Mode')
        ->get("{$this->baseUrl}/spatie.be?lookup=1")
        ->assertForbidden();
});

it('never caches the ip address', function () {
    $response = $this
        ->withServerVariables(['REMOTE_ADDR' => '81.82.83.84'])
        ->get("{$this->baseUrl}/ip?lookup=1")
        ->assertSee('81.82.83.84');

    expect($response->headers->get('Cache-Control'))->not->toContain('public');
});

it('submits lookups without a session', function () {
    $this
        ->sendCommand('spatie.be', '/')
        ->assertSuccessful()
        ->assertSee('103.133.1.1');
});

it('caches the redirects of renamed themes at the edge', function () {
    $response = $this
        ->get("{$this->baseUrl}/alien/spatie.be")
        ->assertRedirect('/muthur/spatie.be');

    expect($response->headers->getCookies())->toBeEmpty()
        ->and($response->headers->get('Cache-Control'))->toContain('public');
});

it('strips the lookup parameter from the address bar', function () {
    $this
        ->get("{$this->baseUrl}/spatie.be?lookup=1")
        ->assertSee("url.searchParams.delete('lookup')", false);
});
