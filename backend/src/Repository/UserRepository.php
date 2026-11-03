<?php

declare(strict_types=1);

namespace Mvr\Repository;

use Mvr\Auth\ClubIdentity;
use Mvr\Domain\User;

/** Local copies of club accounts. Written only by UserProvisioner from IdP data. */
interface UserRepository
{
    public function find(int $id): ?User;

    public function findByEmail(string $email): ?User;

    public function findBySub(string $sub): ?User;

    /** @return list<User> */
    public function playersInCategory(int $categoryId): array;

    /** @return list<User> ordered by name */
    public function all(): array;

    public function createFromIdentity(ClubIdentity $identity, ?int $teamCategoryId): int;

    /** Sets sub, name, role and team (and e-mail when $updateEmail) from the IdP. */
    public function updateFromIdentity(int $id, ClubIdentity $identity, ?int $teamCategoryId, bool $updateEmail): void;
}
