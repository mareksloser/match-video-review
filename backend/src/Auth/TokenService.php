<?php

declare(strict_types=1);

namespace Mvr\Auth;

use Mvr\Support\Clock;

/** Stateless HMAC-signed bearer tokens: base64url(payload).base64url(signature). */
final class TokenService
{
    public function __construct(
        private readonly string $secret,
        private readonly Clock $clock,
        private readonly int $ttlSeconds = 1209600,
    ) {
        if (strlen($secret) < 16) {
            throw new \InvalidArgumentException('APP_SECRET musí mít alespoň 16 znaků.');
        }
    }

    public function issue(int $userId): string
    {
        $payload = self::b64(json_encode(['uid' => $userId, 'exp' => $this->clock->now()->getTimestamp() + $this->ttlSeconds], JSON_THROW_ON_ERROR));
        return $payload . '.' . self::b64(hash_hmac('sha256', $payload, $this->secret, true));
    }

    /** Returns the user id, or null for a forged, malformed or expired token. */
    public function verify(string $token): ?int
    {
        $parts = explode('.', $token);
        if (count($parts) !== 2) {
            return null;
        }
        [$payload, $signature] = $parts;
        if (!hash_equals(self::b64(hash_hmac('sha256', $payload, $this->secret, true)), $signature)) {
            return null;
        }
        $data = json_decode((string) base64_decode(strtr($payload, '-_', '+/')), true);
        if (!is_array($data) || !is_int($data['uid'] ?? null) || !is_int($data['exp'] ?? null)) {
            return null;
        }
        return $data['exp'] > $this->clock->now()->getTimestamp() ? $data['uid'] : null;
    }

    private static function b64(string $raw): string
    {
        return rtrim(strtr(base64_encode($raw), '+/', '-_'), '=');
    }
}
