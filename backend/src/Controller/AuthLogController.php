<?php

declare(strict_types=1);

namespace Mvr\Controller;

use Mvr\Auth\AccessPolicy;
use Mvr\Auth\Authenticator;
use Mvr\Domain\AuthEvent;
use Mvr\Http\Request;
use Mvr\Http\Response;
use Mvr\Repository\AuthLogRepository;
use Mvr\Support\Clock;

/** GET /auth-log — coach only. ?type=logins|failed|blocked|accounts, ?q=, ?before=<id> for paging. */
final class AuthLogController
{
    private const PAGE = 50;

    private const TYPES = [
        'logins' => [AuthEvent::LoginSuccess],
        'failed' => [AuthEvent::LoginFailed, AuthEvent::LoginBlocked],
        'blocked' => [AuthEvent::LoginBlocked],
        'accounts' => [AuthEvent::UserCreated, AuthEvent::UserUpdated, AuthEvent::PasswordChanged, AuthEvent::UserDeleted],
    ];

    public function __construct(
        private readonly Authenticator $auth,
        private readonly AccessPolicy $policy,
        private readonly AuthLogRepository $log,
        private readonly Clock $clock,
    ) {
    }

    public function index(Request $request): Response
    {
        $this->policy->requireAdmin($this->auth->user($request));
        $events = self::TYPES[$request->query['type'] ?? ''] ?? [];
        $before = isset($request->query['before']) ? (int) $request->query['before'] : null;
        $q = trim((string) ($request->query['q'] ?? ''));

        $items = $this->log->list($events, $q !== '' ? $q : null, $before, self::PAGE + 1);
        $more = count($items) > self::PAGE;
        $items = array_slice($items, 0, self::PAGE);

        $day = $this->clock->now()->modify('-24 hours');
        $counts = $this->log->countsSince($day);

        return Response::json([
            'items' => $items,
            'nextBefore' => $more ? $items[array_key_last($items)]['id'] : null,
            'summary' => [
                'success24h' => $counts[AuthEvent::LoginSuccess->value] ?? 0,
                'failed24h' => $counts[AuthEvent::LoginFailed->value] ?? 0,
                'blocked24h' => $counts[AuthEvent::LoginBlocked->value] ?? 0,
                'failedIps24h' => $this->log->distinctFailedIpsSince($day),
            ],
        ]);
    }
}
