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

    public function submit(Request $request)
    {
        $attributes = $request->validate([
            'command' => 'required',
        ]);

        return (new CommandChain())->perform($attributes['command']);
    }
}
