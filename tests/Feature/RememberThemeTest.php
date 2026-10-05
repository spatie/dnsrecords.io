<?php

namespace Tests\Feature;

use App\Http\Middleware\RememberTheme;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\Test;
use Symfony\Component\HttpFoundation\Cookie;
use Tests\TestCase;

class RememberThemeTest extends TestCase
{
    protected function themeCookie(TestResponse $response): ?Cookie
    {
        return collect($response->headers->getCookies())
            ->first(fn (Cookie $cookie) => $cookie->getName() === RememberTheme::$cookieName);
    }

    #[Test]
    public function it_remembers_the_theme_of_a_home_page_with_a_script(): void
    {
        $this
            ->get("{$this->baseUrl}/matrix")
            ->assertSuccessful()
            ->assertSee("document.cookie = 'dnsrecords_theme=matrix;", false);
    }

    #[Test]
    public function it_opens_the_remembered_theme_from_the_terminal_home_page_with_a_script(): void
    {
        $this
            ->get("{$this->baseUrl}/")
            ->assertSuccessful()
            ->assertSee('window.location.replace(homeUrls[rememberedTheme])', false)
            ->assertSee('"matrix":"https:\/\/dnsrecords.io.dev\/matrix"', false)
            ->assertDontSee('"crt":', false);
    }

    #[Test]
    public function it_only_opens_the_remembered_theme_from_the_terminal_home_page(): void
    {
        $this
            ->get("{$this->baseUrl}/matrix")
            ->assertDontSee('homeUrls', false);

        $this
            ->get("{$this->baseUrl}/spatie.be?lookup=1")
            ->assertDontSee('homeUrls', false);
    }

    #[Test]
    public function it_remembers_the_theme_of_a_lookup_with_a_cookie_that_scripts_can_read(): void
    {
        $cookie = $this->themeCookie($this->get("{$this->baseUrl}/matrix/spatie.be?lookup=1"));

        $this->assertNotNull($cookie);
        $this->assertSame('matrix', $cookie->getValue());
        $this->assertFalse($cookie->isHttpOnly());
    }

    #[Test]
    public function it_can_select_the_terminal_again(): void
    {
        $response = $this
            ->withUnencryptedCookie(RememberTheme::$cookieName, 'matrix')
            ->get("{$this->baseUrl}/?theme=terminal")
            ->assertRedirect('/');

        $this->assertSame('crt', $this->themeCookie($response)?->getValue());
    }
}
