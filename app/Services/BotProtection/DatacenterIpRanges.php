<?php

namespace App\Services\BotProtection;

class DatacenterIpRanges
{
    /** @var array<int, array<int, array{0: string, 1: string, 2: int}>>|null */
    protected ?array $ranges = null;

    public function __construct(
        protected string $path,
    ) {}

    public function asnFor(string $ip): ?int
    {
        $packedIp = @inet_pton($ip);

        if ($packedIp === false) {
            return null;
        }

        $hexIp = bin2hex($packedIp);

        $ranges = $this->ranges()[strlen($packedIp) === 4 ? 4 : 6] ?? [];

        $low = 0;
        $high = count($ranges) - 1;
        $candidate = null;

        while ($low <= $high) {
            $middle = intdiv($low + $high, 2);

            if (strcmp($ranges[$middle][0], $hexIp) <= 0) {
                $candidate = $ranges[$middle];
                $low = $middle + 1;

                continue;
            }

            $high = $middle - 1;
        }

        if (! $candidate) {
            return null;
        }

        if (strcmp($hexIp, $candidate[1]) > 0) {
            return null;
        }

        return $candidate[2];
    }

    /** @return array<int, array<int, array{0: string, 1: string, 2: int}>> */
    protected function ranges(): array
    {
        if ($this->ranges !== null) {
            return $this->ranges;
        }

        return $this->ranges = file_exists($this->path)
            ? require $this->path
            : [];
    }
}
