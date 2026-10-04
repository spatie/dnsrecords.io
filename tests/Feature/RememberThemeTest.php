<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class RememberThemeTest extends TestCase
{
    #[Test]
    public function it_opens_the_last_theme_on_a_return_visit(): void
    {
        $response = $this->get("{$this->baseUrl}/matrix");
        $themeCookie = collect($response->headers->getCookies())
            ->first(fn ($cookie) => $cookie->getName() === 'dnsrecords_theme');

        $this->assertNotNull($themeCookie);

        $this
            ->withUnencryptedCookie($themeCookie->getName(), $themeCookie->getValue())
            ->get("{$this->baseUrl}/")
            ->assertRedirect('/matrix');
    }

    #[Test]
    public function it_can_select_the_terminal_again(): void
    {
        $response = $this
            ->withCookie('dnsrecords_theme', 'matrix')
            ->get("{$this->baseUrl}/?theme=terminal")
            ->assertRedirect('/');

        $this->assertTrue(collect($response->headers->getCookies())
            ->contains(fn ($cookie) => $cookie->getName() === 'dnsrecords_theme'));
    }
}
