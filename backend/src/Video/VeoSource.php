<?php

declare(strict_types=1);

namespace Mvr\Video;

final class VeoSource implements VideoSource
{
    public function __construct(private readonly VeoUrlParser $parser)
    {
    }

    public function type(): string
    {
        return 'veo';
    }

    public function supports(string $url): bool
    {
        return $this->parser->isVeo($url);
    }

    public function normalize(string $url): NormalizedVideo
    {
        $parsed = $this->parser->parse($url);
        return new NormalizedVideo('veo', $parsed['matchUrl'], $parsed['startSeconds']);
    }
}
