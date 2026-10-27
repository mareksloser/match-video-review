<?php

declare(strict_types=1);

namespace Mvr\Repository;

use Mvr\Domain\Rule;

final class PdoRuleRepository implements RuleRepository
{
    public function __construct(private readonly \PDO $pdo)
    {
    }

    public function all(): array
    {
        $rows = $this->pdo->query('SELECT * FROM rules ORDER BY area, code')->fetchAll();
        return array_map(fn (array $r) => new Rule((int) $r['id'], $r['code'], $r['area'], $r['title'], $r['body']), $rows);
    }

    public function exists(int $id): bool
    {
        $st = $this->pdo->prepare('SELECT 1 FROM rules WHERE id = ?');
        $st->execute([$id]);
        return (bool) $st->fetchColumn();
    }

    public function create(Rule $rule): int
    {
        $this->pdo->prepare('INSERT INTO rules (code, area, title, body) VALUES (?, ?, ?, ?)')
            ->execute([$rule->code, $rule->area, $rule->title, $rule->body]);
        return (int) $this->pdo->lastInsertId();
    }

    public function update(Rule $rule): void
    {
        $this->pdo->prepare('UPDATE rules SET code = ?, area = ?, title = ?, body = ? WHERE id = ?')
            ->execute([$rule->code, $rule->area, $rule->title, $rule->body, $rule->id]);
    }

    public function delete(int $id): void
    {
        $this->pdo->prepare('DELETE FROM rules WHERE id = ?')->execute([$id]);
    }
}
