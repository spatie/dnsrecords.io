<?php

use App\Http\Controllers\BuildAssetController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\PerformCommandController;
use App\Http\Controllers\RenamedThemeRedirectController;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\Facades\Route;
use Illuminate\View\Middleware\ShareErrorsFromSession;

Route::get('static/{path}', BuildAssetController::class)
    ->where('path', '.+')
    ->withoutMiddleware([StartSession::class, ShareErrorsFromSession::class]);

Route::middleware('cacheAtEdge')->withoutMiddleware([StartSession::class, ShareErrorsFromSession::class])->group(function () {
    Route::get('/', HomeController::class)->name('home');
    Route::get('old', HomeController::class)->name('old.home');
    Route::get('lcars', HomeController::class)->name('lcars.home');
    Route::get('muthur', HomeController::class)->middleware('noIndex')->name('mother.home');
    Route::get('matrix', HomeController::class)->middleware('noIndex')->name('matrix.home');
    Route::get('system7', HomeController::class)->middleware('noIndex')->name('system7.home');
    Route::get('winxp', HomeController::class)->middleware('noIndex')->name('winxp.home');

    Route::middleware('noIndex')->group(function () {
        foreach (['alien', 'mother', 'startrek'] as $renamedTheme) {
            Route::match(['get', 'post'], $renamedTheme, RenamedThemeRedirectController::class);
            Route::match(['get', 'post'], "{$renamedTheme}/{command}", RenamedThemeRedirectController::class)->where('command', '.+');
        }
    });
});

Route::middleware(['blockCrawlers', 'throttle:lookups', 'noIndex', 'sanitizeCommand', 'logRequest'])->group(function () {
    $interfaces = [
        'old' => 'old',
        'lcars' => 'lcars',
        'muthur' => 'mother',
        'matrix' => 'matrix',
        'system7' => 'system7',
        'winxp' => 'winxp',
    ];

    foreach ($interfaces as $prefix => $routeName) {
        Route::prefix($prefix)->name("{$routeName}.")->group(function () {
            Route::post('/', PerformCommandController::class);

            Route::match(['get', 'post'], '{command}', PerformCommandController::class)->where('command', '.+')->name('command');
        });
    }

    Route::post('/', PerformCommandController::class);

    Route::match(['get', 'post'], '{command}', PerformCommandController::class)->where('command', '.+')->name('command');
});
