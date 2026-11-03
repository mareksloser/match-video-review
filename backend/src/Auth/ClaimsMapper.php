<?php

declare(strict_types=1);

namespace Mvr\Auth;

use Mvr\Domain\Role;

/**
 * Maps access-token claims from the club IdP to MVR roles. Pure, no I/O.
 *
 * Roles of the `mvr-web` application in the IdP:
 *   coach (optionally coach@team)  → admin   (MVR coaches see and manage every team)
 *   viewer (optionally viewer@team) → viewer (read-only, every team)
 *   player@team                     → player of that team
 *   player                          → player without a team (sees public matches only)
 * The global `superadmin` role is treated as coach. The strongest role wins.
 */
final class ClaimsMapper
{
    /** @param array<string, mixed> $claims */
    public function map(array $claims): ClubIdentity
    {
        $sub = (string) $claims['sub'];
        $roles = self::strings($claims['roles'] ?? []);
        $global = self::strings($claims['global_roles'] ?? []);

        $role = null;
        $teamSlug = null;
        if (in_array('superadmin', $global, true) || self::has($roles, 'coach')) {
            $role = Role::Admin;
        } elseif (self::has($roles, 'viewer')) {
            $role = Role::Viewer;
        } elseif (self::has($roles, 'player')) {
            $role = Role::Player;
            $teamSlug = self::firstTeam($roles, 'player');
        }

        $email = mb_strtolower(trim((string) ($claims['email'] ?? '')));
        $name = trim((string) ($claims['name'] ?? $claims['preferred_username'] ?? ''));

        return new ClubIdentity(
            $sub,
            // users.email is required and unique; without the `email` scope fall back to a stable placeholder
            $email !== '' ? $email : $sub . '@club.invalid',
            mb_substr($name !== '' ? $name : $email, 0, 100),
            $role,
            $teamSlug,
        );
    }

    /** @param list<string> $roles */
    private static function has(array $roles, string $role): bool
    {
        foreach ($roles as $claim) {
            if ($claim === $role || str_starts_with($claim, $role . '@')) {
                return true;
            }
        }

        return false;
    }

    /** @param list<string> $roles */
    private static function firstTeam(array $roles, string $role): ?string
    {
        foreach ($roles as $claim) {
            if (str_starts_with($claim, $role . '@')) {
                return substr($claim, strlen($role) + 1);
            }
        }

        return null;
    }

    /** @return list<string> */
    private static function strings(mixed $value): array
    {
        return is_array($value) ? array_values(array_filter($value, 'is_string')) : [];
    }
}
