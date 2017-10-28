<?php

namespace App\Services\Commands\Commands;

use App\Services\Commands\Command;
use Symfony\Component\HttpFoundation\Response;

class Localhost implements Command
{
    public function canPerform(string $command): bool
    {
        return $command === 'localhost';
    }

    public function perform(string $command): Response
    {
        flash()->error("Please try someone else's domain.");

        return back();
    }
}
