<?php

declare(strict_types=1);

namespace Mvr\Repository;

use Mvr\Domain\User;

interface UserRepository
{
    public function find(int $id): ?User;

    public function findByEmail(string $email): ?User;

    /** @return list<User> */
    public function playersInCategory(int $categoryId): array;
}
