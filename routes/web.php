<?php

use App\Http\Controllers\HomeController;
use App\Http\Controllers\PerformCommandController;
use App\Http\Controllers\RenamedThemeRedirectController;
use Illuminate\Support\Facades\Route;

Route::get('/', HomeController::class)->name('home');
Route::get('old', HomeController::class)->name('old.home');
Route::get('lcars', HomeController::class)->name('lcars.home');
Route::get('mother', HomeController::class)->middleware('noIndex')->name('mother.home');

Route::match(['get', 'post'], 'alien', RenamedThemeRedirectController::class)->middleware('noIndex');
Route::match(['get', 'post'], 'startrek', RenamedThemeRedirectController::class)->middleware('noIndex');

Route::middleware(['blockCrawlers', 'throttle:lookups', 'noIndex'])->group(function () {
    Route::match(['get', 'post'], 'alien/{command}', RenamedThemeRedirectController::class)->where('command', '.+');
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

    Route::prefix('mother')->name('mother.')->group(function () {
        Route::post('/', PerformCommandController::class);

        Route::match(['get', 'post'], '{command}', PerformCommandController::class)->where('command', '.+')->name('command');
    });

    Route::post('/', PerformCommandController::class);

    Route::match(['get', 'post'], '{command}', PerformCommandController::class)->where('command', '.+')->name('command');
});
