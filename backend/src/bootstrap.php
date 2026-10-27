<?php

declare(strict_types=1);

// Composer autoloader when available, otherwise a minimal PSR-4 fallback.
$composer = __DIR__ . '/../vendor/autoload.php';
if (is_file($composer)) {
    require $composer;
} else {
    spl_autoload_register(static function (string $class): void {
        if (str_starts_with($class, 'Mvr\\')) {
            $file = __DIR__ . '/' . str_replace('\\', '/', substr($class, 4)) . '.php';
            if (is_file($file)) {
                require $file;
            }
        }
    });
}

\Mvr\Support\Env::load(__DIR__ . '/../.env');
