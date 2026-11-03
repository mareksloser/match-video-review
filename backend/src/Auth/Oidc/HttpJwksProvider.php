<?php

declare(strict_types=1);

namespace Mvr\Auth\Oidc;

use Mvr\Support\Clock;

/**
 * Downloads the JWK set from the IdP and caches it in a file, so a normal request
 * never waits for the network. Refreshes are rate-limited; when the IdP is unreachable
 * the last cached keys keep working.
 */
final class HttpJwksProvider implements JwksProvider
{
    /** Minimum gap between forced refreshes, so forged `kid`s can't make us hammer the IdP. */
    private const MIN_REFRESH_INTERVAL = 60;

    /** @var \Closure(string): (string|null) */
    private readonly \Closure $fetch;

    /** @param (\Closure(string): (string|null))|null $fetch HTTP GET returning the body or null; injectable for tests */
    public function __construct(
        private readonly string $jwksUrl,
        private readonly string $cacheFile,
        private readonly Clock $clock,
        private readonly int $ttlSeconds = 3600,
        ?\Closure $fetch = null,
    ) {
        $this->fetch = $fetch ?? self::httpGet(...);
    }

    public function keys(bool $refresh = false): array
    {
        $cached = $this->readCache();
        $age = $cached !== null ? $this->clock->now()->getTimestamp() - $cached['fetchedAt'] : PHP_INT_MAX;

        $fresh = $refresh ? $age < self::MIN_REFRESH_INTERVAL : $age < $this->ttlSeconds;
        if ($cached !== null && $fresh) {
            return $cached['keys'];
        }

        $keys = $this->download();
        if ($keys === null) {
            return $cached['keys'] ?? []; // IdP unreachable: stale keys are better than locking everyone out
        }
        $this->writeCache($keys);

        return $keys;
    }

    /** @return list<array<string, mixed>>|null */
    private function download(): ?array
    {
        $body = ($this->fetch)($this->jwksUrl);
        $data = $body !== null ? json_decode($body, true) : null;
        if (!is_array($data) || !is_array($data['keys'] ?? null)) {
            if ($body !== null) {
                error_log("[mvr] JWKS from {$this->jwksUrl} is not a JWK set: " . mb_substr($body, 0, 200));
            }
            return null;
        }

        return array_values(array_filter($data['keys'], 'is_array'));
    }

    /** @return array{fetchedAt: int, keys: list<array<string, mixed>>}|null */
    private function readCache(): ?array
    {
        if (!is_file($this->cacheFile)) {
            return null;
        }
        $data = json_decode((string) file_get_contents($this->cacheFile), true);
        if (!is_array($data) || !is_int($data['fetchedAt'] ?? null) || !is_array($data['keys'] ?? null)) {
            return null;
        }

        return ['fetchedAt' => $data['fetchedAt'], 'keys' => array_values($data['keys'])];
    }

    /** @param list<array<string, mixed>> $keys */
    private function writeCache(array $keys): void
    {
        $dir = dirname($this->cacheFile);
        if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
            return; // caching is an optimisation; without it every request downloads the keys
        }
        $tmp = $this->cacheFile . '.' . bin2hex(random_bytes(4));
        $json = json_encode(['fetchedAt' => $this->clock->now()->getTimestamp(), 'keys' => $keys], JSON_THROW_ON_ERROR);
        if (@file_put_contents($tmp, $json) !== false) {
            @rename($tmp, $this->cacheFile); // atomic: concurrent requests never read a half-written file
        }
    }

    private static function httpGet(string $url): ?string
    {
        $context = stream_context_create(['http' => ['timeout' => 5, 'header' => "Accept: application/json\r\n"]]);
        $body = @file_get_contents($url, false, $context);
        if ($body === false) {
            // Typical causes: allow_url_fopen off, missing CA bundle (openssl.cafile), DNS, firewall.
            error_log("[mvr] cannot download JWKS from $url: " . (error_get_last()['message'] ?? 'unknown error'));
            return null;
        }

        return $body;
    }
}
