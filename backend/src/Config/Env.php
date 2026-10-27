<?php declare(strict_types=1);

namespace Mvr\Config;

use RuntimeException;

final class Env
{
  public static function get(string $key, ?string $default = null): string
  {
    $value = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);

    if ($value === false || $value === null || $value === '') {
      if ($default === null) {
        throw new RuntimeException("A required environment variable is missing: {$key}");
      }
      return $default;
    }

    return (string) $value;
  }

  public static function bool(string $key, bool $default = false): bool
  {
    return filter_var(
      self::get($key, $default ? 'true' : 'false'),
      FILTER_VALIDATE_BOOL
    );
  }

  public static function list(string $key, string $default = ''): array
  {
    $items = array_map('trim', explode(',', self::get($key, $default)));

    return array_values(array_filter($items, static fn (string $i): bool => $i !== ''));
  }

  public static function path(string $key, string $base, ?string $default = null): string
  {
    $value = self::get($key, $default);

    return str_starts_with($value, '/') ? $value : $base . '/' . ltrim($value, '/');
  }
}