<?php

namespace App\Http\Controllers;

use App\Services\Commands\CommandChain;
use Illuminate\Http\Request;

class HomeController extends Controller
{
    public function index()
    {
        return view('home.index');
    }

    public function submit($command = null, Request $request)
    {
        $command = $request['command'] ?? $command;

        if (!$command) {
            return $this->index();
        }

        return (new CommandChain())->perform(strtolower($command));
    }
}
