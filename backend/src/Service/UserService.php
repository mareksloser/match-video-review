<?php

declare(strict_types=1);

namespace Mvr\Service;

use Mvr\Auth\AccessPolicy;
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
    ) {
    }

    /** @return list<User> */
    public function list(?User $viewer): array
    {
        $this->policy->requireAdmin($viewer);
        return $this->users->all();
    }

    /** @param array<string, mixed> $input */
    public function create(?User $viewer, array $input): User
    {
        $this->policy->requireAdmin($viewer);
        $data = UserData::fromArray($input, passwordRequired: true);
        $this->assertCategory($data);
        $this->assertEmailFree($data->email, null);

        $id = $this->users->create($data, password_hash((string) $data->password, PASSWORD_DEFAULT));
        return $this->users->find($id) ?? throw new \LogicException('User missing after insert');
    }

    /** @param array<string, mixed> $input */
    public function update(?User $viewer, int $id, array $input): User
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
        return $this->users->find($id) ?? throw new \LogicException('User missing after update');
    }

    public function delete(?User $viewer, int $id): void
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
