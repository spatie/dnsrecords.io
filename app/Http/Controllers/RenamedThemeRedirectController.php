<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RenamedThemeRedirectController extends Controller
{
    /** @var array<string, string> */
    protected array $renamedPaths = [
        '/alien' => '/muthur',
        '/mother' => '/muthur',
        '/startrek' => '/lcars',
    ];

    /**
     * Sends the old theme urls, lookups and query strings included, to their
     * new paths. The request uri is used as is, so encoded lookups stay intact.
     */
    public function __invoke(Request $request): RedirectResponse
    {
        $requestUri = $request->getRequestUri();

        foreach ($this->renamedPaths as $oldPath => $newPath) {
            if (Str::startsWith($requestUri, $oldPath)) {
                return redirect($newPath.Str::after($requestUri, $oldPath), 301);
            }
        }

        return redirect('/', 301);
    }
}
