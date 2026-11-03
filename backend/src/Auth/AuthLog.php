<?php

declare(strict_types=1);

namespace Mvr\Auth;

use Mvr\Domain\AuthEvent;
use Mvr\Domain\User;
use Mvr\Repository\AuthLogRepository;
use Mvr\Support\Clock;

/**
 * Writes the auth log: sign-ins and account changes synced from the club IdP.
 * Passwords are checked by the IdP, so failed logins and throttling live there now.
 */
final class AuthLog
{
    public function __construct(
        private readonly AuthLogRepository $log,
        private readonly Clock $clock,
        private readonly int $retentionDays = 180,
    ) {
    }

    public function loginSucceeded(User $user, ClientInfo $client): void
    {
        $this->record(AuthEvent::LoginSuccess, $user->id, $user->email, null, null, $client);
        // Keep personal data (IPs) only as long as needed.
        $this->log->pruneBefore($this->clock->now()->modify("-{$this->retentionDays} days"));
    }

    public function accountChange(AuthEvent $event, User $subject, User $actor, ?string $detail, ClientInfo $client): void
    {
        $this->record($event, $event === AuthEvent::UserDeleted ? null : $subject->id, $subject->email, $actor->id, $detail, $client);
    }

    private function record(AuthEvent $event, ?int $userId, ?string $email, ?int $actorId, ?string $detail, ClientInfo $client): void
    {
        $this->log->add($event, $userId, $email, $actorId, $detail, $client->ip, $client->userAgent, $this->clock->now());
    }
}
