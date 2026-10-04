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
            '<strong>LOOKUP</strong>',
            'Enter a domain name to retrieve all DNS records.',
            "Enter 'ip' to check your own address.",
            '',
            '<strong>COMMANDS</strong>',
            "Enter 'clear' to wipe the screen.",
            "Enter 'doom' to play Doom.",
        ])
            ->when($theme !== Theme::Crt, fn ($lines) => $lines->push(
                '',
                '<strong>INTERFACES</strong>',
                'Enter \'exit\' to return to the <a href="'.Theme::Crt->selectionUrl().'">regular terminal</a>.',
                "Enter 'default' to return to the regular terminal too.",
                "Enter 'old', 'lcars', 'muthur', 'matrix', 'system7' or 'winxp' to switch interfaces.",
            ))
            ->when($theme === Theme::Crt, fn ($lines) => $lines->push(
                "Enter 'green', 'amber' or 'white' to swap the phosphor, 'default' to go back to green.",
                "Enter 'time' to see the time.",
                "Enter 'power off' to put the screen to sleep.",
                '',
                '<strong>RECORD TYPES</strong>',
                'Record colours: <span class="legend legend--a">A</span> <span class="legend legend--aaaa">AAAA</span> addresses, <span class="legend legend--ns">NS</span> name servers, <span class="legend legend--mx">MX</span> mail, <span class="legend legend--txt">TXT</span> text, <span class="legend legend--cname">CNAME</span> aliases, <span class="legend legend--soa">SOA</span> zone authority.',
                '',
                '<strong>INTERFACES</strong>',
                "Enter 'old' to go back to the <a href=\"{$oldHomeUrl}\">old interface</a>.",
                'Enter \'muthur\' to talk to <a href="'.Theme::Mother->homeUrl().'">MU/TH/UR 6000</a>.',
                'Enter \'lcars\' to open the <a href="'.Theme::Lcars->homeUrl().'">LCARS console</a>.',
                'Enter \'matrix\' to open <a href="'.Theme::Matrix->homeUrl().'">the Matrix</a>.',
                'Enter \'system7\' to open <a href="'.Theme::System7->homeUrl().'">System 7</a>.',
                'Enter \'winxp\' to open <a href="'.Theme::WinXp->homeUrl().'">Windows XP</a>.',
            ))
            ->when($theme === Theme::Mother, fn ($lines) => $lines->push(
                '',
                '<strong>MU/TH/UR</strong>',
                "Enter 'copy' to copy the records of the last response.",
                "Enter 'what are my chances' for an honest assessment.",
                "Enter 'special order 937' for orders that are not meant for you.",
            ))
            ->push(
                '',
                '<strong>BOOKMARKLET</strong>',
                "Drag this bookmarklet to your toolbar to <a class=\"bookmarklet\" href=\"javascript:location.href='https://dnsrecords.io/'+location.hostname;\">lookup DNS records</a> for sites you're visiting.",
            )
            ->implode('<br>');

        flash()->message($manualText, 'info');

        return response()->view($theme->view());
    }
}
