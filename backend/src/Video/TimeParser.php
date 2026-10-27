<?php

declare(strict_types=1);

namespace Mvr\Video;

/** Pure time helpers shared by VEO parsing and marker validation. */
final class TimeParser
{
    /** "41:51" → 2511, "1:02:03" → 3723, "90" → 90, invalid → null */
    public static function toSeconds(string $value): ?int
    {
        $value = trim($value);
        if (!preg_match('/^\d+(:\d{1,2}){0,2}$/', $value)) {
            return null;
        }
        $parts = array_map('intval', explode(':', $value));
        foreach (array_slice($parts, 1) as $p) {
            if ($p > 59) {
                return null;
            }
        }
        return array_reduce($parts, static fn (int $acc, int $p) => $acc * 60 + $p, 0);
    }

    /** Reads the "#t=mm:ss" fragment of a VEO link. */
    public static function fromVeoUrl(string $url): ?int
    {
        return preg_match('/#(?:.*&)?t=([\d:]+)/', $url, $m) ? self::toSeconds($m[1]) : null;
    }

    public static function format(int $seconds): string
    {
        $h = intdiv($seconds, 3600);
        $m = intdiv($seconds % 3600, 60);
        $s = $seconds % 60;
        return $h > 0 ? sprintf('%d:%02d:%02d', $h, $m, $s) : sprintf('%d:%02d', $m, $s);
    }
}
