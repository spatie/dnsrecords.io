<?php

namespace App\Services\Commands;

use App\Services\Commands\Command\Clear;
use App\Services\Commands\Command\DnsLookup;
use App\Services\Commands\Command\Doom;
use App\Services\Commands\Command\Ip;
use App\Services\Commands\Command\Localhost;
use App\Services\Commands\Command\Manual;

class CommandChain
{
    protected $commands = [
        Manual::class,
        Localhost::class,
        Clear::class,
        Ip::class,
        Doom::class,
        DnsLookup::class,
    ];

    public function perform(string $command)
    {
        return collect($this->commands)
                ->map(function (string $commandClassName) {
                    return new $commandClassName;
                })
                ->first->canPerform($command)
                ->perform($command);
    }
}
