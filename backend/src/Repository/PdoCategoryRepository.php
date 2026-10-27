<?php

declare(strict_types=1);

namespace Mvr\Repository;

use Mvr\Domain\TeamCategory;

final class PdoCategoryRepository implements CategoryRepository
{
    public function __construct(private readonly \PDO $pdo)
    {
    }

    public function all(): array
    {
        $rows = $this->pdo->query('SELECT id, name, description FROM team_categories ORDER BY id')->fetchAll();
        return array_map(fn (array $r) => new TeamCategory((int) $r['id'], $r['name'], $r['description']), $rows);
    }

    public function exists(int $id): bool
    {
        $st = $this->pdo->prepare('SELECT 1 FROM team_categories WHERE id = ?');
        $st->execute([$id]);
        return (bool) $st->fetchColumn();
    }
}
