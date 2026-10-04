<?php

use App\Http\Controllers\HomeController;
use App\Http\Controllers\PerformCommandController;
use App\Http\Controllers\RenamedThemeRedirectController;
use Illuminate\Support\Facades\Route;

Route::get('/', HomeController::class)->name('home');
Route::get('old', HomeController::class)->name('old.home');
Route::get('lcars', HomeController::class)->name('lcars.home');
Route::get('muthur', HomeController::class)->middleware('noIndex')->name('mother.home');
Route::get('matrix', HomeController::class)->middleware('noIndex')->name('matrix.home');
Route::get('system7', HomeController::class)->middleware('noIndex')->name('system7.home');
Route::get('winxp', HomeController::class)->middleware('noIndex')->name('winxp.home');

Route::match(['get', 'post'], 'alien', RenamedThemeRedirectController::class)->middleware('noIndex');
Route::match(['get', 'post'], 'mother', RenamedThemeRedirectController::class)->middleware('noIndex');
Route::match(['get', 'post'], 'startrek', RenamedThemeRedirectController::class)->middleware('noIndex');

Route::middleware(['blockCrawlers', 'throttle:lookups', 'noIndex'])->group(function () {
    Route::match(['get', 'post'], 'alien/{command}', RenamedThemeRedirectController::class)->where('command', '.+');
    Route::match(['get', 'post'], 'mother/{command}', RenamedThemeRedirectController::class)->where('command', '.+');
    Route::match(['get', 'post'], 'startrek/{command}', RenamedThemeRedirectController::class)->where('command', '.+');
});

Route::middleware(['blockCrawlers', 'throttle:lookups', 'noIndex', 'sanitizeCommand', 'logRequest'])->group(function () {
    Route::prefix('old')->name('old.')->group(function () {
        Route::post('/', PerformCommandController::class);

        Route::match(['get', 'post'], '{command}', PerformCommandController::class)->where('command', '.+')->name('command');
    });

    Route::prefix('lcars')->name('lcars.')->group(function () {
        Route::post('/', PerformCommandController::class);

        Route::match(['get', 'post'], '{command}', PerformCommandController::class)->where('command', '.+')->name('command');
    });

    Route::prefix('muthur')->name('mother.')->group(function () {
        Route::post('/', PerformCommandController::class);

        Route::match(['get', 'post'], '{command}', PerformCommandController::class)->where('command', '.+')->name('command');
    });

    foreach (['matrix', 'system7', 'winxp'] as $interface) {
        Route::prefix($interface)->name("{$interface}.")->group(function () {
            Route::post('/', PerformCommandController::class);

            Route::match(['get', 'post'], '{command}', PerformCommandController::class)->where('command', '.+')->name('command');
        });
    }

    Route::post('/', PerformCommandController::class);

    Route::match(['get', 'post'], '{command}', PerformCommandController::class)->where('command', '.+')->name('command');
});
