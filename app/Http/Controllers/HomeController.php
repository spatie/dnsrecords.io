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

        $url = $this->sanitizeUrl($attributes['url']);

        if ($url === 'clear') {
            return back();
        }

        if ($url === '?') {
            flash()->message('A simple digga service by <a href="https://spatie.be/en/opensource">spatie.be</a>.<br>Enter a domain name to retrieve all DNS records.');

            return back();
        }

        $command = 'dig +nocmd ' . escapeshellarg($url) . ' any +multiline +noall +answer';

        $process = new Process($command);

        $process->run();

        if (!$process->isSuccessful()) {
            flash()->error("Could not fetch dns records for '{$url}'.");

            return back();
        }

        $dnsInfo = $process->getOutput();

        if ($dnsInfo === "") {
            flash()->error("Could not fetch dns records for '{$url}'.");

            return back();
        }

        $request->session()->flash('dnsInfo', $dnsInfo);

        return back();
    }

    protected function sanitizeUrl(string $url = ''): string
    {
        $url = str_replace(['http://', 'https://'], '', $url);

        $url = str_before($url, '/');

        return strtolower($url);
    }
}
