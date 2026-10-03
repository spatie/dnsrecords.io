<?php

namespace App\Enums;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

enum Theme
{
    case Crt;
    case Classic;
    case Startrek;
    case Alien;

    public static function fromRequest(Request $request): self
    {
        return match (true) {
            $request->routeIs('old.*') => self::Classic,
            $request->routeIs('startrek.*') => self::Startrek,
            $request->routeIs('alien.*') => self::Alien,
            default => self::Crt,
        };
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
            self::Startrek => 'startrek.index',
            self::Alien => 'alien.index',
        };
    }

    public function homeUrl(): string
    {
        return match ($this) {
            self::Crt => route('home'),
            self::Classic => route('old.home'),
            self::Startrek => route('startrek.home'),
            self::Alien => route('alien.home'),
        };
    }

    public function commandUrl(string $command): string
    {
        return match ($this) {
            self::Crt => route('command', ['command' => $command]),
            self::Classic => route('old.command', ['command' => $command]),
            self::Startrek => route('startrek.command', ['command' => $command]),
            self::Alien => route('alien.command', ['command' => $command]),
        };
    }

    public function redirectHome(): RedirectResponse
    {
        return redirect($this->homeUrl());
    }
}
