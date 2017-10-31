<?php

use Illuminate\Support\Facades\Route;

Route::get('/', 'HomeController@index')
    ->name('home');

Route::post('/', 'HomeController@submit')
    ->middleware(['sanitizeDnsLookup', 'logRequest']);

Route::match(['get', 'post'], '/{command}', 'HomeController@submit')
    ->middleware(['sanitizeDnsLookup', 'logRequest'])
    ->where('command', '.+');
