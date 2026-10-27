<?php

declare(strict_types=1);

namespace Mvr\Controller;

use Mvr\Auth\Authenticator;
use Mvr\Domain\Marker;
use Mvr\Http\Request;
use Mvr\Http\Response;
use Mvr\Service\MarkerService;

final class MarkerController
{
    public function __construct(
        private readonly Authenticator $auth,
        private readonly MarkerService $markers,
    ) {
    }

    public function index(Request $request): Response
    {
        $list = $this->markers->forMatch($this->auth->user($request), $request->intParam('id'));
        return Response::json(array_map(fn (Marker $m) => $m->toArray(), $list));
    }

    public function store(Request $request): Response
    {
        $marker = $this->markers->create($this->auth->user($request), $request->intParam('id'), $request->json());
        return Response::json($marker->toArray(), 201);
    }

    public function update(Request $request): Response
    {
        $marker = $this->markers->update($this->auth->user($request), $request->intParam('id'), $request->json());
        return Response::json($marker->toArray());
    }

    public function destroy(Request $request): Response
    {
        $this->markers->delete($this->auth->user($request), $request->intParam('id'));
        return Response::noContent();
    }

    public function drawing(Request $request): Response
    {
        $this->markers->saveDrawing($this->auth->user($request), $request->intParam('id'), $request->json());
        return Response::noContent();
    }

    public function review(Request $request): Response
    {
        $this->markers->setReviewed($this->auth->user($request), $request->intParam('id'), (bool) ($request->json()['reviewed'] ?? false));
        return Response::noContent();
    }

    public function view(Request $request): Response
    {
        $this->markers->markViewed($this->auth->user($request), $request->intParam('id'));
        return Response::noContent();
    }
}
