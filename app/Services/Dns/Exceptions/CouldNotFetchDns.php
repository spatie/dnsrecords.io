<?php

namespace App\Services\Dns\Exceptions;

use Exception;

class CouldNotFetchDns extends Exception
{
    public static function digReturnedWithError(string $output): static
    {
        return new static("Dig command failed with message: `{$output}`");
    }
}
