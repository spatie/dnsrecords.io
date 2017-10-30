<?php

namespace App\Services\Commands;

use App\Services\Commands\Commands\Clear;
use App\Services\Commands\Commands\DnsLookup;
use App\Services\Commands\Commands\Doom;
use App\Services\Commands\Commands\Ip;
use App\Services\Commands\Commands\Localhost;
use App\Services\Commands\Commands\Manual;
use Symfony\Component\HttpFoundation\Response;

class CommandChain
{
    protected $commands = [
        Manual::class,
        Localhost::class,
        Ip::class,
        DnsLookup::class,
    ];

    public function perform(string $command): Response
    {
        return collect($this->commands)
                ->map(function (string $commandClassName) {
                    return new $commandClassName;
                })
                ->first->canPerform($command)
                ->perform($command);
    }
}
