<?php

Route::get('/', 'HomeController@index')->name('home');

Route::middleware(['sanitizeDnsLookup', 'logRequest'])->group(function() {
    Route::post('/', 'HomeController@submit');

    Route::match(['get', 'post'], '/{command}', 'HomeController@submit')->where('command', '.+');
});

