<?php

declare(strict_types=1);

namespace Mvr\Controller;

use Mvr\Auth\Authenticator;
use Mvr\Domain\User;
use Mvr\Http\Request;
use Mvr\Http\Response;
use Mvr\Service\UserService;

final class UserController
{
    public function __construct(
        private readonly Authenticator $auth,
        private readonly UserService $users,
    ) {
    }

    public function index(Request $request): Response
    {
        return Response::json(array_map(fn (User $u) => $u->toArray(), $this->users->list($this->auth->user($request))));
    }

    public function store(Request $request): Response
    {
        return Response::json($this->users->create($this->auth->user($request), $request->json())->toArray(), 201);
    }

    public function update(Request $request): Response
    {
        return Response::json($this->users->update($this->auth->user($request), $request->intParam('id'), $request->json())->toArray());
    }

    public function destroy(Request $request): Response
    {
        $this->users->delete($this->auth->user($request), $request->intParam('id'));
        return Response::noContent();
    }
}
