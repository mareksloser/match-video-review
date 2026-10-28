<?php

declare(strict_types=1);

namespace Mvr\Auth;

use Mvr\Domain\AuthEvent;
use Mvr\Domain\User;
use Mvr\Http\HttpException;
use Mvr\Repository\AuthLogRepository;
use Mvr\Support\Clock;

/**
 * Writes the auth log and enforces login throttling from it.
 *
 * Throttling is per IP (never per account): after $maxFailures failed logins within
 * $windowMinutes the IP is refused until the window passes. A successful login from the
 * IP resets the count, so a team sharing one Wi-Fi isn't punished for one typo.
 */
final class AuthLog
{
    public function __construct(
        private readonly AuthLogRepository $log,
        private readonly Clock $clock,
        private readonly int $maxFailures = 10,
        private readonly int $windowMinutes = 15,
        private readonly int $retentionDays = 180,
    ) {
    }

    public function assertNotThrottled(string $email, ClientInfo $client): void
    {
        if ($client->ip === '' || $this->maxFailures <= 0) {
            return;
        }
        $since = $this->clock->now()->modify("-{$this->windowMinutes} minutes");
        $lastSuccess = $this->log->lastSince($client->ip, AuthEvent::LoginSuccess, $since);
        $failures = $this->log->countSince($client->ip, AuthEvent::LoginFailed, $lastSuccess ?? $since);
        if ($failures >= $this->maxFailures) {
            $this->record(AuthEvent::LoginBlocked, null, $email, null, "{$failures} neúspěšných pokusů", $client);
            throw new HttpException("Příliš mnoho neúspěšných pokusů. Zkuste to znovu za {$this->windowMinutes} minut.", 429);
        }
    }

    public function loginFailed(string $email, ?User $user, string $reason, ClientInfo $client): void
    {
        $this->record(AuthEvent::LoginFailed, $user?->id, $email, null, $reason, $client);
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
