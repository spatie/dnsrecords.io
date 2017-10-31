<?php

Route::get('/', 'HomeController@index')->name('home');
Route::post('/', 'HomeController@submit')->middleware('logRequest')->where('command', '.+');
Route::match(['get', 'post'], '/{command}', 'HomeController@submit')->middleware('logRequest')->where('command', '.+');
