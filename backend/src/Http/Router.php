<?php

declare(strict_types=1);

namespace Mvr\Http;

use Mvr\Support\Container;

/**
 * Minimal router: "GET /api/matches/{id}" → [ControllerClass, 'method'].
 * Controllers come from the container, so they are constructed with their dependencies.
 */
final class Router
{
    /** @var list<array{string, string, array{class-string, string}}> */
    private array $routes = [];

    public function __construct(private readonly Container $container)
    {
    }

    /** @param array{class-string, string} $handler */
    public function add(string $method, string $pattern, array $handler): self
    {
        $regex = '#^' . preg_replace('#\{(\w+)\}#', '(?P<$1>\d+)', $pattern) . '$#';
        $this->routes[] = [$method, $regex, $handler];
        return $this;
    }

    public function dispatch(Request $request): Response
    {
        $allowed = false;
        foreach ($this->routes as [$method, $regex, [$class, $action]]) {
            if (!preg_match($regex, $request->path, $m)) {
                continue;
            }
            $allowed = true;
            if ($method !== $request->method) {
                continue;
            }
            $params = array_filter($m, 'is_string', ARRAY_FILTER_USE_KEY);
            return $this->container->get($class)->$action($request->withRouteParams($params));
        }
        throw $allowed ? new HttpException('Metoda není povolena.', 405) : HttpException::notFound('Neznámý endpoint.');
    }
}
