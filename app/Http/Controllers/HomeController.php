<?php

namespace App\Http\Controllers;

use App\Services\Commands\CommandChain;

class HomeController extends Controller
{
    public function index()
    {
        return view('home.index');
    }

    public function submit($command)
    {
        if(request()->header('Accept') !== 'application/json')
        {
            return redirect()->to('/#'.$command);
        }

        return (new CommandChain())->perform(strtolower($command));
    }

}
