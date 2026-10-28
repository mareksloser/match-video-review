<?php

declare(strict_types=1);

namespace Mvr\Service;

use Mvr\Auth\AccessPolicy;
use Mvr\Domain\DrawingValidator;
use Mvr\Domain\Marker;
use Mvr\Domain\MarkerData;
use Mvr\Domain\User;
use Mvr\Http\HttpException;
use Mvr\Repository\MarkerRepository;
use Mvr\Repository\RuleRepository;
use Mvr\Support\Clock;

final class MarkerService
{
    public function __construct(
        private readonly MarkerRepository $markers,
        private readonly RuleRepository $rules,
        private readonly MatchService $matches,
        private readonly AccessPolicy $policy,
        private readonly DrawingValidator $drawings,
        private readonly Clock $clock,
    ) {
    }

    /** @return list<Marker> */
    public function forMatch(?User $viewer, int $matchId): array
    {
        $match = $this->matches->visibleMatch($viewer, $matchId);
        if (!$this->policy->canViewMarkers($viewer, $match)) {
            return [];
        }
        return $this->markers->forMatch($matchId, $viewer?->id);
    }

    /** @param array<string, mixed> $input */
    public function create(?User $viewer, int $matchId, array $input): Marker
    {
        $admin = $this->policy->requireAdmin($viewer);
        $data = MarkerData::fromArray($input);
        $this->matches->visibleMatch($admin, $matchId);
        $this->assertRule($data);
        $id = $this->markers->create($matchId, $data, $admin->id);
        return $this->markers->find($id, $admin->id) ?? throw new \LogicException('Marker missing after insert');
    }

    /** @param array<string, mixed> $input */
    public function update(?User $viewer, int $id, array $input): Marker
    {
        $admin = $this->policy->requireAdmin($viewer);
        $data = MarkerData::fromArray($input);
        $this->existing($id, $admin);
        $this->assertRule($data);
        $this->markers->update($id, $data);
        return $this->existing($id, $admin);
    }

    public function delete(?User $viewer, int $id): void
    {
        $this->policy->requireAdmin($viewer);
        $this->markers->delete($id);
    }

    /** @param array<string, mixed> $drawing */
    public function saveDrawing(?User $viewer, int $id, array $drawing): void
    {
        $admin = $this->policy->requireAdmin($viewer);
        $this->existing($id, $admin);
        $clean = $this->drawings->validate($drawing);
        $this->markers->saveDrawing($id, $clean['shapes'] ? $clean : null);
    }

    public function setReviewed(?User $viewer, int $id, bool $reviewed): void
    {
        $admin = $this->policy->requireAdmin($viewer);
        $this->existing($id, $admin);
        $this->markers->setReviewed($id, $reviewed, $this->clock->now());
    }

    public function markViewed(?User $viewer, int $id): void
    {
        $user = $this->policy->requireUser($viewer);
        if (!$this->policy->tracksViews($user)) {
            return; // viewer/coach: accepted but not recorded (204), so clients need no special case
        }
        $marker = $this->existing($id, $user);
        $match = $this->matches->visibleMatch($user, $marker->matchId);
        if (!$this->policy->canViewMarkers($user, $match)) {
            throw HttpException::forbidden();
        }
        $this->markers->markViewed($id, $user->id);
    }

    private function existing(int $id, User $viewer): Marker
    {
        return $this->markers->find($id, $viewer->id) ?? throw HttpException::notFound('Marker neexistuje.');
    }

    private function assertRule(MarkerData $data): void
    {
        if ($data->ruleId !== null && !$this->rules->exists($data->ruleId)) {
            throw HttpException::validation(['ruleId' => 'Zásada neexistuje.']);
        }
    }
}
