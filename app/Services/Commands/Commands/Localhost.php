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
        return response([
            'message'   => 'Please try someone else\'s domain.',
            'type'      => 'danger',
        ]);
    }
}
