<?php

use Illuminate\Support\Facades\File;

beforeEach(function () {
    File::ensureDirectoryExists(public_path('build/assets'));

    File::put(public_path('build/assets/test-asset.js'), 'console.log("dnsrecords");');
});

afterEach(function () {
    File::delete(public_path('build/assets/test-asset.js'));
});

it('serves build assets with headers that let the edge keep them', function () {
    $response = $this
        ->get("{$this->baseUrl}/static/assets/test-asset.js")
        ->assertSuccessful()
        ->assertHeader('Content-Type', 'text/javascript; charset=utf-8');

    expect($response->headers->getCookies())->toBeEmpty()
        ->and($response->headers->get('Cache-Control'))->toContain('immutable')
        ->and($response->headers->get('Cache-Control'))->toContain('max-age=31536000')
        ->and($response->headers->get('Cache-Control'))->toContain('public');
});

it('does not serve files outside the build directory', function (string $path) {
    $this
        ->get("{$this->baseUrl}/static/{$path}")
        ->assertNotFound();
})->with([
    '..%2F..%2F.env',
    '../index.php',
    'assets/missing.js',
]);
