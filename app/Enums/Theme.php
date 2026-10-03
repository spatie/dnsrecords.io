<?php

namespace App\Enums;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

enum Theme
{
    case Crt;
    case Classic;

    public static function fromRequest(Request $request): self
    {
        return $request->routeIs('old.*')
            ? self::Classic
            : self::Crt;
    }

    public static function current(): self
    {
        return self::fromRequest(request());
    }

    public function view(): string
    {
        return match ($this) {
            self::Crt => 'crt.index',
            self::Classic => 'home.index',
        };
    }

    public function homeUrl(): string
    {
        return match ($this) {
            self::Crt => route('home'),
            self::Classic => route('old.home'),
        };
    }

    public function commandUrl(string $command): string
    {
        return match ($this) {
            self::Crt => route('command', ['command' => $command]),
            self::Classic => route('old.command', ['command' => $command]),
        };
    }

    public function redirectHome(): RedirectResponse
    {
        return redirect($this->homeUrl());
    }
}
