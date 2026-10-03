<?php

namespace App\Support;

use Illuminate\Support\Collection;

/**
 * Groups dig output by record type for the LCARS console. Lines that dig
 * spreads over several rows, like an SOA in multiline mode, are folded
 * back into the record they belong to.
 */
class RecordReadout
{
    /** @var Collection<int, TerminalLine> */
    protected Collection $records;

    /** @var Collection<int, string> */
    protected Collection $messages;

    public function __construct(TerminalOutput $output)
    {
        $this->records = collect();
        $this->messages = collect();

        foreach ($output->lines() as $line) {
            $this->add($line);
        }
    }

    /** @return Collection<string, Collection<int, TerminalLine>> */
    public function groups(): Collection
    {
        return $this->records->groupBy('type');
    }

    /** @return Collection<int, string> */
    public function messages(): Collection
    {
        return $this->messages;
    }

    public function recordCount(): int
    {
        return $this->records->count();
    }

    protected function add(TerminalLine $line): void
    {
        if ($line->isRecord()) {
            $line->value = trim($line->value);

            $this->records->push($line);

            return;
        }

        if (trim($line->text) === '') {
            return;
        }

        if ($this->continuesPreviousRecord($line)) {
            $this->records->last()->value .= "\n".trim($line->text);

            return;
        }

        $this->messages->push($line->text);
    }

    protected function continuesPreviousRecord(TerminalLine $line): bool
    {
        if ($this->records->isEmpty()) {
            return false;
        }

        $value = $this->records->last()->value;

        return substr_count($value, '(') > substr_count($value, ')');
    }
}
