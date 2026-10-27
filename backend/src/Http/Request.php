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
    ) {
    }

    public static function fromGlobals(): self
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
        );
    }

    /** @param array<string, string> $params */
    public function withRouteParams(array $params): self
    {
        return new self($this->method, $this->path, $this->query, $this->headers, $this->body, $params, $this->files);
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
