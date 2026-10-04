<?php

use App\Http\Middleware\RememberTheme;
use Illuminate\Testing\TestResponse;
use Symfony\Component\HttpFoundation\Cookie;

function themeCookie(TestResponse $response): ?Cookie
{
    return collect($response->headers->getCookies())
        ->first(fn (Cookie $cookie) => $cookie->getName() === RememberTheme::$cookieName);
}

it('remembers the theme of a home page with a script', function () {
    $this
        ->get("{$this->baseUrl}/matrix")
        ->assertSuccessful()
        ->assertSee("document.cookie = 'dnsrecords_theme=matrix;", false);
});

it('opens the remembered theme from the terminal home page with a script', function () {
    $this
        ->get("{$this->baseUrl}/")
        ->assertSuccessful()
        ->assertSee('window.location.replace(homeUrls[rememberedTheme])', false)
        ->assertSee('"matrix":"https:\/\/dnsrecords.io.dev\/matrix"', false)
        ->assertDontSee('"crt":', false);
});

it('only opens the remembered theme from the terminal home page', function () {
    $this
        ->get("{$this->baseUrl}/matrix")
        ->assertDontSee('homeUrls', false);

    $this
        ->get("{$this->baseUrl}/spatie.be?lookup=1")
        ->assertDontSee('homeUrls', false);
});

it('remembers the theme of a lookup with a cookie that scripts can read', function () {
    $cookie = themeCookie($this->get("{$this->baseUrl}/matrix/spatie.be?lookup=1"));

    expect($cookie)->not->toBeNull()
        ->and($cookie->getValue())->toBe('matrix')
        ->and($cookie->isHttpOnly())->toBeFalse();
});

it('can select the terminal again', function () {
    $response = $this
        ->withUnencryptedCookie(RememberTheme::$cookieName, 'matrix')
        ->get("{$this->baseUrl}/?theme=terminal")
        ->assertRedirect('/');

    expect(themeCookie($response)->getValue())->toBe('crt');
});
