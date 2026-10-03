<?php

namespace App\Services\Commands\Commands;

use App\Enums\Theme;
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
        $ip = request()->ip();

        $output = "Your ip address is {$ip}.";

        return response()->view(Theme::current()->view(), ['output' => $output]);
    }
}
