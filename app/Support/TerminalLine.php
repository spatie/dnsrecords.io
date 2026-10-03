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

    public function typeDescription(): ?string
    {
        return match ($this->type) {
            'A' => 'A: IPv4 address',
            'AAAA' => 'AAAA: IPv6 address',
            'CNAME' => 'CNAME: alias for another name',
            'MX' => 'MX: mail server',
            'NS' => 'NS: name server',
            'SOA' => 'SOA: start of authority',
            'TXT' => 'TXT: text, often verification or SPF',
            'CAA' => 'CAA: certificate authorities allowed to issue',
            'SRV' => 'SRV: service location',
            'PTR' => 'PTR: reverse lookup pointer',
            default => $this->type,
        };
    }

    public function length(): int
    {
        return mb_strlen(str_replace("\t", '    ', $this->text));
    }
}
