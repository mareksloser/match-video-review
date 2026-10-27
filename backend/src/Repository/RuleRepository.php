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

    public function update(Rule $rule): void;

    /** Markers keep existing; their rule_id becomes NULL (FK ON DELETE SET NULL). */
    public function delete(int $id): void;
}
