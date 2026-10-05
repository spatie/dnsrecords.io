<?php

namespace App\Http\Controllers;

use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\Mime\MimeTypes;

/**
 * Cloud's web server sends build assets without cache headers, so the edge
 * fetches them again every two hours. Served from here, they are cached
 * until the next deploy purges the edge cache.
 */
class BuildAssetController extends Controller
{
    public function __invoke(string $path): BinaryFileResponse
    {
        $buildDirectory = realpath(public_path('build'));

        $file = realpath("{$buildDirectory}/{$path}");

        abort_unless($file && str_starts_with($file, $buildDirectory.DIRECTORY_SEPARATOR) && is_file($file), 404);

        $extension = pathinfo($file, PATHINFO_EXTENSION);

        return response()->file($file, [
            'Content-Type' => MimeTypes::getDefault()->getMimeTypes($extension)[0] ?? 'application/octet-stream',
            'Cache-Control' => 'public, max-age=31536000, immutable',
        ]);
    }
}
