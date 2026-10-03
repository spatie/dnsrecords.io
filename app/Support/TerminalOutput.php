<?php

namespace App\Support;

use Illuminate\Support\Collection;

class TerminalOutput
{
    protected string $recordPattern = '/^(?<name>\S+)(?<nameSpacing>\s+)(?<ttl>\d+)(?<ttlSpacing>\s+(?:IN\s+)?)(?<type>[A-Z][A-Z0-9]*)(?<value>\s.*)?$/';

    public function __construct(
        protected string $output,
    ) {}

    /** @return Collection<int, TerminalLine> */
    public function lines(): Collection
    {
        $lines = explode("\n", rtrim(str_replace("\r\n", "\n", $this->output)));

        return collect($lines)->map(fn (string $line) => $this->parseLine($line));
    }

    public function recordCount(): int
    {
        return $this->lines()->filter(fn (TerminalLine $line) => $line->isRecord())->count();
    }

    protected function parseLine(string $line): TerminalLine
    {
        if (! preg_match($this->recordPattern, $line, $matches)) {
            return new TerminalLine($line);
        }

        return new TerminalLine(
            text: $line,
            name: $matches['name'],
            nameSpacing: $matches['nameSpacing'],
            ttl: $matches['ttl'],
            ttlSpacing: $matches['ttlSpacing'],
            type: $matches['type'],
            value: $matches['value'] ?? '',
        );
    }
}
