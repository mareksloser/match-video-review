<?php

declare(strict_types=1);

namespace Mvr\Repository;

use Mvr\Domain\MatchData;
use Mvr\Domain\MatchStats;
use Mvr\Domain\MatchVideo;

interface MatchRepository
{
    public function find(int $id): ?MatchVideo;

    /** @return list<MatchVideo> newest first */
    public function list(?int $categoryId): array;

    /**
     * Marker counts per match; viewedCount is computed for $viewerId when given.
     * @param list<int> $matchIds
     * @return array<int, MatchStats>
     */
    public function stats(array $matchIds, ?int $viewerId): array;

    public function create(MatchData $data): int;

    public function update(int $id, MatchData $data): void;

    public function delete(int $id): void;
}
