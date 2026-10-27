<?php

declare(strict_types=1);

namespace Mvr\Video;

/**
 * Strategy for one kind of video source. Add Vimeo/Hudl by implementing this
 * interface and registering it in config/services.php.
 */
interface VideoSource
{
    /** Value stored in matches.video_type */
    public function type(): string;

    public function supports(string $url): bool;

    /** Validates and canonicalizes the URL. @throws \InvalidArgumentException */
    public function normalize(string $url): NormalizedVideo;
}
