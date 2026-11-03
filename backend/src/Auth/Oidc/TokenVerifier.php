<?php

declare(strict_types=1);

namespace Mvr\Auth\Oidc;

use Mvr\Support\Clock;

/**
 * Validates an RS256 access token issued by the club IdP: signature (via JWKS),
 * issuer, audience (our client_id) and time window. Returns the claims or null.
 * The reason for a rejection is logged (never the token itself), so a misconfiguration
 * such as a wrong OIDC_ISSUER is visible in the error log instead of a silent 401.
 */
final class TokenVerifier
{
    /** @var \Closure(string): void */
    private readonly \Closure $log;

    /** @param (\Closure(string): void)|null $log defaults to error_log() */
    public function __construct(
        private readonly JwksProvider $jwks,
        private readonly Clock $clock,
        private readonly string $issuer,
        private readonly string $audience,
        private readonly int $leewaySeconds = 30,
        ?\Closure $log = null,
    ) {
        $this->log = $log ?? static function (string $message): void {
            error_log($message);
        };
    }

    /** @return array<string, mixed>|null */
    public function verify(string $jwt): ?array
    {
        $parts = explode('.', $jwt);
        if (count($parts) !== 3) {
            return $this->reject('not a JWT');
        }
        [$headerB64, $payloadB64, $signatureB64] = $parts;

        $header = self::json($headerB64);
        $claims = self::json($payloadB64);
        $signature = Jwk::b64urlDecode($signatureB64);
        if ($header === null || $claims === null || $signature === null) {
            return $this->reject('malformed JWT');
        }
        if (($header['alg'] ?? null) !== 'RS256') {
            return $this->reject('unsupported alg ' . self::q($header['alg'] ?? null));
        }

        $kid = is_string($header['kid'] ?? null) ? $header['kid'] : null;
        $pem = $this->publicKey($kid);
        if ($pem === null) {
            return $this->reject('no public key for kid ' . self::q($kid) . ' (is the JWKS reachable from this server?)');
        }
        if (openssl_verify("$headerB64.$payloadB64", $signature, $pem, OPENSSL_ALGO_SHA256) !== 1) {
            return $this->reject('invalid signature');
        }

        $problem = $this->claimsProblem($claims);

        return $problem === null ? $claims : $this->reject($problem);
    }

    /** @param array<string, mixed> $claims */
    private function claimsProblem(array $claims): ?string
    {
        $now = $this->clock->now()->getTimestamp();
        $issuer = (string) ($claims['iss'] ?? '');
        if (rtrim($issuer, '/') !== rtrim($this->issuer, '/')) {
            return sprintf('issuer %s does not match OIDC_ISSUER %s', self::q($issuer), self::q($this->issuer));
        }
        $audience = $claims['aud'] ?? null;
        if (!in_array($this->audience, is_array($audience) ? $audience : [$audience], true)) {
            return sprintf('audience %s does not contain OIDC_CLIENT_ID %s', self::q($audience), self::q($this->audience));
        }
        if (!is_int($claims['exp'] ?? null) || $claims['exp'] <= $now - $this->leewaySeconds) {
            return sprintf('expired (exp %s, server time %d – check the clock)', self::q($claims['exp'] ?? null), $now);
        }
        if (isset($claims['nbf']) && (!is_int($claims['nbf']) || $claims['nbf'] > $now + $this->leewaySeconds)) {
            return sprintf('not valid yet (nbf %s, server time %d – check the clock)', self::q($claims['nbf']), $now);
        }
        if (!is_string($claims['sub'] ?? null) || $claims['sub'] === '') {
            return 'missing sub';
        }

        return null;
    }

    private static function q(mixed $value): string
    {
        return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '?';
    }

    private function reject(string $reason): null
    {
        ($this->log)('[mvr] access token rejected: ' . $reason);

        return null;
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
