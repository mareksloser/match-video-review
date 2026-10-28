<?php

declare(strict_types=1);

namespace Mvr\Settings;

final class PdoSettingsRepository implements SettingsRepository
{
    public function __construct(private readonly \PDO $pdo)
    {
    }

    public function all(): array
    {
        $rows = $this->pdo->query(
            'SELECT s.`key`, s.`value`, s.updated_at, u.name AS updated_by_name
               FROM settings s LEFT JOIN users u ON u.id = s.updated_by'
        )->fetchAll();
        $out = [];
        foreach ($rows as $r) {
            $out[$r['key']] = [
                'value' => json_decode($r['value'], true),
                'updatedAt' => (new \DateTimeImmutable($r['updated_at'], new \DateTimeZone('UTC')))->format(DATE_ATOM),
                'updatedBy' => $r['updated_by_name'],
            ];
        }
        return $out;
    }

    public function set(string $key, mixed $value, ?int $userId, \DateTimeImmutable $at): void
    {
        $this->pdo->prepare(
            'INSERT INTO settings (`key`, `value`, updated_at, updated_by) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), updated_at = VALUES(updated_at), updated_by = VALUES(updated_by)'
        )->execute([$key, json_encode($value, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE), $at->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d H:i:s'), $userId]);
    }

    public function delete(string $key): void
    {
        $this->pdo->prepare('DELETE FROM settings WHERE `key` = ?')->execute([$key]);
    }
}
