<?php

use App\Http\Controllers\HomeController;
use Illuminate\Support\Facades\Route;

Route::get('/', [HomeController::class, 'index'])->name('home');

Route::middleware(['blockCrawlers', 'throttle:lookups', 'noIndex', 'sanitizeCommand', 'logRequest'])->group(function () {
    Route::post('/', [HomeController::class, 'submit']);

    Route::match(['get', 'post'], '/{command}', [HomeController::class, 'submit'])->where('command', '.+')->name('command');
});
