<?php

declare(strict_types=1);

namespace Mvr\Domain;

use Mvr\Http\HttpException;

/** Validated input for creating a match. */
final class MatchData
{
    public function __construct(
        public readonly string $title,
        public readonly string $matchDate,
        public readonly int $teamCategoryId,
        public readonly string $videoType,
        public readonly string $videoUrl,
        public readonly bool $isPublic,
    ) {
    }

    /** @param array<string, mixed> $in */
    public static function fromArray(array $in): self
    {
        $errors = [];
        $title = trim((string) ($in['title'] ?? ''));
        $date = (string) ($in['matchDate'] ?? '');
        $category = (int) ($in['teamCategoryId'] ?? 0);
        $type = (string) ($in['videoType'] ?? '');
        $url = trim((string) ($in['videoUrl'] ?? ''));

        if ($title === '' || mb_strlen($title) > 255) {
            $errors['title'] = 'Vyplňte název (max. 255 znaků).';
        }
        $parsed = \DateTimeImmutable::createFromFormat('!Y-m-d', $date);
        if ($parsed === false || $parsed->format('Y-m-d') !== $date) {
            $errors['matchDate'] = 'Datum musí být ve formátu RRRR-MM-DD.';
        }
        if ($category <= 0) {
            $errors['teamCategoryId'] = 'Vyberte tým.';
        }
        if (!preg_match('/^[a-z0-9_-]{2,20}$/', $type)) {
            $errors['videoType'] = 'Neznámý zdroj videa.';
        }
        if ($url === '') {
            $errors['videoUrl'] = 'Vyplňte adresu videa.';
        }
        if ($errors) {
            throw HttpException::validation($errors);
        }
        return new self($title, $date, $category, $type, $url, (bool) ($in['isPublic'] ?? false));
    }

    public function withVideo(string $type, string $url): self
    {
        return new self($this->title, $this->matchDate, $this->teamCategoryId, $type, $url, $this->isPublic);
    }
}
