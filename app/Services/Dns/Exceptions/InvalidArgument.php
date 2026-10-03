<?php

namespace App\Services\Dns\Exceptions;

use InvalidArgumentException;

class InvalidArgument extends InvalidArgumentException
{
    public static function domainIsMissing(): static
    {
        return new static('A domain name is required');
    }

    /** @param array<int, string> $validRecordTypes */
    public static function filterIsNotAValidRecordType(string $filter, array $validRecordTypes): static
    {
        $recordTypeString = implode(', ', $validRecordTypes);

        return new static("The given filter `{$filter}` is not valid. It should be one of {$recordTypeString}");
    }
}
