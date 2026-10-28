<?php

declare(strict_types=1);

namespace Mvr\Service;

use Mvr\Auth\AccessPolicy;
use Mvr\Domain\MatchData;
use Mvr\Domain\MatchStats;
use Mvr\Domain\MatchVideo;
use Mvr\Domain\User;
use Mvr\Http\HttpException;
use Mvr\Repository\CategoryRepository;
use Mvr\Repository\MatchRepository;
use Mvr\Video\VideoSourceRegistry;

final class MatchService
{
    public function __construct(
        private readonly MatchRepository $matches,
        private readonly CategoryRepository $categories,
        private readonly VideoSourceRegistry $sources,
        private readonly AccessPolicy $policy,
    ) {
    }

    /** @return list<array<string, mixed>> */
    public function list(?User $viewer, ?int $categoryId): array
    {
        $visible = array_values(array_filter(
            $this->matches->list($categoryId),
            fn (MatchVideo $m) => $this->policy->canViewMatch($viewer, $m),
        ));
        $stats = $this->matches->stats(array_map(fn (MatchVideo $m) => $m->id, $visible), $this->viewTracked($viewer));

        return array_map(fn (MatchVideo $m) => $this->present($m, $viewer, $stats[$m->id] ?? null), $visible);
    }

    /** @return array<string, mixed> */
    public function get(?User $viewer, int $id): array
    {
        $match = $this->visibleMatch($viewer, $id);
        return $this->present($match, $viewer, $this->matches->stats([$id], $this->viewTracked($viewer))[$id] ?? null);
    }

    public function visibleMatch(?User $viewer, int $id): MatchVideo
    {
        $match = $this->matches->find($id);
        if ($match === null || !$this->policy->canViewMatch($viewer, $match)) {
            throw HttpException::notFound('Zápas neexistuje nebo k němu nemáte přístup.');
        }
        return $match;
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function create(?User $viewer, array $input): array
    {
        $this->policy->requireAdmin($viewer);
        $id = $this->matches->create($this->validated($input));
        return $this->get($viewer, $id);
    }

    /**
     * Fixes a wrong URL, team, date… Markers stay attached; their times are not shifted.
     *
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function update(?User $viewer, int $id, array $input): array
    {
        $admin = $this->policy->requireAdmin($viewer);
        $this->visibleMatch($admin, $id);
        $this->matches->update($id, $this->validated($input));
        return $this->get($viewer, $id);
    }

    /** @param array<string, mixed> $input */
    private function validated(array $input): MatchData
    {
        $data = MatchData::fromArray($input);
        if (!$this->categories->exists($data->teamCategoryId)) {
            throw HttpException::validation(['teamCategoryId' => 'Tým neexistuje.']);
        }
        try {
            $video = $this->sources->normalize($data->videoType, $data->videoUrl);
        } catch (\InvalidArgumentException $e) {
            throw HttpException::validation(['videoUrl' => $e->getMessage()]);
        }
        return $data->withVideo($video->type, $video->url);
    }

    public function delete(?User $viewer, int $id): void
    {
        $this->policy->requireAdmin($viewer);
        $this->matches->delete($id);
    }

    /** User id for "viewed" counts, only for users whose views are recorded. */
    private function viewTracked(?User $viewer): ?int
    {
        return $this->policy->tracksViews($viewer) ? $viewer?->id : null;
    }

    /** @return array<string, mixed> */
    private function present(MatchVideo $m, ?User $viewer, ?MatchStats $stats): array
    {
        $tracked = $this->policy->tracksViews($viewer);
        $stats = $this->policy->canViewMarkers($viewer, $m) ? ($stats ?? new MatchStats(0, 0, $tracked ? 0 : null)) : MatchStats::hidden();
        return $m->toArray() + [
            'markerCount' => $stats->markerCount,
            'reviewedCount' => $stats->reviewedCount,
            'viewedCount' => $stats->viewedCount,
        ];
    }
}
