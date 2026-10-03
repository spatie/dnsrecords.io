<?php

use Spatie\HttpLogger\DefaultLogWriter;
use Spatie\HttpLogger\LogNonGetRequests;

return [
    'enabled' => env('HTTP_LOGGER_ENABLED', true),

    'log_profile' => LogNonGetRequests::class,

    'log_writer' => DefaultLogWriter::class,

    'log_channel' => env('LOG_CHANNEL', 'stack'),

    'log_level' => 'info',

    'except' => [
        'password',
        'password_confirmation',
    ],

    'sanitize_headers' => [
        'authorization',
        'cookie',
        'x-csrf-token',
        'x-xsrf-token',
    ],
];
