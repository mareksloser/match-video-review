import { useMemo, useState } from 'react';
import { ExternalLink, ScrollText, Search } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useAccountAdminUrl, useCategories, useMe, useUsers } from '@/app/queries';
import { Badge, Button, ErrorNote, Input, Panel, Select, Spinner } from '@/components/ui';
import { roleLabels } from '@/lib/labels';
import { formatDateTime, formatRelative } from '@/lib/datetime';
import type { Role, User } from '@/lib/types';

const roleTone: Record<Role, string> = {
  admin: 'bg-pitch/15 text-pitch',
  viewer: 'bg-[#4aa8ff]/15 text-[#4aa8ff]',
  player: 'bg-raised text-muted',
};

/**
 * Read-only overview: accounts, roles and teams are managed in the club IdP and synced
 * into MVR on each sign-in. The list shows who has used MVR and when.
 */
export function UsersPage() {
  const { data: me } = useMe();
  const users = useUsers();
  const categories = useCategories();
  const adminUrl = useAccountAdminUrl().data;
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (users.data ?? []).filter(
      (u) => (!roleFilter || u.role === roleFilter) && (!q || u.name.toLowerCase().includes(q) || u.email.includes(q)),
    );
  }, [users.data, query, roleFilter]);

  if (me?.role !== 'admin') return <p className="text-muted">Přehled uživatelů vidí trenér.</p>;

  const teamName = (u: User) => (u.role === 'player' ? categories.data?.find((c) => c.id === u.teamCategoryId)?.name ?? '–' : 'Všechny');

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Uživatelé</h1>
          <p className="mt-1 text-muted">Kdo z klubu MVR používá. Účty, role a týmy se spravují v klubovém účtu.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/users/log">
            <Button>
              <ScrollText className="h-4 w-4" /> Log přihlášení
            </Button>
          </Link>
          {adminUrl && (
            <a href={adminUrl} target="_blank" rel="noreferrer">
              <Button variant="primary">
                <ExternalLink className="h-4 w-4" /> Spravovat účty
              </Button>
            </a>
          )}
        </div>
      </div>

      <Panel className="mt-5 p-4 text-sm text-muted">
        Nového hráče přidáte v klubovém účtu: založte mu účet a v aplikaci <b>mvr-web</b> přidělte roli{' '}
        <code>player</code> s jeho týmem (trenér <code>coach</code>, náhled <code>viewer</code>). V MVR se objeví
        po svém prvním přihlášení, změny rolí se projeví při dalším.
      </Panel>

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Hledat jméno nebo e-mail" aria-label="Hledat uživatele" className="pl-9" />
        </div>
        <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as Role | '')} aria-label="Filtr podle role" className="w-auto">
          <option value="">Všechny role</option>
          {(Object.keys(roleLabels) as Role[]).map((r) => (
            <option key={r} value={r}>{roleLabels[r]}</option>
          ))}
        </Select>
      </div>

      {users.isLoading && <div className="mt-6"><Spinner /></div>}
      {users.error && <div className="mt-6"><ErrorNote error={users.error} /></div>}

      {users.data && (
        <Panel className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="px-4 py-3 font-medium">Jméno</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Tým</th>
                <th className="px-4 py-3 font-medium">Poslední přihlášení</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5 font-medium">
                    {u.name} {u.id === me.id && <span className="ml-1 text-xs font-normal text-muted">(vy)</span>}
                  </td>
                  <td className="px-4 py-2.5 text-muted">{u.email}</td>
                  <td className="px-4 py-2.5"><Badge className={roleTone[u.role]}>{roleLabels[u.role]}</Badge></td>
                  <td className="px-4 py-2.5">{teamName(u)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted" title={u.lastLoginAt ? formatDateTime(u.lastLoginAt) : undefined}>
                    {u.lastLoginAt ? formatRelative(u.lastLoginAt) : 'nikdy'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="p-4 text-muted">Žádný uživatel neodpovídá filtru.</p>}
        </Panel>
      )}
    </div>
  );
}
