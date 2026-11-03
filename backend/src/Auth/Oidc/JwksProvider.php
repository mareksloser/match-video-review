<?php

declare(strict_types=1);

namespace Mvr\Auth\Oidc;

/** Source of the identity provider's public signing keys (JWK set). */
interface JwksProvider
{
    /**
     * @param bool $refresh true asks for a fresh download (e.g. an unknown `kid` after key rotation)
     * @return list<array<string, mixed>> the JWKs, possibly empty when the IdP is unreachable
     */
    public function keys(bool $refresh = false): array;
}
