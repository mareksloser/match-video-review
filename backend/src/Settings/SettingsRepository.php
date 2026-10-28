<?php

declare(strict_types=1);

namespace Mvr\Settings;

interface SettingsRepository
{
    /** @return array<string, array{value: mixed, updatedAt: string, updatedBy: ?string}> stored (non-default) values */
    public function all(): array;

    public function set(string $key, mixed $value, ?int $userId, \DateTimeImmutable $at): void;

    public function delete(string $key): void;
}
