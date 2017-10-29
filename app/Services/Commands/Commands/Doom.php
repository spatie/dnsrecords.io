<?php

namespace App\Services\Commands\Commands;

use App\Services\Commands\Command;
use Symfony\Component\HttpFoundation\Response;

class Doom implements Command
{
    public function canPerform(string $command): bool
    {
        return $command === 'doom';
    }

    public function perform(string $command): Response
    {
        return redirect('https://js-dos.com/games/doom.exe.html');
    }
}
