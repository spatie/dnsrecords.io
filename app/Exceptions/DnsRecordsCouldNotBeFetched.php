<?php



namespace App\Exceptions;

use Exception;
use Symfony\Component\Process\Process;

class DnsRecordsCouldNotBeFetched extends Exception
{
    /** @var string */
    public $domain = '';

    public static function processFailed(Process $process, string $domain)
    {
        $exception =  new static("Could not fetch dns records for <span class='text-break'>'{$domain}'.</span>");

        $exception->domain = $domain;

        return $exception;
    }
}
