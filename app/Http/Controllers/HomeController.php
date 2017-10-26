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
            'domain' => 'required',
        ]);


        $domain = $this->sanitizeDomain($attributes['domain']);

        if ($domain === 'clear') {
            return back();
        }

        if ($domain === '?') {
            flash()->message('A simple digga service by <a href="https://spatie.be/en/opensource">spatie.be</a>.<br>Enter a domain name to retrieve all DNS records.');

            return back();
        }

        $command = 'dig +nocmd ' . escapeshellarg($domain) . ' any +multiline +noall +answer';

        $process = new Process($command);

        $process->run();

        if (!$process->isSuccessful()) {
            flash()->error("Could not fetch dns records for '{$domain}'.");

            return back();
        }

        $dnsInfo = $process->getOutput();

        if ($dnsInfo === "") {
            flash()->error("Could not fetch dns records for '{$domain}'.");

            return back();
        }

        $request->session()->flash('dnsInfo', $dnsInfo);

        return back();
    }

    protected function sanitizeDomain(string $domain = ''): string
    {
        $domain = str_replace(['http://', 'https://'], '', $domain);

        $domain = str_before($domain, '/');

        return strtolower($domain);
    }
}
