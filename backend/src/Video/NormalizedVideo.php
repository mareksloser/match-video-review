<?php

declare(strict_types=1);

namespace Mvr\Video;

final class NormalizedVideo
{
    public function __construct(
        public readonly string $type,
        public readonly string $url,
        public readonly ?int $startSeconds = null,
    ) {
    }
}
