<?php

declare(strict_types=1);

namespace Mvr\Domain;

use Mvr\Http\HttpException;

/**
 * Validates the tactical drawing JSON (normalized 0..1 coordinates) before it is
 * stored in marker_drawings.drawing_data. Pure: no I/O.
 */
final class DrawingValidator
{
    private const COLORS = ['yellow', 'blue', 'red', 'white'];
    private const MAX_SHAPES = 200;

    /**
     * @param array<string, mixed> $drawing
     * @return array{version: int, shapes: list<array<string, mixed>>}
     */
    public function validate(array $drawing): array
    {
        $shapes = $drawing['shapes'] ?? null;
        if (!is_array($shapes) || !array_is_list($shapes) || count($shapes) > self::MAX_SHAPES) {
            throw HttpException::validation(['shapes' => 'Kresba musí obsahovat seznam tvarů (max. 200).']);
        }
        $clean = [];
        foreach ($shapes as $i => $shape) {
            try {
                $clean[] = $this->shape(is_array($shape) ? $shape : []);
            } catch (\InvalidArgumentException $e) {
                throw HttpException::validation(["shapes.$i" => $e->getMessage()]);
            }
        }
        return ['version' => 1, 'shapes' => $clean];
    }

    /**
     * @param array<string, mixed> $s
     * @return array<string, mixed>
     */
    private function shape(array $s): array
    {
        $id = (string) ($s['id'] ?? '');
        if (!preg_match('/^[\w-]{1,40}$/', $id)) {
            throw new \InvalidArgumentException('Neplatné id tvaru.');
        }
        return match ($s['type'] ?? null) {
            'arrow' => ['id' => $id, 'type' => 'arrow', 'from' => $this->point($s['from'] ?? null), 'to' => $this->point($s['to'] ?? null), 'color' => $this->color($s['color'] ?? null), 'dashed' => (bool) ($s['dashed'] ?? false)],
            'line' => ['id' => $id, 'type' => 'line', 'from' => $this->point($s['from'] ?? null), 'to' => $this->point($s['to'] ?? null), 'color' => $this->color($s['color'] ?? null)],
            'zone' => ['id' => $id, 'type' => 'zone', 'center' => $this->point($s['center'] ?? null), 'rx' => $this->unit($s['rx'] ?? null), 'ry' => $this->unit($s['ry'] ?? null), 'color' => $this->color($s['color'] ?? null)],
            'player' => ['id' => $id, 'type' => 'player', 'at' => $this->point($s['at'] ?? null), 'team' => in_array($s['team'] ?? null, ['own', 'opponent'], true) ? $s['team'] : throw new \InvalidArgumentException('Neplatný tým.'), 'label' => $this->text($s['label'] ?? '', 3)],
            'text' => ['id' => $id, 'type' => 'text', 'at' => $this->point($s['at'] ?? null), 'text' => $this->text($s['text'] ?? '', 80), 'color' => $this->color($s['color'] ?? null)],
            default => throw new \InvalidArgumentException('Neznámý typ tvaru.'),
        };
    }

    /** @return array{x: float, y: float} */
    private function point(mixed $p): array
    {
        if (!is_array($p)) {
            throw new \InvalidArgumentException('Chybí souřadnice.');
        }
        return ['x' => $this->unit($p['x'] ?? null), 'y' => $this->unit($p['y'] ?? null)];
    }

    private function unit(mixed $n): float
    {
        if (!is_int($n) && !is_float($n)) {
            throw new \InvalidArgumentException('Souřadnice musí být číslo.');
        }
        return round(max(0.0, min(1.0, (float) $n)), 5);
    }

    private function color(mixed $c): string
    {
        return in_array($c, self::COLORS, true) ? $c : throw new \InvalidArgumentException('Neplatná barva.');
    }

    private function text(mixed $t, int $max): string
    {
        $t = trim((string) $t);
        if ($t === '' || mb_strlen($t) > $max) {
            throw new \InvalidArgumentException("Text musí mít 1–$max znaků.");
        }
        return $t;
    }
}
