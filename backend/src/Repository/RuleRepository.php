<?php

declare(strict_types=1);

namespace Mvr\Repository;

use Mvr\Domain\Rule;

interface RuleRepository
{
    /** @return list<Rule> */
    public function all(): array;

    public function exists(int $id): bool;

    public function create(Rule $rule): int;
}
