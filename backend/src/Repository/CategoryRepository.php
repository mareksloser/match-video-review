<?php

declare(strict_types=1);

namespace Mvr\Repository;

use Mvr\Domain\TeamCategory;

interface CategoryRepository
{
    /** @return list<TeamCategory> */
    public function all(): array;

    public function exists(int $id): bool;
}
