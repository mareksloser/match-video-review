<?php

declare(strict_types=1);

namespace Mvr\Service;

use Mvr\Auth\AccessPolicy;
use Mvr\Domain\User;
use Mvr\Http\HttpException;
use Mvr\Storage\Storage;
use Mvr\Support\Clock;

final class VideoUploadService
{
    private const MIME = ['video/mp4' => 'mp4', 'video/webm' => 'webm'];

    public function __construct(
        private readonly Storage $storage,
        private readonly AccessPolicy $policy,
        private readonly Clock $clock,
    ) {
    }

    /**
     * @param array{tmp_name?: string, name?: string, error?: int, type?: string} $file entry from $_FILES
     * @return array{url: string, path: string}
     */
    public function upload(?User $viewer, array $file): array
    {
        $this->policy->requireAdmin($viewer);
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'] ?? '')) {
            throw HttpException::validation(['video' => 'Soubor se nepodařilo nahrát (zkontrolujte upload_max_filesize).']);
        }
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']) ?: '';
        $ext = self::MIME[$mime] ?? throw HttpException::validation(['video' => 'Podporované formáty jsou MP4 a WebM.']);

        $name = pathinfo($file['name'] ?? 'video', PATHINFO_FILENAME);
        $ascii = function_exists('iconv') ? (string) @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $name) : $name;
        $base = preg_replace('/[^a-z0-9]+/', '-', strtolower($ascii)) ?: 'video';
        $path = sprintf('%s/%s-%s.%s', $this->clock->now()->format('Y/m'), trim($base, '-'), bin2hex(random_bytes(3)), $ext);
        $this->storage->put($file['tmp_name'], $path);

        return ['url' => $this->storage->publicUrl($path), 'path' => $path];
    }
}
