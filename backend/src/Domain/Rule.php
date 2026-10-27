<?php

declare(strict_types=1);

namespace Mvr\Domain;

use Mvr\Http\HttpException;

/** Playbook entry (klubová taktická zásada). */
final class Rule
{
    public function __construct(
        public readonly int $id,
        public readonly string $code,
        public readonly string $area,
        public readonly string $title,
        public readonly string $body,
    ) {
    }

    /** @param array<string, mixed> $in */
    public static function validated(array $in): self
    {
        $f = fn (string $k, int $max) => trim(mb_substr((string) ($in[$k] ?? ''), 0, $max));
        $rule = new self(0, $f('code', 20), $f('area', 100), $f('title', 255), $f('body', 5000));
        $missing = array_filter(['code' => $rule->code, 'area' => $rule->area, 'title' => $rule->title, 'body' => $rule->body], fn ($v) => $v === '');
        if ($missing) {
            throw HttpException::validation(array_map(fn () => 'Povinné pole.', $missing));
        }
        return $rule;
    }

    public function withId(int $id): self
    {
        return new self($id, $this->code, $this->area, $this->title, $this->body);
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return ['id' => $this->id, 'code' => $this->code, 'area' => $this->area, 'title' => $this->title, 'body' => $this->body];
    }
}
