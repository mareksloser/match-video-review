<?php

declare(strict_types=1);

namespace Mvr\Controller;

use Mvr\Auth\Authenticator;
use Mvr\Http\Request;
use Mvr\Http\Response;
use Mvr\Service\VideoUploadService;

final class UploadController
{
    public function __construct(
        private readonly Authenticator $auth,
        private readonly VideoUploadService $uploads,
    ) {
    }

    public function store(Request $request): Response
    {
        return Response::json($this->uploads->upload($this->auth->user($request), $request->files['video'] ?? []), 201);
    }
}
