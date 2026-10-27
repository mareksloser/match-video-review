<?php

declare(strict_types=1);

namespace Mvr\Domain;

use Mvr\Http\HttpException;
use Mvr\Video\TimeParser;

/** Validated marker input. Accepts seconds, "mm:ss" or a VEO link with #t=mm:ss. */
final class MarkerData
{
    public function __construct(
        public readonly int $timestampSeconds,
        public readonly MarkerKind $kind,
        public readonly string $title,
        public readonly ?string $description,
        public readonly ?int $ruleId,
        public readonly ?string $ruleLink,
    ) {
    }

    /** @param array<string, mixed> $in */
    public static function fromArray(array $in): self
    {
        $errors = [];
        $rawTime = $in['timestampSeconds'] ?? null;
        $seconds = is_int($rawTime) || is_float($rawTime)
            ? (int) $rawTime
            : TimeParser::toSeconds((string) $rawTime) ?? TimeParser::fromVeoUrl((string) $rawTime);
        if ($seconds === null || $seconds < 0) {
            $errors['timestampSeconds'] = 'Čas zadejte v sekundách nebo jako mm:ss.';
        }
        $kind = MarkerKind::tryFrom((string) ($in['kind'] ?? 'tactic'));
        if ($kind === null) {
            $errors['kind'] = 'Neznámý typ situace.';
        }
        $title = trim((string) ($in['title'] ?? ''));
        if ($title === '' || mb_strlen($title) > 255) {
            $errors['title'] = 'Vyplňte název situace (max. 255 znaků).';
        }
        $link = self::nullableString($in['ruleLink'] ?? null);
        if ($link !== null && (mb_strlen($link) > 500 || !filter_var($link, FILTER_VALIDATE_URL) || !preg_match('#^https?://#', $link))) {
            $errors['ruleLink'] = 'Odkaz musí být platná adresa http(s).';
        }
        if ($errors) {
            throw HttpException::validation($errors);
        }
        $ruleId = isset($in['ruleId']) && (int) $in['ruleId'] > 0 ? (int) $in['ruleId'] : null;

        return new self((int) $seconds, $kind, $title, self::nullableString($in['description'] ?? null), $ruleId, $link);
    }

    private static function nullableString(mixed $v): ?string
    {
        $s = trim((string) ($v ?? ''));
        return $s === '' ? null : $s;
    }
}
