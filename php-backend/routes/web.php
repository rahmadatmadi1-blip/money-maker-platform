<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/

Route::get('/', function () {
    return response()->json([
        'message' => 'Money Maker Platform API',
        'version' => '1.0.0',
        'status' => 'active',
        'documentation' => '/api/docs',
        'health_check' => '/api/health'
    ]);
});

// Redirect all other routes to API documentation or frontend
Route::fallback(function () {
    return response()->json([
        'message' => 'Route not found. Please check API documentation.',
        'api_base' => '/api',
        'health_check' => '/api/health'
    ], 404);
});