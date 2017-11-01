<?php

namespace Test\Feature;

use Tests\TestCase;

class DnsLookupTest extends TestCase
{
    /** @test */
    public function it_can_lookup_a_normal_domain()
    {
        $this
            ->sendCommand('spatie.be')
            ->assertSee('<pre class="main__results">');
    }

    /** @test */
    public function it_doesnt_fail_with_a_dot_as_search_query()
    {
        $this
            ->sendCommand('.')
            ->assertSuccessful();
    }

    /** @test */
    public function it_redirects_to_home_when_the_domain_lookup_is_invalid()
    {
        $this
            ->sendCommand('..')
            ->assertRedirect('/');

        $this
            ->sendCommand('?')
            ->assertRedirect('/');
    }

    /** @test */
    public function it_sanitizes_the_domain_lookup_when_it_has_a_scheme()
    {
        $this
            ->sendCommand('http://spatie.be')
            ->assertRedirect('/spatie.be');

        $this
            ->sendCommand('https://spatie.be')
            ->assertRedirect('/spatie.be');
    }

    /** @test */
    public function it_sanitizes_the_domain_lookup_when_it_has_a_path()
    {
        $this
            ->sendCommand('https://spatie.be/en/vacancies')
            ->assertRedirect('/spatie.be');
    }
}
