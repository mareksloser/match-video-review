<?php

declare(strict_types=1);

namespace Mvr\Controller;

use Mvr\Auth\Authenticator;
use Mvr\Domain\TeamCategory;
use Mvr\Http\Request;
use Mvr\Http\Response;
use Mvr\Repository\CategoryRepository;
use Mvr\Service\AnalyticsService;
use Mvr\Service\MatchService;

/** Thin HTTP adapter: parse request → call service → serialize. */
final class MatchController
{
    public function __construct(
        private readonly Authenticator $auth,
        private readonly MatchService $matches,
        private readonly CategoryRepository $categories,
        private readonly AnalyticsService $analytics,
    ) {
    }

    public function categories(Request $request): Response
    {
        return Response::json(array_map(fn (TeamCategory $c) => $c->toArray(), $this->categories->all()));
    }

    public function index(Request $request): Response
    {
        $category = isset($request->query['category']) ? (int) $request->query['category'] : null;
        return Response::json($this->matches->list($this->auth->user($request), $category ?: null));
    }

    public function show(Request $request): Response
    {
        return Response::json($this->matches->get($this->auth->user($request), $request->intParam('id')));
    }

    public function store(Request $request): Response
    {
        return Response::json($this->matches->create($this->auth->user($request), $request->json()), 201);
    }

    public function update(Request $request): Response
    {
        return Response::json($this->matches->update($this->auth->user($request), $request->intParam('id'), $request->json()));
    }

    public function destroy(Request $request): Response
    {
        $this->matches->delete($this->auth->user($request), $request->intParam('id'));
        return Response::noContent();
    }

    public function analytics(Request $request): Response
    {
        return Response::json($this->analytics->forMatch($this->auth->user($request), $request->intParam('id')));
    }
}
