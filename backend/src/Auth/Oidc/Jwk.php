<?php

declare(strict_types=1);

namespace Mvr\Auth\Oidc;

/** Converts an RSA JWK (n, e) to a PEM public key for openssl_verify(). Pure, no I/O. */
final class Jwk
{
    /** @param array<string, mixed> $jwk */
    public static function rsaPublicKeyPem(array $jwk): ?string
    {
        if (($jwk['kty'] ?? null) !== 'RSA' || !is_string($jwk['n'] ?? null) || !is_string($jwk['e'] ?? null)) {
            return null;
        }
        $n = self::b64urlDecode($jwk['n']);
        $e = self::b64urlDecode($jwk['e']);
        if ($n === null || $e === null || $n === '' || $e === '') {
            return null;
        }

        // SubjectPublicKeyInfo { AlgorithmIdentifier rsaEncryption, BIT STRING RSAPublicKey { n, e } }
        $rsaPublicKey = self::der(0x30, self::derInteger($n) . self::derInteger($e));
        $algorithm = hex2bin('300d06092a864886f70d0101010500');
        $spki = self::der(0x30, $algorithm . self::der(0x03, "\x00" . $rsaPublicKey));

        return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($spki), 64, "\n") . "-----END PUBLIC KEY-----\n";
    }

    public static function b64urlDecode(string $value): ?string
    {
        $decoded = base64_decode(strtr($value, '-_', '+/') . str_repeat('=', (4 - strlen($value) % 4) % 4), true);

        return $decoded === false ? null : $decoded;
    }

    private static function derInteger(string $bytes): string
    {
        $bytes = ltrim($bytes, "\x00");
        if ($bytes === '' || ord($bytes[0]) > 0x7f) {
            $bytes = "\x00" . $bytes; // keep the integer positive
        }

        return self::der(0x02, $bytes);
    }

    private static function der(int $tag, string $content): string
    {
        $length = strlen($content);
        if ($length < 0x80) {
            return chr($tag) . chr($length) . $content;
        }
        $lengthBytes = ltrim(pack('N', $length), "\x00");

        return chr($tag) . chr(0x80 | strlen($lengthBytes)) . $lengthBytes . $content;
    }
}
