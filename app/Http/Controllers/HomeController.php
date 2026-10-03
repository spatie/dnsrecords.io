<?php

namespace App\Http\Controllers;

use App\Enums\Theme;
use App\Services\Commands\CommandChain;
use Illuminate\Http\Request;

class HomeController extends Controller
{
    public function index(Request $request)
    {
        return view(Theme::fromRequest($request)->view());
    }

    public function submit(Request $request, $command = null)
    {
        $command = $request['command'] ?? $command;

        if (!$command) {
            return $this->index($request);
        }

        return (new CommandChain())->perform(strtolower($command));
    }
}
