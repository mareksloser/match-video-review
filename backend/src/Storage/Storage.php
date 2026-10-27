<?php

declare(strict_types=1);

namespace Mvr\Storage;

/** Where uploaded videos live. Local disk and FTP ship; an S3 adapter only needs these two methods. */
interface Storage
{
    /** Stores a local temp file under a relative path and returns that path. */
    public function put(string $localFile, string $relativePath): string;

    public function publicUrl(string $relativePath): string;
}
