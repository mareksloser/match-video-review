<?php

declare(strict_types=1);

namespace Mvr\Auth;

use Mvr\Domain\User;
use Mvr\Http\HttpException;
use Mvr\Http\Request;
use Mvr\Repository\UserRepository;

final class Authenticator
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly TokenService $tokens,
    ) {
    }

    /** @return array{user: User, token: string} */
    public function login(string $email, string $password): array
    {
        $user = $this->users->findByEmail(mb_strtolower(trim($email)));
        if ($user === null || !password_verify($password, $user->passwordHash)) {
            throw HttpException::unauthorized('Nesprávný e-mail nebo heslo.');
        }
        return ['user' => $user, 'token' => $this->tokens->issue($user->id, self::stamp($user))];
    }

    /** The signed-in user, or null for anonymous visitors. Invalid tokens count as anonymous. */
    public function user(Request $request): ?User
    {
        $token = $request->bearerToken();
        $claims = $token !== null ? $this->tokens->verify($token) : null;
        if ($claims === null) {
            return null;
        }
        $user = $this->users->find($claims['uid']);
        // Deleted user, or password changed since the token was issued → treat as anonymous.
        return $user !== null && hash_equals(self::stamp($user), $claims['stamp']) ? $user : null;
    }

    /** Short fingerprint of the password hash (the hash itself never leaves the server). */
    private static function stamp(User $user): string
    {
        return substr(hash('sha256', $user->passwordHash), 0, 16);
    }
}
