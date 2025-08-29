<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        env('FRONTEND_URL', 'http://localhost:3000'),
        env('FRONTEND_BUILD_URL', 'http://localhost:4000'),
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:4000',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:4000',
        'https://localhost:3000',
        'https://localhost:3001',
    ],

    'allowed_origins_patterns' => [
        // Allow any localhost port in development
        '/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/',
    ],

    'allowed_headers' => [
        'Accept',
        'Authorization',
        'Content-Type',
        'X-Requested-With',
        'Origin',
        'X-CSRF-TOKEN',
        'X-Socket-ID',
        'Cache-Control',
        'Pragma',
    ],

    'exposed_headers' => [
        'Authorization',
        'X-Total-Count',
        'X-Page-Count',
        'X-Per-Page',
        'X-Current-Page',
    ],

    'max_age' => 0,

    'supports_credentials' => true,

];