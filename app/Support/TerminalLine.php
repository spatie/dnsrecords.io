<?php

namespace App\Support;

class TerminalLine
{
    public function __construct(
        public string $text,
        public ?string $name = null,
        public string $nameSpacing = '',
        public ?string $ttl = null,
        public string $ttlSpacing = '',
        public ?string $type = null,
        public string $value = '',
    ) {}

    public function isRecord(): bool
    {
        return $this->type !== null;
    }

    public function length(): int
    {
        return mb_strlen(str_replace("\t", '    ', $this->text));
    }
}
