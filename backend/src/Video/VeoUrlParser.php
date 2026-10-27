<?php

declare(strict_types=1);

namespace Mvr\Video;

/** Pure parser for links like https://app.veo.co/matches/20261024-banik/#t=41:51 */
final class VeoUrlParser
{
    public function isVeo(string $url): bool
    {
        $host = parse_url($url, PHP_URL_HOST);
        return is_string($host) && ($host === 'veo.co' || str_ends_with($host, '.veo.co'));
    }

    /** @return array{matchUrl: string, startSeconds: ?int} */
    public function parse(string $url): array
    {
        if (!$this->isVeo($url)) {
            throw new \InvalidArgumentException('Nejde o odkaz na VEO.');
        }
        $base = preg_replace('/#.*$/', '', $url) ?? $url;
        return [
            'matchUrl' => rtrim($base, '/') . '/',
            'startSeconds' => TimeParser::fromVeoUrl($url),
        ];
    }

    public function deepLink(string $matchUrl, int $seconds): string
    {
        return rtrim($matchUrl, '/') . '/#t=' . sprintf('%d:%02d', intdiv($seconds, 60), $seconds % 60);
    }
}
