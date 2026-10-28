<?php

declare(strict_types=1);

namespace Mvr\Settings;

/**
 * All settings the app understands. Add a new one here (plus its use in the app) —
 * no migration needed, the database only stores values that differ from the default.
 * "public" settings are sent to everyone (needed before login: title, colors, maintenance).
 */
final class SettingsRegistry
{
    /** @var array<string, SettingDefinition> */
    private array $definitions = [];

    public function __construct()
    {
        foreach ([
            new SettingDefinition('siteTitle', 'string', 'Match Video Review', public: true, maxLength: 80, required: true),
            new SettingDefinition('clubName', 'string', 'SK Baník Libušín', public: true, maxLength: 80, required: true),
            new SettingDefinition('accentColor', 'color', '#1fbf75', public: true),
            new SettingDefinition('defaultTheme', 'enum', 'system', public: true, options: ['system', 'light', 'dark']),
            new SettingDefinition('publicGallery', 'bool', true, public: true),
            new SettingDefinition('maintenanceEnabled', 'bool', false, public: true),
            new SettingDefinition('maintenanceMessage', 'text', 'Probíhá údržba aplikace. Zkuste to prosím za chvíli.', public: true, maxLength: 500),
        ] as $d) {
            $this->definitions[$d->key] = $d;
        }
    }

    public function get(string $key): ?SettingDefinition
    {
        return $this->definitions[$key] ?? null;
    }

    /** @return array<string, SettingDefinition> */
    public function all(): array
    {
        return $this->definitions;
    }
}
