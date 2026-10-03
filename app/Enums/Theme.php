<?php

namespace App\Enums;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

enum Theme
{
    case Crt;
    case Classic;
    case Lcars;
    case Mother;

    public static function fromRequest(Request $request): self
    {
        return match (true) {
            $request->routeIs('old.*') => self::Classic,
            $request->routeIs('lcars.*') => self::Lcars,
            $request->routeIs('mother.*') => self::Mother,
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
            self::Lcars => 'startrek.index',
            self::Mother => 'alien.index',
        };
    }

    public function homeUrl(): string
    {
        return match ($this) {
            self::Crt => route('home'),
            self::Classic => route('old.home'),
            self::Lcars => route('lcars.home'),
            self::Mother => route('mother.home'),
        };
    }

    public function commandUrl(string $command): string
    {
        return match ($this) {
            self::Crt => route('command', ['command' => $command]),
            self::Classic => route('old.command', ['command' => $command]),
            self::Lcars => route('lcars.command', ['command' => $command]),
            self::Mother => route('mother.command', ['command' => $command]),
        };
    }

    public function redirectHome(): RedirectResponse
    {
        return redirect($this->homeUrl());
    }
}
