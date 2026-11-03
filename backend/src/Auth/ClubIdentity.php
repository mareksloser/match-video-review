<?php

declare(strict_types=1);

namespace Mvr\Auth;

use Mvr\Domain\Role;

/** Who the club IdP says the user is, already mapped to MVR terms. */
final class ClubIdentity
{
    public function __construct(
        public readonly string $sub,
        public readonly string $email,
        public readonly string $name,
        /** null = signed in to the club, but without any MVR role */
        public readonly ?Role $role,
        /** IdP team slug for players (e.g. "u11"), null otherwise */
        public readonly ?string $teamSlug,
    ) {
    }

    public function hasAccess(): bool
    {
        return $this->role !== null;
    }
}
