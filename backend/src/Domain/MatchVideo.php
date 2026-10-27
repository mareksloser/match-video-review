<?php

declare(strict_types=1);

namespace Mvr\Domain;

/** A match and its recording ("Match" is a reserved word in PHP 8). */
final class MatchVideo
{
    public function __construct(
        public readonly int $id,
        public readonly string $title,
        public readonly string $matchDate,
        public readonly int $teamCategoryId,
        public readonly string $videoType,
        public readonly string $videoUrl,
        public readonly bool $isPublic,
    ) {
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'matchDate' => $this->matchDate,
            'teamCategoryId' => $this->teamCategoryId,
            'videoType' => $this->videoType,
            'videoUrl' => $this->videoUrl,
            'isPublic' => $this->isPublic,
        ];
    }
}
