<?php

declare(strict_types=1);

namespace Mvr\Video;

use Mvr\Storage\Storage;

/** MP4/WebM on FTP, S3 or local storage. Relative paths are resolved through Storage. */
final class FileSource implements VideoSource
{
    private const EXTENSIONS = ['mp4', 'webm', 'm4v', 'mov'];

    public function __construct(private readonly Storage $storage)
    {
    }

    public function type(): string
    {
        return 'ftp';
    }

    public function supports(string $url): bool
    {
        $path = (string) (parse_url($url, PHP_URL_PATH) ?? $url);
        return in_array(strtolower(pathinfo($path, PATHINFO_EXTENSION)), self::EXTENSIONS, true);
    }

    public function normalize(string $url): NormalizedVideo
    {
        if (!$this->supports($url)) {
            throw new \InvalidArgumentException('Podporované formáty jsou MP4 a WebM.');
        }
        // Full URLs and site-absolute paths (e.g. "/videos/2026/10/x.mp4" from an upload) are already public.
        if (preg_match('#^(https?://|/)#i', $url)) {
            return new NormalizedVideo('ftp', $url);
        }
        if (str_contains($url, '..')) {
            throw new \InvalidArgumentException('Neplatná cesta k souboru.');
        }
        return new NormalizedVideo('ftp', $this->storage->publicUrl(ltrim($url, '/')));
    }
}
