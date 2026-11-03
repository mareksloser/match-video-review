<?php

declare(strict_types=1);

namespace Mvr\Repository;

use Mvr\Auth\ClubIdentity;
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

    public function findBySub(string $sub): ?User
    {
        return $this->one('SELECT * FROM users WHERE sub = ?', [$sub]);
    }

    public function playersInCategory(int $categoryId): array
    {
        $st = $this->pdo->prepare("SELECT * FROM users WHERE role = 'player' AND team_category_id = ? ORDER BY name");
        $st->execute([$categoryId]);
        return array_map($this->map(...), $st->fetchAll());
    }

    public function all(): array
    {
        return array_map($this->map(...), $this->pdo->query('SELECT * FROM users ORDER BY name, id')->fetchAll());
    }

    public function createFromIdentity(ClubIdentity $identity, ?int $teamCategoryId): int
    {
        $this->pdo->prepare('INSERT INTO users (sub, name, email, role, team_category_id) VALUES (?, ?, ?, ?, ?)')
            ->execute([$identity->sub, $identity->name, $identity->email, self::role($identity)->value, $teamCategoryId]);
        return (int) $this->pdo->lastInsertId();
    }

    public function updateFromIdentity(int $id, ClubIdentity $identity, ?int $teamCategoryId, bool $updateEmail): void
    {
        $sql = 'UPDATE users SET sub = ?, name = ?, role = ?, team_category_id = ?' . ($updateEmail ? ', email = ?' : '') . ' WHERE id = ?';
        $params = [$identity->sub, $identity->name, self::role($identity)->value, $teamCategoryId];
        if ($updateEmail) {
            $params[] = $identity->email;
        }
        $params[] = $id;
        $this->pdo->prepare($sql)->execute($params);
    }

    private static function role(ClubIdentity $identity): Role
    {
        return $identity->role ?? throw new \LogicException('Identity without an MVR role cannot be stored.');
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
            $r['sub'] ?? null,
        );
    }
}
