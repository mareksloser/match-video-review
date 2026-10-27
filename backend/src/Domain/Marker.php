<?php

declare(strict_types=1);

namespace Mvr\Domain;

final class Marker
{
    /** @param array<string, mixed>|null $drawing */
    public function __construct(
        public readonly int $id,
        public readonly int $matchId,
        public readonly int $timestampSeconds,
        public readonly MarkerKind $kind,
        public readonly string $title,
        public readonly ?string $description,
        public readonly ?int $ruleId,
        public readonly ?string $ruleLink,
        public readonly bool $reviewed,
        public readonly ?string $reviewedAt,
        public readonly ?array $drawing,
        public readonly bool $viewedByMe,
    ) {
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'matchId' => $this->matchId,
            'timestampSeconds' => $this->timestampSeconds,
            'kind' => $this->kind->value,
            'title' => $this->title,
            'description' => $this->description,
            'ruleId' => $this->ruleId,
            'ruleLink' => $this->ruleLink,
            'reviewed' => $this->reviewed,
            'reviewedAt' => $this->reviewedAt,
            'drawing' => $this->drawing,
            'viewedByMe' => $this->viewedByMe,
        ];
    }
}
