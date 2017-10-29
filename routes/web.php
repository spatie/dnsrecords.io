<?php

Route::get('/', 'HomeController@index')->name('home');
Route::match(['get', 'post'], '/{command}', 'HomeController@submit')->middleware('logRequest');
