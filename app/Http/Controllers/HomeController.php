<?php

namespace App\Http\Controllers;

use App\Services\DnsRecordsRetriever;
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
            'input' => 'required',
        ]);

        if ($attributes['input'] === '?') {
            $manualText = collect([
                'Enter a domain name to retrieve all DNS records.',
                "Enter 'ip' to check your own address.",
                "Enter 'clear' to wipe the screen.",
                "Enter 'doom' to play Doom.",
            ])->implode('<br>');

            flash()->message($manualText);

            return back();
        }

        $input = $attributes['input'];

        if ($input === 'doom') {
            return redirect('https://js-dos.com/games/doom.exe.html');
        }

        if ($input === 'localhost') {
            flash()->error("Please try someone else's domain.");

            return back();
        }

        if ($input === 'ip') {
            $request->session()->flash('output', "Your ip address is {$request->ip()}.");

            return back();
        }

        if ($input === 'clear') {
            return back();
        }

        $dnsRecordsRetriever = new DnsRecordsRetriever();

        $dnsRecords = $dnsRecordsRetriever->retrieveDnsRecords($input);

        if ($dnsRecords === "") {
            flash()->error("Could not fetch dns records for <span class='text-break'>'{$dnsRecordsRetriever->getSanitizedDomain($input)}'.</span>");

            return back();
        }

        $request->session()->flash('output', $dnsRecords);

        return back();
    }
}
