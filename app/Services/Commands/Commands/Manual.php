<?php

namespace App\Services\Commands\Commands;

use App\Enums\Theme;
use App\Services\Commands\Command;
use Symfony\Component\HttpFoundation\Response;

class Manual implements Command
{
    public function canPerform(string $command): bool
    {
        return $command === 'help';
    }

    public function perform(string $command): Response
    {
        $theme = Theme::current();

        $oldHomeUrl = Theme::Classic->homeUrl();

        $manualText = collect([
            'Enter a domain name to retrieve all DNS records.',
            "Enter 'ip' to check your own address.",
            "Enter 'clear' to wipe the screen.",
            "Enter 'doom' to play Doom.",
        ])
            ->when($theme === Theme::Crt, fn ($lines) => $lines->push(
                "Enter 'degauss' to give the screen a wobble.",
                "Enter 'green', 'amber' or 'white' to swap the phosphor.",
                "Enter 'power off' to put the screen to sleep.",
                'Record colours: <span class="legend legend--a">A</span> <span class="legend legend--aaaa">AAAA</span> addresses, <span class="legend legend--ns">NS</span> name servers, <span class="legend legend--mx">MX</span> mail, <span class="legend legend--txt">TXT</span> text, <span class="legend legend--cname">CNAME</span> aliases, <span class="legend legend--soa">SOA</span> zone authority.',
                "Enter 'old' to go back to the <a href=\"{$oldHomeUrl}\">old interface</a>.",
            ))
            ->push("Drag this bookmarklet to your toolbar to <a class=\"bookmarklet\" href=\"javascript:location.href='https://dnsrecords.io/'+location.hostname;\">lookup DNS records</a> for sites you're visiting.")
            ->implode('<br>');

        flash()->message($manualText, 'info');

        return $theme->redirectHome();
    }
}
