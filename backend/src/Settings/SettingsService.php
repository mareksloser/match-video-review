<?php

declare(strict_types=1);

namespace Mvr\Settings;

use Mvr\Auth\AccessPolicy;
use Mvr\Domain\User;
use Mvr\Http\HttpException;
use Mvr\Support\Clock;

/** Effective settings = defaults from the registry overlaid with stored values. */
final class SettingsService
{
    /** @var array<string, array{value: mixed, updatedAt: string, updatedBy: ?string}>|null */
    private ?array $stored = null;

    public function __construct(
        private readonly SettingsRegistry $registry,
        private readonly SettingsRepository $repository,
        private readonly AccessPolicy $policy,
        private readonly Clock $clock,
    ) {
    }

    public function value(string $key): mixed
    {
        $definition = $this->registry->get($key) ?? throw new \LogicException("Unknown setting $key");
        $stored = $this->stored()[$key]['value'] ?? null;
        if ($stored === null) {
            return $definition->default;
        }
        try {
            return $definition->validate($stored); // a value stored by an older version may no longer be valid
        } catch (\InvalidArgumentException) {
            return $definition->default;
        }
    }

    /** @return array<string, mixed> what every visitor gets (before login too) */
    public function publicValues(): array
    {
        $out = [];
        foreach ($this->registry->all() as $key => $d) {
            if ($d->public) {
                $out[$key] = $this->value($key);
            }
        }
        return $out;
    }

    /** @return list<array<string, mixed>> */
    public function adminList(?User $viewer): array
    {
        $this->policy->requireAdmin($viewer);
        $stored = $this->stored();
        $out = [];
        foreach ($this->registry->all() as $key => $d) {
            $out[] = [
                'key' => $key,
                'kind' => $d->kind,
                'value' => $this->value($key),
                'default' => $d->default,
                'isDefault' => !isset($stored[$key]),
                'options' => $d->options,
                'maxLength' => in_array($d->kind, ['string', 'text'], true) ? $d->maxLength : null,
                'updatedAt' => $stored[$key]['updatedAt'] ?? null,
                'updatedBy' => $stored[$key]['updatedBy'] ?? null,
            ];
        }
        return $out;
    }

    /**
     * Partial update: {"key": value, …}. null resets a key to its default (deletes the row).
     * All values are validated first; nothing is saved if any of them is invalid.
     *
     * @param array<string, mixed> $values
     * @return list<array<string, mixed>>
     */
    public function update(?User $viewer, array $values): array
    {
        $admin = $this->policy->requireAdmin($viewer);
        $clean = [];
        $errors = [];
        foreach ($values as $key => $value) {
            $definition = $this->registry->get((string) $key);
            if ($definition === null) {
                $errors[$key] = 'Neznámé nastavení.';
                continue;
            }
            if ($value === null) {
                $clean[$key] = null;
                continue;
            }
            try {
                $clean[$key] = $definition->validate($value);
            } catch (\InvalidArgumentException $e) {
                $errors[$key] = $e->getMessage();
            }
        }
        if ($errors) {
            throw HttpException::validation($errors);
        }

        $now = $this->clock->now();
        foreach ($clean as $key => $value) {
            $definition = $this->registry->get($key);
            // Storing the default would pin it; keep "default" meaning "follows future defaults".
            if ($value === null || $value === $definition?->default) {
                $this->repository->delete($key);
            } else {
                $this->repository->set($key, $value, $admin->id, $now);
            }
        }
        $this->stored = null;
        return $this->adminList($admin);
    }

    /** @return array<string, array{value: mixed, updatedAt: string, updatedBy: ?string}> */
    private function stored(): array
    {
        try {
            return $this->stored ??= $this->repository->all();
        } catch (\PDOException) {
            // Table not migrated yet: run on defaults instead of taking the whole app down.
            return $this->stored = [];
        }
    }
}
