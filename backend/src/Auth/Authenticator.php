<?php

declare(strict_types=1);

namespace Mvr\Auth;

use Mvr\Auth\Oidc\TokenVerifier;
use Mvr\Domain\User;
use Mvr\Http\HttpException;
use Mvr\Http\Request;

/**
 * Resolves the bearer token (an access token from the club IdP) to a local user.
 * Passwords no longer exist in MVR: signing in happens at the IdP, MVR only verifies tokens.
 */
final class Authenticator
{
    public const NO_ACCESS = 'Váš klubový účet zatím nemá přístup k videorozborům. Požádejte trenéra o přidělení role.';

    /** Per-request memo: the gate and the controller both ask, but the token is verified once. */
    private array $resolved = [];

    public function __construct(
        private readonly TokenVerifier $verifier,
        private readonly ClaimsMapper $mapper,
        private readonly UserProvisioner $provisioner,
        private readonly AuthLog $log,
    ) {
    }

    /** The signed-in user, or null for anonymous visitors. Invalid tokens and users without an MVR role count as anonymous. */
    public function user(Request $request): ?User
    {
        return $this->resolve($request)['user'];
    }

    /** Called once after the redirect back from the IdP: records the login and returns the user. */
    public function signIn(Request $request, ClientInfo $client): User
    {
        $user = $this->requireUser($request);
        $this->log->loginSucceeded($user, $client);

        return $user;
    }

    /** Like user(), but explains why there is none: 401 = no valid token, 403 = no MVR role. */
    public function requireUser(Request $request): User
    {
        ['identity' => $identity, 'user' => $user] = $this->resolve($request);
        if ($identity === null) {
            throw HttpException::unauthorized('Přihlášení vypršelo, přihlaste se prosím znovu.');
        }

        return $user ?? throw HttpException::forbidden(self::NO_ACCESS);
    }

    /** @return array{identity: ?ClubIdentity, user: ?User} */
    private function resolve(Request $request): array
    {
        $token = $request->bearerToken();
        if ($token === null) {
            return ['identity' => null, 'user' => null];
        }

        return $this->resolved[$token] ??= $this->resolveToken($token);
    }

    /** @return array{identity: ?ClubIdentity, user: ?User} */
    private function resolveToken(string $token): array
    {
        $claims = $this->verifier->verify($token);
        if ($claims === null) {
            return ['identity' => null, 'user' => null];
        }
        $identity = $this->mapper->map($claims);

        return ['identity' => $identity, 'user' => $identity->hasAccess() ? $this->provisioner->resolve($identity) : null];
    }
}
