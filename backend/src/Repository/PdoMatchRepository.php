<?php

declare(strict_types=1);

namespace Mvr\Repository;

use Mvr\Domain\MatchData;
use Mvr\Domain\MatchStats;
use Mvr\Domain\MatchVideo;

final class PdoMatchRepository implements MatchRepository
{
    public function __construct(private readonly \PDO $pdo)
    {
    }

    public function find(int $id): ?MatchVideo
    {
        $st = $this->pdo->prepare('SELECT * FROM matches WHERE id = ?');
        $st->execute([$id]);
        $row = $st->fetch();
        return $row ? $this->map($row) : null;
    }

    public function list(?int $categoryId): array
    {
        $sql = 'SELECT * FROM matches' . ($categoryId ? ' WHERE team_category_id = ?' : '') . ' ORDER BY match_date DESC, id DESC';
        $st = $this->pdo->prepare($sql);
        $st->execute($categoryId ? [$categoryId] : []);
        return array_map($this->map(...), $st->fetchAll());
    }

    public function stats(array $matchIds, ?int $viewerId): array
    {
        if (!$matchIds) {
            return [];
        }
        $in = implode(',', array_fill(0, count($matchIds), '?'));
        $st = $this->pdo->prepare(
            "SELECT m.match_id,
                    COUNT(*) AS marker_count,
                    COALESCE(SUM(r.reviewed_by_admin), 0) AS reviewed_count,
                    COUNT(v.id) AS viewed_count
               FROM markers m
          LEFT JOIN marker_reviews r ON r.marker_id = m.id
          LEFT JOIN player_marker_views v ON v.marker_id = m.id AND v.user_id = ?
              WHERE m.match_id IN ($in)
           GROUP BY m.match_id"
        );
        $st->execute([$viewerId ?? 0, ...$matchIds]);
        $stats = [];
        foreach ($st->fetchAll() as $r) {
            $stats[(int) $r['match_id']] = new MatchStats((int) $r['marker_count'], (int) $r['reviewed_count'], $viewerId ? (int) $r['viewed_count'] : null);
        }
        return $stats;
    }

    public function create(MatchData $d): int
    {
        $st = $this->pdo->prepare(
            'INSERT INTO matches (title, match_date, team_category_id, video_type, video_url, is_public) VALUES (?, ?, ?, ?, ?, ?)'
        );
        $st->execute([$d->title, $d->matchDate, $d->teamCategoryId, $d->videoType, $d->videoUrl, (int) $d->isPublic]);
        return (int) $this->pdo->lastInsertId();
    }

    public function update(int $id, MatchData $d): void
    {
        $this->pdo->prepare(
            'UPDATE matches SET title = ?, match_date = ?, team_category_id = ?, video_type = ?, video_url = ?, is_public = ? WHERE id = ?'
        )->execute([$d->title, $d->matchDate, $d->teamCategoryId, $d->videoType, $d->videoUrl, (int) $d->isPublic, $id]);
    }

    public function delete(int $id): void
    {
        $this->pdo->prepare('DELETE FROM matches WHERE id = ?')->execute([$id]);
    }

    /** @param array<string, mixed> $r */
    private function map(array $r): MatchVideo
    {
        return new MatchVideo(
            (int) $r['id'],
            $r['title'],
            $r['match_date'],
            (int) $r['team_category_id'],
            $r['video_type'],
            $r['video_url'],
            (bool) $r['is_public'],
        );
    }
}
