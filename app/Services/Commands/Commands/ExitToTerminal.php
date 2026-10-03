<?php

namespace App\Services\Commands\Commands;

use App\Enums\Theme;
use App\Services\Commands\Command;
use Symfony\Component\HttpFoundation\Response;

class ExitToTerminal implements Command
{
    /** @var array<int, string> */
    protected array $exitCommands = ['exit', 'home', 'terminal', 'default'];

    public function canPerform(string $command): bool
    {
        return Theme::current() !== Theme::Crt && in_array($command, $this->exitCommands, true);
    }

    public function perform(string $command): Response
    {
        return Theme::Crt->redirectHome();
    }
}
