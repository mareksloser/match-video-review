<?php

declare(strict_types=1);

namespace Mvr\Video;

final class VideoSourceRegistry
{
    /** @var array<string, VideoSource> */
    private array $sources = [];

    public function register(VideoSource $source): self
    {
        $this->sources[$source->type()] = $source;
        return $this;
    }

    public function get(string $type): VideoSource
    {
        return $this->sources[$type] ?? throw new \InvalidArgumentException("Nepodporovaný zdroj videa: $type");
    }

    public function detect(string $url): ?VideoSource
    {
        foreach ($this->sources as $source) {
            if ($source->supports($url)) {
                return $source;
            }
        }
        return null;
    }

    /** Normalizes using the declared type, or auto-detects when type is "auto". */
    public function normalize(string $type, string $url): NormalizedVideo
    {
        $source = $type === 'auto' ? $this->detect($url) : $this->get($type);
        if ($source === null) {
            throw new \InvalidArgumentException('Zdroj videa se nepodařilo rozpoznat.');
        }
        return $source->normalize($url);
    }
}
