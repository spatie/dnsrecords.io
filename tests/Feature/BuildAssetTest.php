<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\File;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class BuildAssetTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        File::ensureDirectoryExists(public_path('build/assets'));
        File::put(public_path('build/assets/test-asset.js'), 'console.log("dnsrecords");');
    }

    protected function tearDown(): void
    {
        File::delete(public_path('build/assets/test-asset.js'));

        parent::tearDown();
    }

    #[Test]
    public function it_serves_build_assets_with_headers_that_let_the_edge_keep_them(): void
    {
        $response = $this
            ->get("{$this->baseUrl}/static/assets/test-asset.js")
            ->assertSuccessful()
            ->assertHeader('Content-Type', 'text/javascript; charset=utf-8');

        $this->assertEmpty($response->headers->getCookies());
        $this->assertStringContainsString('immutable', $response->headers->get('Cache-Control'));
        $this->assertStringContainsString('max-age=31536000', $response->headers->get('Cache-Control'));
        $this->assertStringContainsString('public', $response->headers->get('Cache-Control'));
    }

    #[Test]
    public function it_does_not_serve_files_outside_the_build_directory(): void
    {
        foreach (['..%2F..%2F.env', '../index.php', 'assets/missing.js'] as $path) {
            $this
                ->get("{$this->baseUrl}/static/{$path}")
                ->assertNotFound();
        }
    }
}
