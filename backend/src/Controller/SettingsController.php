<?php

declare(strict_types=1);

namespace Mvr\Controller;

use Mvr\Auth\Authenticator;
use Mvr\Http\HttpException;
use Mvr\Http\Request;
use Mvr\Http\Response;
use Mvr\Settings\SettingsService;

final class SettingsController
{
    public function __construct(
        private readonly Authenticator $auth,
        private readonly SettingsService $settings,
    ) {
    }

    /**
     * GET /settings/public — for everyone. Not cacheable: turning maintenance on/off or
     * changing the title must apply on the next request, and the payload is tiny.
     */
    public function publicValues(Request $request): Response
    {
        return Response::json($this->settings->publicValues())->withHeaders(['Cache-Control' => 'no-store']);
    }

    /** GET /settings — coach: all settings with defaults and who changed them. */
    public function index(Request $request): Response
    {
        return Response::json($this->settings->adminList($this->auth->user($request)));
    }

    /** PUT /settings — {"values": {"accentColor": "#d3012a", "siteTitle": null}}; null = back to default. */
    public function update(Request $request): Response
    {
        $values = $request->json()['values'] ?? null;
        if (!is_array($values)) {
            throw HttpException::badRequest('Očekáván objekt "values".');
        }
        return Response::json($this->settings->update($this->auth->user($request), $values));
    }
}
