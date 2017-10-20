<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Symfony\Component\Process\Process;

class HomeController extends Controller
{
    public function index()
    {
        return view('home.index');
    }

    public function submit(Request $request)
    {
        $attributes = $request->validate([
            'url' => 'required',
        ]);

        $command = 'dig +nocmd "' . $attributes['url'] . '" any +multiline +noall +answer';

        $process = new Process($command);

        $process->run();

        if (!$process->isSuccessful()) {
            flash()->error("Could not fetch dns records for '{$attributes['url']}'");

            return back();
        }

        $dnsInfo = $process->getOutput();

        if ($dnsInfo === "") {
            flash()->error("Could not fetch dns records for '{$attributes['url']}'");

            return back();
        }

        $request->session()->flash('dnsInfo', $dnsInfo);

        flash()->success("Here are the dns records for '{$attributes['url']}'");

        return back();
    }
}
