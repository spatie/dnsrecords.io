<?php

namespace App\Http\Controllers;

use App\Exceptions\DnsRecordsCouldNotBeFetched;
use Exception;
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
        $validatedAttributed = $request->validate([
            'input' => 'required',
        ]);

        if ($validatedAttributed['input'] === '?') {
            flash()->message('Enter a domain name to retrieve all DNS records.<br>Enter \'ip\' to check your own address.<br>Enter \'clear\' to wipe the screen.', 'message');

            return back();
        }

        $input = $this->sanitizeInput($validatedAttributed['input']);

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

        $dnsInfo = cache()->remember(md5($input), 1, function () use ($input) {
            return $this->getDnsRecords($input);
        });

        if ($dnsInfo === "") {
            flash()->error("Could not fetch dns records for <span class='text-break'>'{$input}'.</span>");

            return back();
        }

        $request->session()->flash('output', $dnsInfo);

        return back();
    }

    protected function getDnsRecords(string $domain): string
    {
        try {
            return collect([
                'A',
                'AAAA',
                'NS',
                'SOA',
                'MX',
                'TXT',
                'DNSKEY',
            ])
                ->map(function (string $recordType) use ($domain) {
                    $command = 'dig +nocmd ' . escapeshellarg($domain) . " {$recordType} +multiline +noall +answer";

                    $process = new Process($command);

                    $process->run();

                    if (! $process->isSuccessful()) {
                        throw DnsRecordsCouldNotBeFetched::processFailed($process, $domain);
                    }

                    return $process->getOutput();
                })->implode('');
        } catch (Exception $e) {
            return '';
        }

    }

    protected function sanitizeInput(string $input = ''): string
    {
        $input = str_replace(['http://', 'https://'], '', $input);

        $input = parse_url("http://{$input}", PHP_URL_HOST);

        $input = str_before($input, '/');

        return strtolower($input);
    }
}
