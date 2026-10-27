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

    /**
     * @param string $stamp Value tied to the user's credentials (see Authenticator); when it changes,
     *                      previously issued tokens stop being accepted.
     */
    public function issue(int $userId, string $stamp = ''): string
    {
        $payload = self::b64(json_encode([
            'uid' => $userId,
            'stm' => $stamp,
            'exp' => $this->clock->now()->getTimestamp() + $this->ttlSeconds,
        ], JSON_THROW_ON_ERROR));
        return $payload . '.' . self::b64(hash_hmac('sha256', $payload, $this->secret, true));
    }

    /**
     * Returns the user id and stamp, or null for a forged, malformed or expired token.
     *
     * @return array{uid: int, stamp: string}|null
     */
    public function verify(string $token): ?array
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
        if ($data['exp'] <= $this->clock->now()->getTimestamp()) {
            return null;
        }
        return ['uid' => $data['uid'], 'stamp' => is_string($data['stm'] ?? null) ? $data['stm'] : ''];
    }

    private static function b64(string $raw): string
    {
        return rtrim(strtr(base64_encode($raw), '+/', '-_'), '=');
    }
}
