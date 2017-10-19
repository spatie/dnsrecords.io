<?php

Route::get('/', 'HomeController@index')->name('home');
Route::post('/', 'HomeController@submit');
