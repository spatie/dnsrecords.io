<?php

namespace App\Http\Controllers;

use App\Services\Commands\CommandChain;

class HomeController extends Controller
{
    public function index()
    {
        return view('home.index');
    }

    public function submit($command = null)
    {
        if (!$command) {
            return $this->index();
        }

        return (new CommandChain())->perform(strtolower($command));
    }
}
