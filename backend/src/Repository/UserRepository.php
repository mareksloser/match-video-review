<?php

declare(strict_types=1);

namespace Mvr\Repository;

use Mvr\Domain\User;
use Mvr\Domain\UserData;

interface UserRepository
{
    public function find(int $id): ?User;

    public function findByEmail(string $email): ?User;

    /** @return list<User> */
    public function playersInCategory(int $categoryId): array;

    /** @return list<User> ordered by name */
    public function all(): array;

    public function countAdmins(): int;

    public function create(UserData $data, string $passwordHash): int;

    /** @param string|null $passwordHash null keeps the current password */
    public function update(int $id, UserData $data, ?string $passwordHash): void;

    public function delete(int $id): void;
}
