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
            'input' => 'required',
        ]);

        $input = $this->sanitizeInput($attributes['input']);

        if ($input === 'ip') {
            $request->session()->flash('output', "Your ip address is {$request->ip()}");

            return back();
        }

        if ($input === 'clear') {
            return back();
        }

        if ($input === '?') {
            flash()->message('Enter a domain name to retrieve all DNS records.<br>Enter \'ip\' to check your own address.<br>Enter \'clear\' to wipe the screen.', 'message');

            return back();
        }

        $command = 'dig +nocmd ' . escapeshellarg($input) . ' any +multiline +noall +answer';

        $process = new Process($command);

        $process->run();

        $limitedInput = str_limit($input, 75);

        if (! $process->isSuccessful()) {
            flash()->error("Could not fetch dns records for '{$limitedInput}'.");

            return back();
        }

        $dnsInfo = $process->getOutput();

        if ($dnsInfo === "") {
            flash()->error("Could not fetch dns records for '{$limitedInput}'.");

            return back();
        }

        $request->session()->flash('output', $dnsInfo);

        return back();
    }

    protected function sanitizeInput(string $input = ''): string
    {
        $input = str_replace(['http://', 'https://'], '', $input);

        $input = str_before($input, '/');

        return strtolower($input);
    }
}
