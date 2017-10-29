<?php

namespace App\Services\Commands\Commands;

use App\Services\Commands\Command;
use Symfony\Component\HttpFoundation\Response;

class Ip implements Command
{
    public function canPerform(string $command): bool
    {
        return $command === 'ip';
    }

    public function perform(string $command): Response
    {
        $output = 'Your ip address is ' . request()->ip() . '.';

        return response()->view('home.index', ['output'=> $output]);
    }
}
