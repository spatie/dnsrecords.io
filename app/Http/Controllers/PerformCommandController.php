<?php

namespace App\Http\Controllers;

use App\Enums\Theme;
use App\Services\Commands\CommandChain;
use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PerformCommandController extends Controller
{
    public function __invoke(Request $request, ?string $command = null): Response|View
    {
        $command = $request->input('command') ?? $command;

        if (! $command) {
            return view(Theme::fromRequest($request)->view());
        }

        return (new CommandChain)->perform(strtolower($command));
    }
}
