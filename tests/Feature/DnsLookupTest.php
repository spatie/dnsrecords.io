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
            ->assertSee('<pre class="main__results">')
            ->assertSee('IN A')
            ->assertSee('IN NS');
    }

    /** @test */
    public function it_can_lookup_a_normal_domain_with_filtering_rules_applied()
    {
        $this
            ->sendCommand('spatie.be a soa')
            ->assertSee('<pre class="main__results">')
            ->assertSee('IN A')
            ->assertSee('IN SOA')
            ->assertDontSee('IN NS');
    }

    /** @test */
    public function it_can_lookup_a_normal_domain_with_a_single_applied()
    {
        $this
            ->sendCommand('spatie.be a')
            ->assertSee('<pre class="main__results">')
            ->assertSee('IN A')
            ->assertDontSee('IN SOA')
            ->assertDontSee('IN NS');
    }

    /** @test */
    public function it_doesnt_fail_on_invalid_filtering_rules()
    {
        $this
            ->sendCommand('spatie.be a b c')
            ->assertSee('<pre class="main__results">')
            ->assertSee('IN A')
            ->assertDontSee('IN SOA')
            ->assertDontSee('IN NS');
    }

    /** @test */
    public function it_doesnt_fail_with_a_dot_as_search_query()
    {
        $this
            ->sendCommand('.')
            ->assertSuccessful();

        $this
            ->post('/', ['command' => '.'])
            ->assertSee('root-servers.net');
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

    /** @test */
    public function it_filters_out_html()
    {
        $this
            ->sendCommand('<iframe>')
            ->assertRedirect('/');
    }
}
