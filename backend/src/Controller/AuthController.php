<?php

declare(strict_types=1);

namespace Mvr\Controller;

use Mvr\Auth\Authenticator;
use Mvr\Http\HttpException;
use Mvr\Http\Request;
use Mvr\Http\Response;

final class AuthController
{
    public function __construct(private readonly Authenticator $auth)
    {
    }

    public function login(Request $request): Response
    {
        $in = $request->json();
        $result = $this->auth->login((string) ($in['email'] ?? ''), (string) ($in['password'] ?? ''));
        return Response::json(['user' => $result['user']->toArray(), 'token' => $result['token']]);
    }

    public function me(Request $request): Response
    {
        $user = $this->auth->user($request) ?? throw HttpException::unauthorized();
        return Response::json($user->toArray());
    }
}
