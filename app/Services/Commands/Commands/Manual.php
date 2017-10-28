<?php

namespace App\Services\Commands\Commands;

use App\Services\Commands\Command;
use Symfony\Component\HttpFoundation\Response;

class Manual implements Command
{
    public function canPerform(string $command): bool
    {
        return $command === '?';
    }

    public function perform(string $command): Response
    {
        $manualText = collect([
            'Enter a domain name to retrieve all DNS records.',
            "Enter 'ip' to check your own address.",
            "Enter 'clear' to wipe the screen.",
            "Enter 'doom' to play Doom.",
        ])->implode('<br>');

        flash()->message($manualText, 'alert');

        return back();
    }
}
