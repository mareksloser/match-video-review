<?php

declare(strict_types=1);

namespace Mvr\Repository;

use Mvr\Domain\Marker;
use Mvr\Domain\MarkerData;
use Mvr\Domain\MarkerKind;

final class PdoMarkerRepository implements MarkerRepository
{
    private const SELECT = 'SELECT m.*, d.drawing_data, r.reviewed_by_admin, r.reviewed_at, (v.id IS NOT NULL) AS viewed_by_me
          FROM markers m
     LEFT JOIN marker_drawings d ON d.marker_id = m.id
     LEFT JOIN marker_reviews r ON r.marker_id = m.id
     LEFT JOIN player_marker_views v ON v.marker_id = m.id AND v.user_id = :viewer';

    public function __construct(private readonly \PDO $pdo)
    {
    }

    public function forMatch(int $matchId, ?int $viewerId): array
    {
        $st = $this->pdo->prepare(self::SELECT . ' WHERE m.match_id = :match ORDER BY m.timestamp_seconds, m.id');
        $st->execute(['viewer' => $viewerId ?? 0, 'match' => $matchId]);
        return array_map($this->map(...), $st->fetchAll());
    }

    public function find(int $id, ?int $viewerId): ?Marker
    {
        $st = $this->pdo->prepare(self::SELECT . ' WHERE m.id = :id');
        $st->execute(['viewer' => $viewerId ?? 0, 'id' => $id]);
        $row = $st->fetch();
        return $row ? $this->map($row) : null;
    }

    public function create(int $matchId, MarkerData $d, int $createdBy): int
    {
        $st = $this->pdo->prepare(
            'INSERT INTO markers (match_id, timestamp_seconds, kind, title, description, rule_id, rule_link, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $st->execute([$matchId, $d->timestampSeconds, $d->kind->value, $d->title, $d->description, $d->ruleId, $d->ruleLink, $createdBy]);
        return (int) $this->pdo->lastInsertId();
    }

    public function update(int $id, MarkerData $d): void
    {
        $this->pdo->prepare(
            'UPDATE markers SET timestamp_seconds = ?, kind = ?, title = ?, description = ?, rule_id = ?, rule_link = ? WHERE id = ?'
        )->execute([$d->timestampSeconds, $d->kind->value, $d->title, $d->description, $d->ruleId, $d->ruleLink, $id]);
    }

    public function delete(int $id): void
    {
        $this->pdo->prepare('DELETE FROM markers WHERE id = ?')->execute([$id]);
    }

    public function saveDrawing(int $markerId, ?array $drawing): void
    {
        if ($drawing === null) {
            $this->pdo->prepare('DELETE FROM marker_drawings WHERE marker_id = ?')->execute([$markerId]);
            return;
        }
        $this->pdo->prepare(
            'INSERT INTO marker_drawings (marker_id, drawing_data) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE drawing_data = VALUES(drawing_data)'
        )->execute([$markerId, json_encode($drawing, JSON_THROW_ON_ERROR)]);
    }

    public function setReviewed(int $markerId, bool $reviewed, \DateTimeImmutable $at): void
    {
        $this->pdo->prepare(
            'INSERT INTO marker_reviews (marker_id, reviewed_by_admin, reviewed_at) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE reviewed_by_admin = VALUES(reviewed_by_admin), reviewed_at = VALUES(reviewed_at)'
        )->execute([$markerId, (int) $reviewed, $reviewed ? $at->format('Y-m-d H:i:s') : null]);
    }

    public function markViewed(int $markerId, int $userId): void
    {
        $this->pdo->prepare('INSERT IGNORE INTO player_marker_views (marker_id, user_id) VALUES (?, ?)')->execute([$markerId, $userId]);
    }

    public function viewsForMatch(int $matchId): array
    {
        $st = $this->pdo->prepare(
            'SELECT v.user_id, v.marker_id FROM player_marker_views v JOIN markers m ON m.id = v.marker_id WHERE m.match_id = ?'
        );
        $st->execute([$matchId]);
        $views = [];
        foreach ($st->fetchAll() as $r) {
            $views[(int) $r['user_id']][] = (int) $r['marker_id'];
        }
        return $views;
    }

    /** @param array<string, mixed> $r */
    private function map(array $r): Marker
    {
        return new Marker(
            (int) $r['id'],
            (int) $r['match_id'],
            (int) $r['timestamp_seconds'],
            MarkerKind::tryFrom((string) $r['kind']) ?? MarkerKind::Tactic,
            $r['title'],
            $r['description'],
            $r['rule_id'] !== null ? (int) $r['rule_id'] : null,
            $r['rule_link'],
            (bool) $r['reviewed_by_admin'],
            $r['reviewed_at'] !== null ? (new \DateTimeImmutable($r['reviewed_at'], new \DateTimeZone('UTC')))->format(DATE_ATOM) : null,
            $r['drawing_data'] !== null ? json_decode($r['drawing_data'], true) : null,
            (bool) $r['viewed_by_me'],
        );
    }
}
