<?php

declare(strict_types=1);

namespace Mvr\Video;

final class YouTubeSource implements VideoSource
{
    public function type(): string
    {
        return 'youtube';
    }

    public function supports(string $url): bool
    {
        return (bool) preg_match('#^https?://(www\.|m\.)?(youtube\.com|youtu\.be)/#', $url);
    }

    public function normalize(string $url): NormalizedVideo
    {
        if (!preg_match('/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/', $url, $m)) {
            throw new \InvalidArgumentException('Odkaz neobsahuje ID YouTube videa.');
        }
        return new NormalizedVideo('youtube', 'https://www.youtube.com/watch?v=' . $m[1]);
    }
}
