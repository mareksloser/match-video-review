<?php

declare(strict_types=1);

namespace Mvr\Auth;

use Mvr\Http\Request;

/** Who is on the other end of a request, for the auth log. */
final class ClientInfo
{
    public function __construct(
        public readonly string $ip,
        public readonly string $userAgent,
    ) {
    }

    public static function fromRequest(Request $request): self
    {
        return new self($request->ip, mb_substr($request->header('user-agent') ?? '', 0, 255));
    }

    public static function none(): self
    {
        return new self('', '');
    }
}
