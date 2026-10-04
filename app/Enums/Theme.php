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
    case Matrix;
    case System7;
    case WinXp;

    public static function fromRequest(Request $request): self
    {
        return match (true) {
            $request->routeIs('old.*') => self::Classic,
            $request->routeIs('lcars.*') => self::Lcars,
            $request->routeIs('mother.*') => self::Mother,
            $request->routeIs('matrix.*') => self::Matrix,
            $request->routeIs('system7.*') => self::System7,
            $request->routeIs('winxp.*') => self::WinXp,
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
            self::Matrix => 'interfaces.matrix',
            self::System7, self::WinXp => 'interfaces.index',
        };
    }

    public function homeUrl(): string
    {
        return match ($this) {
            self::Crt => route('home'),
            self::Classic => route('old.home'),
            self::Lcars => route('lcars.home'),
            self::Mother => route('mother.home'),
            self::Matrix => route('matrix.home'),
            self::System7 => route('system7.home'),
            self::WinXp => route('winxp.home'),
        };
    }

    public function selectionUrl(): string
    {
        return $this === self::Crt
            ? route('home', ['theme' => 'terminal'])
            : $this->homeUrl();
    }

    public function commandUrl(string $command): string
    {
        return match ($this) {
            self::Crt => route('command', ['command' => $command]),
            self::Classic => route('old.command', ['command' => $command]),
            self::Lcars => route('lcars.command', ['command' => $command]),
            self::Mother => route('mother.command', ['command' => $command]),
            self::Matrix => route('matrix.command', ['command' => $command]),
            self::System7 => route('system7.command', ['command' => $command]),
            self::WinXp => route('winxp.command', ['command' => $command]),
        };
    }

    public function redirectHome(): RedirectResponse
    {
        return redirect($this->homeUrl());
    }
}
