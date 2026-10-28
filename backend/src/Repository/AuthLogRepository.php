<?php

declare(strict_types=1);

namespace Mvr\Repository;

use Mvr\Domain\AuthEvent;

interface AuthLogRepository
{
    public function add(
        AuthEvent $event,
        ?int $userId,
        ?string $email,
        ?int $actorId,
        ?string $detail,
        string $ip,
        string $userAgent,
        \DateTimeImmutable $at,
    ): void;

    public function countSince(string $ip, AuthEvent $event, \DateTimeImmutable $since): int;

    public function lastSince(string $ip, AuthEvent $event, \DateTimeImmutable $since): ?\DateTimeImmutable;

    /**
     * Newest first. $events filters by type, $query matches e-mail, name or IP.
     *
     * @param list<AuthEvent> $events
     * @return list<array<string, mixed>>
     */
    public function list(array $events, ?string $query, ?int $beforeId, int $limit): array;

    /** @return array<string, int> event value → count since $since */
    public function countsSince(\DateTimeImmutable $since): array;

    public function distinctFailedIpsSince(\DateTimeImmutable $since): int;

    /** @return array<int, string> userId → last successful login (ATOM) */
    public function lastLogins(): array;

    public function pruneBefore(\DateTimeImmutable $before): void;
}
