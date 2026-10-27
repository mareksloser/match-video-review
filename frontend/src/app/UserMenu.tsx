import { useNavigate } from '@tanstack/react-router';
import { ChevronDown, LogOut, Users } from 'lucide-react';
import type { User } from '@/lib/types';
import { roleLabels } from '@/lib/labels';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLogout } from './queries';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');

export function UserMenu({ user }: { user: User }) {
  const logout = useLogout();
  const navigate = useNavigate();
  const role = roleLabels[user.role];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-3 rounded-lg py-1 pl-2 pr-1.5 text-left hover:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-pitch data-[state=open]:bg-raised"
        aria-label={`Uživatelské menu: ${user.name}`}
      >
        <span className="hidden leading-tight sm:block">
          <span className="block text-sm font-medium">{user.name}</span>
          <span className="block text-right text-xs text-muted">{role}</span>
        </span>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-raised font-display text-base font-semibold ring-1 ring-line">
          {initials(user.name)}
        </span>
        <ChevronDown className="h-4 w-4 text-muted" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="block text-sm font-medium">{user.name}</span>
          <span className="block truncate text-xs font-normal text-muted">{user.email}</span>
          <span className="mt-1 inline-block rounded bg-raised px-1.5 py-0.5 text-xs font-normal text-muted">{role}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {user.role === 'admin' && (
          <>
            <DropdownMenuItem onSelect={() => navigate({ to: '/users' })}>
              <Users className="h-4 w-4 text-muted" /> Uživatelé
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          disabled={logout.isPending}
          onSelect={() => logout.mutate(undefined, { onSuccess: () => navigate({ to: '/' }) })}
        >
          <LogOut className="h-4 w-4 text-muted" /> Odhlásit se
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
