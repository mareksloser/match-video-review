<?php

declare(strict_types=1);

namespace Mvr\Controller;

use Mvr\Auth\Authenticator;
use Mvr\Auth\ClientInfo;
use Mvr\Http\Request;
use Mvr\Http\Response;

final class AuthController
{
    public function __construct(
        private readonly Authenticator $auth,
        private readonly string $issuer,
        private readonly string $clientId,
    ) {
    }

    /** Public: where the SPA should send users to sign in. Keeps the frontend build environment-agnostic. */
    public function config(Request $request): Response
    {
        return Response::json(['issuer' => rtrim($this->issuer, '/'), 'clientId' => $this->clientId]);
    }

    /** Called by the SPA right after the redirect back from the IdP (with the new access token). */
    public function login(Request $request): Response
    {
        return Response::json(['user' => $this->auth->signIn($request, ClientInfo::fromRequest($request))->toArray()]);
    }

    public function me(Request $request): Response
    {
        return Response::json($this->auth->requireUser($request)->toArray());
    }
}
