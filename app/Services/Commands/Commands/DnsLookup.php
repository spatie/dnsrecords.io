<?php

namespace App\Services\Commands\Commands;

use App\Enums\Theme;
use App\Services\Commands\Command;
use App\Services\Dns\Dns;
use Exception;
use Symfony\Component\HttpFoundation\Response;

class DnsLookup implements Command
{
    public function canPerform(string $command): bool
    {
        return true;
    }

    public function perform(string $command): Response
    {
        $theme = Theme::current();

        $dns = new Dns($command);

        try {
            $dnsRecords = $dns->getRecords();

            $domain = $dns->getDomain();
        } catch (Exception) {
            $dnsRecords = '';
        }

        if ($dnsRecords === '') {
            $errorText = __('errors.noDnsRecordsFound', ['domain' => $domain ?? null]);

            flash()->error($errorText);

            return response()->view($theme->view(), [], 404);
        }

        return response()->view($theme->view(), ['output' => $dnsRecords, 'domain' => $domain]);
    }
}
