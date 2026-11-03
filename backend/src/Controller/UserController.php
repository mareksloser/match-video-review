<?php

declare(strict_types=1);

namespace Mvr\Controller;

use Mvr\Auth\Authenticator;
use Mvr\Domain\User;
use Mvr\Http\Request;
use Mvr\Http\Response;
use Mvr\Repository\AuthLogRepository;
use Mvr\Service\UserService;

final class UserController
{
    public function __construct(
        private readonly Authenticator $auth,
        private readonly UserService $users,
        private readonly AuthLogRepository $log,
    ) {
    }

    public function index(Request $request): Response
    {
        $users = $this->users->list($this->auth->user($request));
        $last = $this->log->lastLogins();
        return Response::json(array_map(fn (User $u) => $u->toArray() + ['lastLoginAt' => $last[$u->id] ?? null], $users));
    }
}
