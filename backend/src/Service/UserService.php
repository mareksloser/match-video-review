<?php

declare(strict_types=1);

namespace Mvr\Service;

use Mvr\Auth\AccessPolicy;
use Mvr\Auth\AuthLog;
use Mvr\Auth\ClientInfo;
use Mvr\Domain\AuthEvent;
use Mvr\Domain\Role;
use Mvr\Domain\User;
use Mvr\Domain\UserData;
use Mvr\Http\HttpException;
use Mvr\Repository\CategoryRepository;
use Mvr\Repository\UserRepository;

/**
 * User administration (admin only). Guards against locking the club out:
 * nobody can delete or demote themselves, and the last admin always stays.
 */
final class UserService
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly CategoryRepository $categories,
        private readonly AccessPolicy $policy,
        private readonly AuthLog $log,
    ) {
    }

    /** @return list<User> */
    public function list(?User $viewer): array
    {
        $this->policy->requireAdmin($viewer);
        return $this->users->all();
    }

    /** @param array<string, mixed> $input */
    public function create(?User $viewer, array $input, ClientInfo $client = new ClientInfo('', '')): User
    {
        $admin = $this->policy->requireAdmin($viewer);
        $data = UserData::fromArray($input, passwordRequired: true);
        $this->assertCategory($data);
        $this->assertEmailFree($data->email, null);

        $id = $this->users->create($data, password_hash((string) $data->password, PASSWORD_DEFAULT));
        $user = $this->users->find($id) ?? throw new \LogicException('User missing after insert');
        $this->log->accountChange(AuthEvent::UserCreated, $user, $admin, self::describe($user), $client);
        return $user;
    }

    /** @param array<string, mixed> $input */
    public function update(?User $viewer, int $id, array $input, ClientInfo $client = new ClientInfo('', '')): User
    {
        $admin = $this->policy->requireAdmin($viewer);
        $existing = $this->users->find($id) ?? throw HttpException::notFound('Uživatel neexistuje.');
        $data = UserData::fromArray($input, passwordRequired: false);
        $this->assertCategory($data);
        $this->assertEmailFree($data->email, $id);

        if ($existing->isAdmin() && $data->role !== Role::Admin) {
            if ($existing->id === $admin->id) {
                throw HttpException::validation(['role' => 'Sami sobě roli trenéra odebrat nemůžete.']);
            }
            if ($this->users->countAdmins() <= 1) {
                throw HttpException::validation(['role' => 'Musí zůstat alespoň jeden trenér.']);
            }
        }

        $hash = $data->password !== null ? password_hash($data->password, PASSWORD_DEFAULT) : null;
        $this->users->update($id, $data, $hash);
        $updated = $this->users->find($id) ?? throw new \LogicException('User missing after update');

        $changes = self::diff($existing, $updated);
        if ($changes !== '') {
            $this->log->accountChange(AuthEvent::UserUpdated, $updated, $admin, $changes, $client);
        }
        if ($hash !== null) {
            $this->log->accountChange(AuthEvent::PasswordChanged, $updated, $admin, null, $client);
        }
        return $updated;
    }

    public function delete(?User $viewer, int $id, ClientInfo $client = new ClientInfo('', '')): void
    {
        $admin = $this->policy->requireAdmin($viewer);
        $existing = $this->users->find($id) ?? throw HttpException::notFound('Uživatel neexistuje.');
        if ($existing->id === $admin->id) {
            throw HttpException::forbidden('Vlastní účet smazat nemůžete.');
        }
        if ($existing->isAdmin() && $this->users->countAdmins() <= 1) {
            throw HttpException::forbidden('Musí zůstat alespoň jeden trenér.');
        }
        // Markers keep existing (created_by → NULL), the user's view history is removed (FK cascade).
        $this->users->delete($id);
        $this->log->accountChange(AuthEvent::UserDeleted, $existing, $admin, self::describe($existing), $client);
    }

    private static function describe(User $u): string
    {
        return "{$u->name}, " . self::roleLabel($u->role) . ($u->teamCategoryId !== null ? ", tým #{$u->teamCategoryId}" : '');
    }

    private static function roleLabel(Role $role): string
    {
        return match ($role) {
            Role::Admin => 'trenér',
            Role::Player => 'hráč',
            Role::Viewer => 'náhled',
        };
    }

    /** Human-readable list of changed fields, e.g. "role: player → viewer; e-mail: a@b → c@d". */
    private static function diff(User $before, User $after): string
    {
        $fields = [
            'jméno' => [$before->name, $after->name],
            'e-mail' => [$before->email, $after->email],
            'role' => [self::roleLabel($before->role), self::roleLabel($after->role)],
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

    private function assertCategory(UserData $data): void
    {
        if ($data->teamCategoryId !== null && !$this->categories->exists($data->teamCategoryId)) {
            throw HttpException::validation(['teamCategoryId' => 'Tým neexistuje.']);
        }
    }

    private function assertEmailFree(string $email, ?int $exceptId): void
    {
        $other = $this->users->findByEmail($email);
        if ($other !== null && $other->id !== $exceptId) {
            throw HttpException::validation(['email' => 'Tento e-mail už používá jiný účet.']);
        }
    }
}
