<?php

declare(strict_types=1);

namespace Mvr\Http;

/** Immutable request value object, built from globals only in the front controller. */
final class Request
{
    /**
     * @param array<string, string> $query
     * @param array<string, string> $headers lower-cased names
     * @param array<string, string> $routeParams
     * @param array<string, mixed> $files
     */
    public function __construct(
        public readonly string $method,
        public readonly string $path,
        public readonly array $query = [],
        public readonly array $headers = [],
        public readonly string $body = '',
        public readonly array $routeParams = [],
        public readonly array $files = [],
        public readonly string $ip = '',
    ) {
    }

    /**
     * @param list<string> $trustedProxies IPs of reverse proxies whose X-Forwarded-For may be believed
     *                                     (e.g. a load balancer); never trust it otherwise, it's spoofable.
     */
    public static function fromGlobals(array $trustedProxies = []): self
    {
        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $headers[strtolower(str_replace('_', '-', substr($key, 5)))] = (string) $value;
            }
        }
        if (isset($_SERVER['CONTENT_TYPE'])) {
            $headers['content-type'] = (string) $_SERVER['CONTENT_TYPE'];
        }
        $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

        return new self(
            strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET'),
            rtrim($path, '/') ?: '/',
            array_map('strval', $_GET),
            $headers,
            (string) file_get_contents('php://input'),
            [],
            $_FILES,
            self::clientIp((string) ($_SERVER['REMOTE_ADDR'] ?? ''), $headers['x-forwarded-for'] ?? null, $trustedProxies),
        );
    }

    /** @param list<string> $trustedProxies */
    public static function clientIp(string $remote, ?string $forwardedFor, array $trustedProxies): string
    {
        if ($forwardedFor !== null && in_array($remote, $trustedProxies, true)) {
            $first = trim(explode(',', $forwardedFor)[0]);
            if (filter_var($first, FILTER_VALIDATE_IP)) {
                return $first;
            }
        }
        return $remote;
    }

    /** @param array<string, string> $params */
    public function withRouteParams(array $params): self
    {
        return new self($this->method, $this->path, $this->query, $this->headers, $this->body, $params, $this->files, $this->ip);
    }

    public function header(string $name): ?string
    {
        return $this->headers[strtolower($name)] ?? null;
    }

    public function bearerToken(): ?string
    {
        $auth = $this->header('authorization') ?? '';
        return preg_match('/^Bearer\s+(\S+)$/i', $auth, $m) ? $m[1] : null;
    }

    public function intParam(string $name): int
    {
        return (int) ($this->routeParams[$name] ?? 0);
    }

    /** @return array<string, mixed> */
    public function json(): array
    {
        if ($this->body === '') {
            return [];
        }
        try {
            $data = json_decode($this->body, true, 64, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw HttpException::badRequest('Tělo požadavku není platný JSON.');
        }
        if (!is_array($data)) {
            throw HttpException::badRequest('Očekáván JSON objekt.');
        }
        return $data;
    }
}
