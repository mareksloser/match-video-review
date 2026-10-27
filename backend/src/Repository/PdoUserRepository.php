<?php

declare(strict_types=1);

namespace Mvr\Repository;

use Mvr\Domain\Role;
use Mvr\Domain\User;
use Mvr\Domain\UserData;

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

    public function all(): array
    {
        return array_map($this->map(...), $this->pdo->query('SELECT * FROM users ORDER BY name, id')->fetchAll());
    }

    public function countAdmins(): int
    {
        return (int) $this->pdo->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn();
    }

    public function create(UserData $d, string $passwordHash): int
    {
        $this->pdo->prepare('INSERT INTO users (name, email, password, role, team_category_id) VALUES (?, ?, ?, ?, ?)')
            ->execute([$d->name, $d->email, $passwordHash, $d->role->value, $d->teamCategoryId]);
        return (int) $this->pdo->lastInsertId();
    }

    public function update(int $id, UserData $d, ?string $passwordHash): void
    {
        $sql = 'UPDATE users SET name = ?, email = ?, role = ?, team_category_id = ?' . ($passwordHash !== null ? ', password = ?' : '') . ' WHERE id = ?';
        $params = [$d->name, $d->email, $d->role->value, $d->teamCategoryId];
        if ($passwordHash !== null) {
            $params[] = $passwordHash;
        }
        $params[] = $id;
        $this->pdo->prepare($sql)->execute($params);
    }

    public function delete(int $id): void
    {
        $this->pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
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
