<?php

declare(strict_types=1);

namespace Mvr\Domain;

use Mvr\Http\HttpException;

/** Validated input for creating or editing a user. Pure: uniqueness is checked by UserService. */
final class UserData
{
    public const MIN_PASSWORD = 8;

    public function __construct(
        public readonly string $name,
        public readonly string $email,
        public readonly Role $role,
        public readonly ?int $teamCategoryId,
        public readonly ?string $password,
    ) {
    }

    /**
     * @param array<string, mixed> $in
     * @param bool $passwordRequired true when creating; when editing an empty password keeps the old one
     */
    public static function fromArray(array $in, bool $passwordRequired): self
    {
        $errors = [];
        $name = trim((string) ($in['name'] ?? ''));
        $email = mb_strtolower(trim((string) ($in['email'] ?? '')));
        $role = Role::tryFrom((string) ($in['role'] ?? ''));
        $category = isset($in['teamCategoryId']) && (int) $in['teamCategoryId'] > 0 ? (int) $in['teamCategoryId'] : null;
        $password = (string) ($in['password'] ?? '');

        if ($name === '' || mb_strlen($name) > 100) {
            $errors['name'] = 'Vyplňte jméno (max. 100 znaků).';
        }
        if (mb_strlen($email) > 150 || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            $errors['email'] = 'Zadejte platný e-mail.';
        }
        if ($role === null) {
            $errors['role'] = 'Vyberte roli.';
        }
        if ($role === Role::Player && $category === null) {
            $errors['teamCategoryId'] = 'Hráč musí mít tým, jinak uvidí jen veřejná videa.';
        }
        if (($passwordRequired || $password !== '') && mb_strlen($password) < self::MIN_PASSWORD) {
            $errors['password'] = 'Heslo musí mít alespoň ' . self::MIN_PASSWORD . ' znaků.';
        }
        if ($errors) {
            throw HttpException::validation($errors);
        }

        // Admins and viewers see every team, so a category would only be misleading.
        $category = $role === Role::Player ? $category : null;

        return new self($name, $email, $role, $category, $password !== '' ? $password : null);
    }
}
