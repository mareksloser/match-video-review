<?php

declare(strict_types=1);

namespace Mvr\Domain;

final class User
{
    public function __construct(
        public readonly int $id,
        public readonly string $name,
        public readonly string $email,
        public readonly Role $role,
        public readonly ?int $teamCategoryId,
        public readonly string $passwordHash = '',
    ) {
    }

    public function isAdmin(): bool
    {
        return $this->role === Role::Admin;
    }

    /** Admins and viewers see every team; only admins may change anything. */
    public function seesAllTeams(): bool
    {
        return $this->role === Role::Admin || $this->role === Role::Viewer;
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role->value,
            'teamCategoryId' => $this->teamCategoryId,
        ];
    }
}
