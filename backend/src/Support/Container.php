<?php

declare(strict_types=1);

namespace Mvr\Support;

/**
 * Explicit dependency container: every service is wired by a factory in
 * config/services.php. No reflection magic — tests can override any entry.
 */
final class Container
{
    /** @var array<string, callable(Container): object> */
    private array $factories = [];
    /** @var array<string, object> */
    private array $instances = [];

    /** @param callable(Container): object $factory */
    public function set(string $id, callable $factory): void
    {
        $this->factories[$id] = $factory;
        unset($this->instances[$id]);
    }

    /**
     * @template T of object
     * @param class-string<T> $id
     * @return T
     */
    public function get(string $id): object
    {
        if (!isset($this->instances[$id])) {
            if (!isset($this->factories[$id])) {
                throw new \LogicException("Service $id is not registered");
            }
            $this->instances[$id] = ($this->factories[$id])($this);
        }
        /** @var T */
        return $this->instances[$id];
    }
}
