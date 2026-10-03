<?php

use App\Http\Controllers\HomeController;
use Illuminate\Support\Facades\Route;

Route::get('/', [HomeController::class, 'index'])->name('home');
Route::get('old', [HomeController::class, 'index'])->name('old.home');
Route::get('startrek', [HomeController::class, 'index'])->name('startrek.home');
Route::get('alien', [HomeController::class, 'index'])->middleware('noIndex')->name('alien.home');

Route::middleware(['blockCrawlers', 'throttle:lookups', 'noIndex', 'sanitizeCommand', 'logRequest'])->group(function () {
    Route::prefix('old')->name('old.')->group(function () {
        Route::post('/', [HomeController::class, 'submit']);

        Route::match(['get', 'post'], '{command}', [HomeController::class, 'submit'])->where('command', '.+')->name('command');
    });

    Route::prefix('startrek')->name('startrek.')->group(function () {
        Route::post('/', [HomeController::class, 'submit']);

        Route::match(['get', 'post'], '{command}', [HomeController::class, 'submit'])->where('command', '.+')->name('command');
    });

    Route::prefix('alien')->name('alien.')->group(function () {
        Route::post('/', [HomeController::class, 'submit']);

        Route::match(['get', 'post'], '{command}', [HomeController::class, 'submit'])->where('command', '.+')->name('command');
    });

    Route::post('/', [HomeController::class, 'submit']);

    Route::match(['get', 'post'], '/{command}', [HomeController::class, 'submit'])->where('command', '.+')->name('command');
});
