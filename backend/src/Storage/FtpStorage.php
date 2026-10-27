<?php

declare(strict_types=1);

namespace Mvr\Storage;

/** Uploads to the club FTP; files are then served over HTTP from publicBaseUrl. */
final class FtpStorage implements Storage
{
    public function __construct(
        private readonly string $host,
        private readonly string $user,
        private readonly string $password,
        private readonly string $root,
        private readonly string $publicBaseUrl,
    ) {
    }

    public function put(string $localFile, string $relativePath): string
    {
        if (!function_exists('ftp_connect')) {
            throw new \RuntimeException('PHP rozšíření ftp není nainstalované.');
        }
        $conn = ftp_ssl_connect($this->host) ?: ftp_connect($this->host);
        if ($conn === false || !ftp_login($conn, $this->user, $this->password)) {
            throw new \RuntimeException('Nepodařilo se přihlásit k FTP.');
        }
        try {
            ftp_pasv($conn, true);
            $target = rtrim($this->root, '/') . '/' . $relativePath;
            $dir = '';
            foreach (explode('/', trim(dirname($target), '/')) as $part) {
                $dir .= '/' . $part;
                @ftp_mkdir($conn, $dir);
            }
            if (!ftp_put($conn, $target, $localFile, FTP_BINARY)) {
                throw new \RuntimeException('Nahrání na FTP selhalo.');
            }
        } finally {
            ftp_close($conn);
        }
        return $relativePath;
    }

    public function publicUrl(string $relativePath): string
    {
        return rtrim($this->publicBaseUrl, '/') . '/' . implode('/', array_map('rawurlencode', explode('/', $relativePath)));
    }
}
