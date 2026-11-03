<?php

declare(strict_types=1);

namespace Mvr\Repository;

use Mvr\Domain\TeamCategory;

interface CategoryRepository
{
    /** @return list<TeamCategory> */
    public function all(): array;

    public function exists(int $id): bool;

    /** Team category mapped to an IdP team slug (team_categories.slug), or null. */
    public function idBySlug(string $slug): ?int;
}
