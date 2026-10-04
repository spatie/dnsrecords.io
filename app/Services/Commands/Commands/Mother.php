<?php

namespace App\Services\Commands\Commands;

use App\Enums\Theme;
use App\Services\Commands\Command;
use Symfony\Component\HttpFoundation\Response;

class Mother implements Command
{
    /** @var array<int, string> */
    protected array $names = ['muthur', 'mu-th-ur', 'mother'];

    public function canPerform(string $command): bool
    {
        return in_array($command, $this->names, true);
    }

    public function perform(string $command): Response
    {
        return Theme::Mother->redirectHome();
    }
}
