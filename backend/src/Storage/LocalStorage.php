<?php

declare(strict_types=1);

namespace Mvr\Storage;

final class LocalStorage implements Storage
{
    public function __construct(private readonly string $root, private readonly string $publicBaseUrl)
    {
    }

    public function put(string $localFile, string $relativePath): string
    {
        $target = rtrim($this->root, '/') . '/' . $relativePath;
        if (!is_dir(dirname($target)) && !mkdir(dirname($target), 0775, true) && !is_dir(dirname($target))) {
            throw new \RuntimeException('Nelze vytvořit adresář pro video.');
        }
        if (!rename($localFile, $target) && !copy($localFile, $target)) {
            throw new \RuntimeException('Video se nepodařilo uložit.');
        }
        return $relativePath;
    }

    public function publicUrl(string $relativePath): string
    {
        return rtrim($this->publicBaseUrl, '/') . '/' . implode('/', array_map('rawurlencode', explode('/', $relativePath)));
    }
}
