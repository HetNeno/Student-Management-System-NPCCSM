<?php

use Illuminate\Support\Facades\Route;

/*
| The React SPA (repo root `src/`) is the only UI.
|  - Development: Vite serves it on :3000 and proxies /api to this app.
|  - Production:  `npm run build` writes it to public/spa; every non-API path
|    returns its index.html and React Router renders the page. Access control
|    is enforced by the /api routes, not by which HTML is served.
*/
$spa = function () {
    $index = public_path('spa/index.html');

    abort_unless(is_file($index), 503, 'Frontend not built. Run `npm run build` in the project root, or use the Vite dev server on port 3000.');

    return response()->file($index, ['Cache-Control' => 'no-cache']);
};

// Named so Laravel's auth helpers can resolve route('login').
Route::get('/login', $spa)->name('login');

Route::get('/{path?}', $spa)->where('path', '^(?!api/|up$|spa/).*$')->name('spa');
