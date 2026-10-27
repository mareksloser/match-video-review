<?php

declare(strict_types=1);

namespace Mvr\Auth;

use Mvr\Domain\MatchVideo;
use Mvr\Domain\User;
use Mvr\Http\HttpException;

/**
 * All visibility rules in one pure class:
 * anonymous → public matches, no markers; player → own team + public; admin → everything.
 */
final class AccessPolicy
{
    public function canViewMatch(?User $user, MatchVideo $match): bool
    {
        if ($user === null) {
            return $match->isPublic;
        }
        return $user->isAdmin() || $match->isPublic || $match->teamCategoryId === $user->teamCategoryId;
    }

    public function canViewMarkers(?User $user, MatchVideo $match): bool
    {
        return $user !== null && ($user->isAdmin() || $match->teamCategoryId === $user->teamCategoryId);
    }

    public function requireUser(?User $user): User
    {
        return $user ?? throw HttpException::unauthorized();
    }

    public function requireAdmin(?User $user): User
    {
        $user = $this->requireUser($user);
        if (!$user->isAdmin()) {
            throw HttpException::forbidden('Tuto akci může provést jen trenér.');
        }
        return $user;
    }
}
