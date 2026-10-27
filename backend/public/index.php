<?php

declare(strict_types=1);

use Mvr\Config\Env;
use Mvr\Http\Kernel;
use Mvr\Http\Request;
use Mvr\Support\Container;

require __DIR__ . '/../src/bootstrap.php';

$rootDir = dirname(__DIR__);

// --- ERROR HANDLING ---
$debug = Env::bool('APP_DEBUG');
ini_set('log_errors', '1');
ini_set('error_log', Env::path('ERROR_LOG', $rootDir, 'tmp/error/api--php-error.log'));
ini_set('display_errors', $debug ? '1' : '0');

// Built-in dev server: let it serve the SPA's static files directly.
if (PHP_SAPI === 'cli-server' && is_file(__DIR__ . parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH))) {
    return false;
}

$container = new Container();
(require __DIR__ . '/../config/services.php')($container);

$request = Request::fromGlobals();
if (!str_starts_with($request->path, '/api')) {
    // Everything outside /api is the React SPA (copy frontend/dist here for production).
    $spa = __DIR__ . '/index.html';
    if (is_file($spa)) {
        header('Content-Type: text/html; charset=utf-8');
        readfile($spa);
        return;
    }
}

$container->get(Kernel::class)->handle($request)->send();
