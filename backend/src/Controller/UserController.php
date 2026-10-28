<?php

declare(strict_types=1);

namespace Mvr\Controller;

use Mvr\Auth\Authenticator;
use Mvr\Auth\ClientInfo;
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

    public function store(Request $request): Response
    {
        return Response::json($this->users->create($this->auth->user($request), $request->json(), ClientInfo::fromRequest($request))->toArray(), 201);
    }

    public function update(Request $request): Response
    {
        return Response::json($this->users->update($this->auth->user($request), $request->intParam('id'), $request->json(), ClientInfo::fromRequest($request))->toArray());
    }

    public function destroy(Request $request): Response
    {
        $this->users->delete($this->auth->user($request), $request->intParam('id'), ClientInfo::fromRequest($request));
        return Response::noContent();
    }
}
