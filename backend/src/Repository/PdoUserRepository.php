<?php

declare(strict_types=1);

namespace Mvr\Repository;

use Mvr\Domain\Role;
use Mvr\Domain\User;

final class PdoUserRepository implements UserRepository
{
    public function __construct(private readonly \PDO $pdo)
    {
    }

    public function find(int $id): ?User
    {
        return $this->one('SELECT * FROM users WHERE id = ?', [$id]);
    }

    public function findByEmail(string $email): ?User
    {
        return $this->one('SELECT * FROM users WHERE email = ?', [$email]);
    }

    public function playersInCategory(int $categoryId): array
    {
        $st = $this->pdo->prepare("SELECT * FROM users WHERE role = 'player' AND team_category_id = ? ORDER BY name");
        $st->execute([$categoryId]);
        return array_map($this->map(...), $st->fetchAll());
    }

    /** @param list<mixed> $params */
    private function one(string $sql, array $params): ?User
    {
        $st = $this->pdo->prepare($sql);
        $st->execute($params);
        $row = $st->fetch();
        return $row ? $this->map($row) : null;
    }

    /** @param array<string, mixed> $r */
    private function map(array $r): User
    {
        return new User(
            (int) $r['id'],
            $r['name'],
            $r['email'],
            Role::from($r['role']),
            $r['team_category_id'] !== null ? (int) $r['team_category_id'] : null,
            $r['password'],
        );
    }
}
