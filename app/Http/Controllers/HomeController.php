<?php

namespace App\Http\Controllers;

use App\Enums\Theme;
use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;

class HomeController extends Controller
{
    public function __invoke(Request $request): View
    {
        return view(Theme::fromRequest($request)->view());
    }
}
