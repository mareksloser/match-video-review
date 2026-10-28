<?php

declare(strict_types=1);

use Mvr\Controller\AuthController;
use Mvr\Controller\AuthLogController;
use Mvr\Controller\MarkerController;
use Mvr\Controller\MatchController;
use Mvr\Controller\RuleController;
use Mvr\Controller\UploadController;
use Mvr\Controller\UserController;
use Mvr\Http\Router;

return static fn (Router $r): Router => $r
    ->add('POST', '/auth/login', [AuthController::class, 'login'])
    ->add('GET', '/auth/me', [AuthController::class, 'me'])

    ->add('GET', '/categories', [MatchController::class, 'categories'])
    ->add('GET', '/matches', [MatchController::class, 'index'])
    ->add('POST', '/matches', [MatchController::class, 'store'])
    ->add('GET', '/matches/{id}', [MatchController::class, 'show'])
    ->add('PUT', '/matches/{id}', [MatchController::class, 'update'])
    ->add('DELETE', '/matches/{id}', [MatchController::class, 'destroy'])
    ->add('GET', '/matches/{id}/analytics', [MatchController::class, 'analytics'])

    ->add('GET', '/matches/{id}/markers', [MarkerController::class, 'index'])
    ->add('POST', '/matches/{id}/markers', [MarkerController::class, 'store'])
    ->add('PUT', '/markers/{id}', [MarkerController::class, 'update'])
    ->add('DELETE', '/markers/{id}', [MarkerController::class, 'destroy'])
    ->add('PUT', '/markers/{id}/drawing', [MarkerController::class, 'drawing'])
    ->add('PUT', '/markers/{id}/review', [MarkerController::class, 'review'])
    ->add('POST', '/markers/{id}/view', [MarkerController::class, 'view'])

    ->add('GET', '/rules', [RuleController::class, 'index'])
    ->add('POST', '/rules', [RuleController::class, 'store'])
    ->add('PUT', '/rules/{id}', [RuleController::class, 'update'])
    ->add('DELETE', '/rules/{id}', [RuleController::class, 'destroy'])

    ->add('POST', '/uploads', [UploadController::class, 'store'])

    ->add('GET', '/auth-log', [AuthLogController::class, 'index'])
    ->add('GET', '/users', [UserController::class, 'index'])
    ->add('POST', '/users', [UserController::class, 'store'])
    ->add('PUT', '/users/{id}', [UserController::class, 'update'])
    ->add('DELETE', '/users/{id}', [UserController::class, 'destroy']);
