<?php

declare(strict_types=1);

namespace Mvr\Repository;

use Mvr\Domain\AuthEvent;

final class PdoAuthLogRepository implements AuthLogRepository
{
    private const FORMAT = 'Y-m-d H:i:s';

    public function __construct(private readonly \PDO $pdo)
    {
    }

    public function add(AuthEvent $event, ?int $userId, ?string $email, ?int $actorId, ?string $detail, string $ip, string $userAgent, \DateTimeImmutable $at): void
    {
        $this->pdo->prepare(
            'INSERT INTO auth_log (event, user_id, email, actor_id, detail, ip, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $event->value, $userId, $email !== null ? mb_substr($email, 0, 150) : null, $actorId,
            $detail !== null ? mb_substr($detail, 0, 255) : null, $ip ?: null, $userAgent ?: null, self::utc($at),
        ]);
    }

    public function countSince(string $ip, AuthEvent $event, \DateTimeImmutable $since): int
    {
        $st = $this->pdo->prepare('SELECT COUNT(*) FROM auth_log WHERE ip = ? AND event = ? AND created_at > ?');
        $st->execute([$ip, $event->value, self::utc($since)]);
        return (int) $st->fetchColumn();
    }

    public function lastSince(string $ip, AuthEvent $event, \DateTimeImmutable $since): ?\DateTimeImmutable
    {
        $st = $this->pdo->prepare('SELECT MAX(created_at) FROM auth_log WHERE ip = ? AND event = ? AND created_at > ?');
        $st->execute([$ip, $event->value, self::utc($since)]);
        $value = $st->fetchColumn();
        return $value ? new \DateTimeImmutable($value, new \DateTimeZone('UTC')) : null;
    }

    public function list(array $events, ?string $query, ?int $beforeId, int $limit): array
    {
        $where = [];
        $params = [];
        if ($events) {
            $where[] = 'l.event IN (' . implode(',', array_fill(0, count($events), '?')) . ')';
            array_push($params, ...array_map(fn (AuthEvent $e) => $e->value, $events));
        }
        if ($query !== null && $query !== '') {
            $where[] = '(l.email LIKE ? OR u.name LIKE ? OR l.ip LIKE ?)';
            $like = '%' . addcslashes($query, '%_\\') . '%';
            array_push($params, $like, $like, $like);
        }
        if ($beforeId !== null) {
            $where[] = 'l.id < ?';
            $params[] = $beforeId;
        }
        $sql = 'SELECT l.*, u.name AS user_name, a.name AS actor_name
                  FROM auth_log l
             LEFT JOIN users u ON u.id = l.user_id
             LEFT JOIN users a ON a.id = l.actor_id'
            . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
            . ' ORDER BY l.id DESC LIMIT ' . max(1, min(200, $limit));
        $st = $this->pdo->prepare($sql);
        $st->execute($params);

        return array_map(static fn (array $r) => [
            'id' => (int) $r['id'],
            'event' => $r['event'],
            'createdAt' => (new \DateTimeImmutable($r['created_at'], new \DateTimeZone('UTC')))->format(DATE_ATOM),
            'userId' => $r['user_id'] !== null ? (int) $r['user_id'] : null,
            'userName' => $r['user_name'],
            'email' => $r['email'],
            'actorName' => $r['actor_name'],
            'detail' => $r['detail'],
            'ip' => $r['ip'],
            'userAgent' => $r['user_agent'],
        ], $st->fetchAll());
    }

    public function countsSince(\DateTimeImmutable $since): array
    {
        $st = $this->pdo->prepare('SELECT event, COUNT(*) n FROM auth_log WHERE created_at > ? GROUP BY event');
        $st->execute([self::utc($since)]);
        return array_map('intval', array_column($st->fetchAll(), 'n', 'event'));
    }

    public function distinctFailedIpsSince(\DateTimeImmutable $since): int
    {
        $st = $this->pdo->prepare("SELECT COUNT(DISTINCT ip) FROM auth_log WHERE event IN ('login_failed', 'login_blocked') AND created_at > ?");
        $st->execute([self::utc($since)]);
        return (int) $st->fetchColumn();
    }

    public function lastLogins(): array
    {
        $rows = $this->pdo->query(
            "SELECT user_id, MAX(created_at) AS at FROM auth_log WHERE event = 'login_success' AND user_id IS NOT NULL GROUP BY user_id"
        )->fetchAll();
        $out = [];
        foreach ($rows as $r) {
            $out[(int) $r['user_id']] = (new \DateTimeImmutable($r['at'], new \DateTimeZone('UTC')))->format(DATE_ATOM);
        }
        return $out;
    }

    public function pruneBefore(\DateTimeImmutable $before): void
    {
        $this->pdo->prepare('DELETE FROM auth_log WHERE created_at < ?')->execute([self::utc($before)]);
    }

    private static function utc(\DateTimeImmutable $at): string
    {
        return $at->setTimezone(new \DateTimeZone('UTC'))->format(self::FORMAT);
    }
}
