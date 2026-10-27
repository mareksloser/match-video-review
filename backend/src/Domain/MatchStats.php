<?php

declare(strict_types=1);

namespace Mvr\Domain;

final class MatchStats
{
    public function __construct(
        public readonly int $markerCount,
        public readonly int $reviewedCount,
        public readonly ?int $viewedCount,
    ) {
    }

    public static function hidden(): self
    {
        return new self(0, 0, null);
    }
}
