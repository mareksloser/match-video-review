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
        return ['user' => $user, 'token' => $this->tokens->issue($user->id)];
    }

    /** The signed-in user, or null for anonymous visitors. Invalid tokens count as anonymous. */
    public function user(Request $request): ?User
    {
        $token = $request->bearerToken();
        $id = $token !== null ? $this->tokens->verify($token) : null;
        return $id !== null ? $this->users->find($id) : null;
    }
}
