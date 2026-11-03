<?php

declare(strict_types=1);

namespace Mvr\Auth;

use Mvr\Domain\AuthEvent;
use Mvr\Domain\Role;
use Mvr\Domain\User;
use Mvr\Http\HttpException;
use Mvr\Repository\CategoryRepository;
use Mvr\Repository\UserRepository;

/**
 * Keeps the local `users` table in sync with the club IdP. Local rows still exist because
 * markers, views and the auth log reference users.id.
 *
 * Lookup order: by `sub`; then by e-mail for accounts created before SSO (they get linked,
 * so their history stays); otherwise a new row. Name, e-mail, role and team always follow the IdP.
 */
final class UserProvisioner
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly CategoryRepository $categories,
        private readonly AuthLog $log,
    ) {
    }

    public function resolve(ClubIdentity $identity): User
    {
        if (!$identity->hasAccess()) {
            throw new \LogicException('Only identities with an MVR role are provisioned.');
        }
        $teamId = $identity->role === Role::Player && $identity->teamSlug !== null
            ? $this->categories->idBySlug($identity->teamSlug)
            : null;

        $user = $this->users->findBySub($identity->sub);
        if ($user !== null) {
            return $this->sync($user, $identity, $teamId);
        }

        $legacy = $this->users->findByEmail($identity->email);
        if ($legacy !== null) {
            if ($legacy->sub !== null) {
                throw HttpException::forbidden('Tento e-mail už v MVR patří jinému klubovému účtu. Ozvěte se správci.');
            }
            $this->users->updateFromIdentity($legacy->id, $identity, $teamId, false); // keep the local e-mail when linking
            $linked = $this->reload($legacy->id);
            $this->log->accountChange(AuthEvent::UserUpdated, $linked, $linked, self::trim('propojeno s klubovým účtem; ' . self::diff($legacy, $linked)), ClientInfo::none());

            return $linked;
        }

        $created = $this->reload($this->users->createFromIdentity($identity, $teamId));
        $this->log->accountChange(AuthEvent::UserCreated, $created, $created, 'z klubového účtu', ClientInfo::none());

        return $created;
    }

    private function sync(User $user, ClubIdentity $identity, ?int $teamId): User
    {
        $emailFree = $identity->email === $user->email || $this->users->findByEmail($identity->email) === null;
        $unchanged = $user->name === $identity->name
            && ($user->email === $identity->email || !$emailFree)
            && $user->role === $identity->role
            && $user->teamCategoryId === $teamId;
        if ($unchanged) {
            return $user;
        }

        $this->users->updateFromIdentity($user->id, $identity, $teamId, $emailFree);
        $updated = $this->reload($user->id);
        $this->log->accountChange(AuthEvent::UserUpdated, $updated, $updated, self::trim('z klubového účtu; ' . self::diff($user, $updated)), ClientInfo::none());

        return $updated;
    }

    private function reload(int $id): User
    {
        return $this->users->find($id) ?? throw new \LogicException("User $id missing after write");
    }

    /** Human-readable list of changed fields, e.g. "role: player → viewer". */
    private static function diff(User $before, User $after): string
    {
        $fields = [
            'jméno' => [$before->name, $after->name],
            'e-mail' => [$before->email, $after->email],
            'role' => [$before->role->value, $after->role->value],
            'tým' => [$before->teamCategoryId ?? '–', $after->teamCategoryId ?? '–'],
        ];
        $out = [];
        foreach ($fields as $label => [$old, $new]) {
            if ((string) $old !== (string) $new) {
                $out[] = "{$label}: {$old} → {$new}";
            }
        }

        return implode('; ', $out);
    }

    private static function trim(string $detail): string
    {
        return mb_substr(rtrim($detail, '; '), 0, 255);
    }
}
