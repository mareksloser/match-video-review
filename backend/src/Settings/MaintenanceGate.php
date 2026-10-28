<?php

declare(strict_types=1);

namespace Mvr\Settings;

use Mvr\Auth\Authenticator;
use Mvr\Http\Request;
use Mvr\Http\Response;

/**
 * In maintenance mode every API call returns 503 — except for coaches, and except the few
 * endpoints the app needs to show the maintenance screen and let a coach log in.
 */
final class MaintenanceGate
{
    private const ALWAYS_OPEN = ['/auth/login', '/auth/me', '/settings/public'];

    public function __construct(
        private readonly SettingsService $settings,
        private readonly Authenticator $auth,
    ) {
    }

    public function check(Request $request): ?Response
    {
        if ($this->settings->value('maintenanceEnabled') !== true) {
            return null;
        }
        foreach (self::ALWAYS_OPEN as $path) {
            if (str_ends_with($request->path, $path)) {
                return null;
            }
        }
        if ($this->auth->user($request)?->isAdmin()) {
            return null;
        }
        return Response::json([
            'error' => (string) $this->settings->value('maintenanceMessage'),
            'maintenance' => true,
        ], 503)->withHeaders(['Retry-After' => '300']);
    }
}
