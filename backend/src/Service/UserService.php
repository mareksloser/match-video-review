<?php

declare(strict_types=1);

namespace Mvr\Service;

use Mvr\Auth\AccessPolicy;
use Mvr\Domain\User;
use Mvr\Repository\UserRepository;

/**
 * Read-only user overview for coaches. Accounts, roles and teams are managed
 * in the club IdP; local rows are kept in sync by UserProvisioner.
 */
final class UserService
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly AccessPolicy $policy,
    ) {
    }

    /** @return list<User> */
    public function list(?User $viewer): array
    {
        $this->policy->requireAdmin($viewer);
        return $this->users->all();
    }
}
