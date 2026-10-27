<?php

declare(strict_types=1);

namespace Mvr\Service;

use Mvr\Auth\AccessPolicy;
use Mvr\Domain\Marker;
use Mvr\Domain\User;
use Mvr\Repository\MarkerRepository;
use Mvr\Repository\UserRepository;

/** "Who went through the review at home" matrix for coaches. */
final class AnalyticsService
{
    public function __construct(
        private readonly MatchService $matches,
        private readonly MarkerRepository $markers,
        private readonly UserRepository $users,
        private readonly AccessPolicy $policy,
    ) {
    }

    /** @return array{markers: list<array<string, mixed>>, players: list<array<string, mixed>>} */
    public function forMatch(?User $viewer, int $matchId): array
    {
        $admin = $this->policy->requireAdmin($viewer);
        $match = $this->matches->visibleMatch($admin, $matchId);
        $views = $this->markers->viewsForMatch($matchId);

        return [
            'markers' => array_map(
                fn (Marker $m) => ['id' => $m->id, 'title' => $m->title, 'timestampSeconds' => $m->timestampSeconds],
                $this->markers->forMatch($matchId, null),
            ),
            'players' => array_map(
                fn (User $u) => ['id' => $u->id, 'name' => $u->name, 'viewedMarkerIds' => $views[$u->id] ?? []],
                $this->users->playersInCategory($match->teamCategoryId),
            ),
        ];
    }
}
