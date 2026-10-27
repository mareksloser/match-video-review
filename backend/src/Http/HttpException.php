<?php

declare(strict_types=1);

namespace Mvr\Http;

final class HttpException extends \RuntimeException
{
    /** @param array<string, string> $fieldErrors */
    public function __construct(string $message, public readonly int $status, public readonly array $fieldErrors = [])
    {
        parent::__construct($message, $status);
    }

    public static function badRequest(string $message): self
    {
        return new self($message, 400);
    }

    /** @param array<string, string> $fields */
    public static function validation(array $fields): self
    {
        return new self('Formulář obsahuje chyby.', 422, $fields);
    }

    public static function unauthorized(string $message = 'Přihlaste se.'): self
    {
        return new self($message, 401);
    }

    public static function forbidden(string $message = 'K této akci nemáte oprávnění.'): self
    {
        return new self($message, 403);
    }

    public static function notFound(string $message = 'Nenalezeno.'): self
    {
        return new self($message, 404);
    }
}
