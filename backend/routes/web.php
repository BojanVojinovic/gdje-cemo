<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'success' => true,
        'data' => [
            'name' => 'Shall We API',
            'version' => '1.0.0',
        ],
        'message' => null,
    ]);
});
