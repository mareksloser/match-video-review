<?php

declare(strict_types=1);

namespace Mvr\Controller;

use Mvr\Auth\AccessPolicy;
use Mvr\Auth\Authenticator;
use Mvr\Domain\Rule;
use Mvr\Http\HttpException;
use Mvr\Http\Request;
use Mvr\Http\Response;
use Mvr\Repository\RuleRepository;

final class RuleController
{
    public function __construct(
        private readonly Authenticator $auth,
        private readonly RuleRepository $rules,
        private readonly AccessPolicy $policy,
    ) {
    }

    public function index(Request $request): Response
    {
        $this->policy->requireUser($this->auth->user($request));
        return Response::json(array_map(fn (Rule $r) => $r->toArray(), $this->rules->all()));
    }

    public function store(Request $request): Response
    {
        $this->policy->requireAdmin($this->auth->user($request));
        $rule = Rule::validated($request->json());
        $id = $this->rules->create($rule);
        return Response::json($rule->withId($id)->toArray(), 201);
    }

    public function update(Request $request): Response
    {
        $this->policy->requireAdmin($this->auth->user($request));
        $id = $request->intParam('id');
        if (!$this->rules->exists($id)) {
            throw HttpException::notFound('Zásada neexistuje.');
        }
        $rule = Rule::validated($request->json())->withId($id);
        $this->rules->update($rule);
        return Response::json($rule->toArray());
    }

    public function destroy(Request $request): Response
    {
        $this->policy->requireAdmin($this->auth->user($request));
        $this->rules->delete($request->intParam('id'));
        return Response::noContent();
    }
}
