<?php

declare(strict_types=1);

namespace Mvr\Auth\Oidc;

use Mvr\Support\Clock;

/**
 * Validates an RS256 access token issued by the club IdP: signature (via JWKS),
 * issuer, audience (our client_id) and time window. Returns the claims or null.
 */
final class TokenVerifier
{
    public function __construct(
        private readonly JwksProvider $jwks,
        private readonly Clock $clock,
        private readonly string $issuer,
        private readonly string $audience,
        private readonly int $leewaySeconds = 30,
    ) {
    }

    /** @return array<string, mixed>|null */
    public function verify(string $jwt): ?array
    {
        $parts = explode('.', $jwt);
        if (count($parts) !== 3) {
            return null;
        }
        [$headerB64, $payloadB64, $signatureB64] = $parts;

        $header = self::json($headerB64);
        $claims = self::json($payloadB64);
        $signature = Jwk::b64urlDecode($signatureB64);
        if ($header === null || $claims === null || $signature === null || ($header['alg'] ?? null) !== 'RS256') {
            return null;
        }

        $kid = is_string($header['kid'] ?? null) ? $header['kid'] : null;
        $pem = $this->publicKey($kid);
        if ($pem === null || openssl_verify("$headerB64.$payloadB64", $signature, $pem, OPENSSL_ALGO_SHA256) !== 1) {
            return null;
        }

        return $this->claimsAreValid($claims) ? $claims : null;
    }

    /** @param array<string, mixed> $claims */
    private function claimsAreValid(array $claims): bool
    {
        $now = $this->clock->now()->getTimestamp();
        $audience = $claims['aud'] ?? null;
        $audiences = is_array($audience) ? $audience : [$audience];

        return rtrim((string) ($claims['iss'] ?? ''), '/') === rtrim($this->issuer, '/')
            && in_array($this->audience, $audiences, true)
            && is_int($claims['exp'] ?? null) && $claims['exp'] > $now - $this->leewaySeconds
            && (!isset($claims['nbf']) || (is_int($claims['nbf']) && $claims['nbf'] <= $now + $this->leewaySeconds))
            && is_string($claims['sub'] ?? null) && $claims['sub'] !== '';
    }

    private function publicKey(?string $kid): ?string
    {
        // An unknown kid usually means the IdP rotated its key: download the set once more.
        return $this->findKey($this->jwks->keys(), $kid) ?? $this->findKey($this->jwks->keys(refresh: true), $kid);
    }

    /** @param list<array<string, mixed>> $keys */
    private function findKey(array $keys, ?string $kid): ?string
    {
        foreach ($keys as $jwk) {
            if (($jwk['use'] ?? 'sig') !== 'sig') {
                continue;
            }
            if ($kid === null || ($jwk['kid'] ?? null) === $kid) {
                return Jwk::rsaPublicKeyPem($jwk);
            }
        }

        return null;
    }

    /** @return array<string, mixed>|null */
    private static function json(string $b64): ?array
    {
        $raw = Jwk::b64urlDecode($b64);
        $data = $raw !== null ? json_decode($raw, true) : null;

        return is_array($data) ? $data : null;
    }
}
