<?php

declare(strict_types=1);

namespace Mvr\Repository;

use Mvr\Domain\Marker;
use Mvr\Domain\MarkerData;

interface MarkerRepository
{
    /** @return list<Marker> ordered by time */
    public function forMatch(int $matchId, ?int $viewerId): array;

    public function find(int $id, ?int $viewerId): ?Marker;

    public function create(int $matchId, MarkerData $data, int $createdBy): int;

    public function update(int $id, MarkerData $data): void;

    public function delete(int $id): void;

    /** @param array<string, mixed>|null $drawing null removes the drawing */
    public function saveDrawing(int $markerId, ?array $drawing): void;

    public function setReviewed(int $markerId, bool $reviewed, \DateTimeImmutable $at): void;

    public function markViewed(int $markerId, int $userId): void;

    /** @return array<int, list<int>> userId → viewed marker ids within the match */
    public function viewsForMatch(int $matchId): array;
}
