<?php

declare(strict_types=1);

namespace Mvr\Settings;

/**
 * One known setting: its type, default and validation. Pure.
 *
 * @phpstan-type Kind 'string'|'text'|'bool'|'color'|'enum'
 */
final class SettingDefinition
{
    /** @param list<string> $options for kind=enum */
    public function __construct(
        public readonly string $key,
        public readonly string $kind,
        public readonly mixed $default,
        public readonly bool $public,
        public readonly int $maxLength = 255,
        public readonly array $options = [],
        public readonly bool $required = false,
    ) {
    }

    /**
     * Returns the normalized value or throws with a Czech message for the form.
     *
     * @throws \InvalidArgumentException
     */
    public function validate(mixed $value): mixed
    {
        switch ($this->kind) {
            case 'bool':
                if (!is_bool($value)) {
                    throw new \InvalidArgumentException('Očekávána hodnota ano/ne.');
                }
                return $value;
            case 'color':
                if (!is_string($value) || !preg_match('/^#[0-9a-f]{6}$/i', $value)) {
                    throw new \InvalidArgumentException('Barva musí být ve tvaru #RRGGBB.');
                }
                return strtolower($value);
            case 'enum':
                if (!in_array($value, $this->options, true)) {
                    throw new \InvalidArgumentException('Neplatná volba.');
                }
                return $value;
            default: // string, text
                if (!is_string($value)) {
                    throw new \InvalidArgumentException('Očekáván text.');
                }
                $value = trim($value);
                if ($this->kind === 'string') {
                    $value = preg_replace('/\s+/', ' ', $value) ?? $value;
                }
                if ($this->required && $value === '') {
                    throw new \InvalidArgumentException('Pole nesmí být prázdné.');
                }
                if (mb_strlen($value) > $this->maxLength) {
                    throw new \InvalidArgumentException("Maximálně {$this->maxLength} znaků.");
                }
                return $value;
        }
    }
}
