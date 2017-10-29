<?php

namespace App\Services\Commands\Commands;

use App\Services\Commands\Command;
use Symfony\Component\HttpFoundation\Response;

class Clear implements Command
{
    public function canPerform(string $command): bool
    {
        return $command === 'clear';
    }

    public function perform(string $command): Response
    {
        return redirect('/');
    }
}
