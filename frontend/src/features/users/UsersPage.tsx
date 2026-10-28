import { useMemo, useState } from 'react';
import { Copy, Pencil, Plus, ScrollText, Search, Trash2 } from 'lucide-react';
import { useCategories, useMe, useUserMutations, useUsers } from '@/app/queries';
import { Badge, Button, ErrorNote, Input, Panel, Select, Spinner } from '@/components/ui';
import { roleLabels } from '@/lib/labels';
import { formatDateTime, formatRelative } from '@/lib/datetime';
import { Link } from '@tanstack/react-router';
import type { Role, User, UserInput } from '@/lib/types';
import { UserForm } from './UserForm';
import { cn } from '@/lib/cn';

type Mode = { kind: 'list' } | { kind: 'create' } | { kind: 'edit'; user: User };
type Credentials = { email: string; password: string; created: boolean };

const roleTone: Record<Role, string> = {
  admin: 'bg-pitch/15 text-pitch',
  viewer: 'bg-[#4aa8ff]/15 text-[#4aa8ff]',
  player: 'bg-raised text-muted',
};

export function UsersPage() {
  const { data: me } = useMe();
  const users = useUsers();
  const categories = useCategories();
  const { create, update, remove } = useUserMutations();
  const [mode, setMode] = useState<Mode>({ kind: 'list' });
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (users.data ?? []).filter(
      (u) => (!roleFilter || u.role === roleFilter) && (!q || u.name.toLowerCase().includes(q) || u.email.includes(q)),
    );
  }, [users.data, query, roleFilter]);

  if (me?.role !== 'admin') return <p className="text-muted">Uživatele spravuje trenér.</p>;

  const teamName = (u: User) => (u.role === 'player' ? categories.data?.find((c) => c.id === u.teamCategoryId)?.name ?? '–' : 'Všechny');
  const close = () => setMode({ kind: 'list' });
  const afterSave = (input: UserInput, created: boolean) => {
    // Show the credentials once so the coach can pass them on (only when a password was set).
    setCredentials(input.password ? { email: input.email.toLowerCase(), password: input.password, created } : null);
    close();
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Uživatelé</h1>
          <p className="mt-1 text-muted">Účty hráčů, trenérů a náhledové účty.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/users/log">
            <Button>
              <ScrollText className="h-4 w-4" /> Log přihlášení
            </Button>
          </Link>
          {mode.kind === 'list' && (
            <Button
              variant="primary"
              onClick={() => {
                setCredentials(null);
                setMode({ kind: 'create' });
              }}
            >
              <Plus className="h-4 w-4" /> Přidat uživatele
            </Button>
          )}
        </div>
      </div>

      {credentials && <CredentialsNote credentials={credentials} onClose={() => setCredentials(null)} />}

      {mode.kind !== 'list' && (
        <Panel className="mt-5 p-5">
          <h2 className="mb-4 font-display text-xl font-semibold">
            {mode.kind === 'create' ? 'Nový uživatel' : `Upravit: ${mode.user.name}`}
          </h2>
          <UserForm
            key={mode.kind === 'edit' ? mode.user.id : 'new'}
            initial={mode.kind === 'edit' ? mode.user : null}
            isSelf={mode.kind === 'edit' && mode.user.id === me.id}
            submitLabel={mode.kind === 'create' ? 'Vytvořit účet' : 'Uložit změny'}
            pending={create.isPending || update.isPending}
            error={mode.kind === 'create' ? create.error : update.error}
            onCancel={close}
            onSubmit={(input) =>
              mode.kind === 'create'
                ? create.mutate(input, { onSuccess: () => afterSave(input, true) })
                : update.mutate({ id: mode.user.id, input }, { onSuccess: () => afterSave(input, false) })
            }
          />
        </Panel>
      )}

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
      {remove.error ? <div className="mt-4"><ErrorNote error={remove.error} /></div> : null}

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
                <th className="px-4 py-3"><span className="sr-only">Akce</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const self = u.id === me.id;
                return (
                  <tr key={u.id} className={cn('border-b border-line last:border-0', confirmId === u.id && 'bg-card-red/5')}>
                    <td className="px-4 py-2.5 font-medium">
                      {u.name} {self && <span className="ml-1 text-xs font-normal text-muted">(vy)</span>}
                    </td>
                    <td className="px-4 py-2.5 text-muted">{u.email}</td>
                    <td className="px-4 py-2.5"><Badge className={roleTone[u.role]}>{roleLabels[u.role]}</Badge></td>
                    <td className="px-4 py-2.5">{teamName(u)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted" title={u.lastLoginAt ? formatDateTime(u.lastLoginAt) : undefined}>
                      {u.lastLoginAt ? formatRelative(u.lastLoginAt) : 'nikdy'}
                    </td>
                    <td className="px-4 py-2.5">
                      {confirmId === u.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="hidden text-xs text-muted md:inline">Markery zůstanou, historie zhlédnutí se smaže.</span>
                          <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>Ponechat</Button>
                          <Button size="sm" variant="danger" disabled={remove.isPending} onClick={() => remove.mutate(u.id, { onSuccess: () => setConfirmId(null) })}>
                            Opravdu smazat
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Upravit ${u.name}`}
                            title="Upravit"
                            onClick={() => {
                              setCredentials(null);
                              setMode({ kind: 'edit', user: u });
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Smazat ${u.name}`}
                            title={self ? 'Vlastní účet smazat nemůžete' : 'Smazat'}
                            disabled={self}
                            onClick={() => setConfirmId(u.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="p-4 text-muted">Žádný uživatel neodpovídá filtru.</p>}
        </Panel>
      )}
    </div>
  );
}

function CredentialsNote({ credentials, onClose }: { credentials: Credentials; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const text = `E-mail: ${credentials.email}\nHeslo: ${credentials.password}`;
  return (
    <div className="mt-5 rounded-xl border border-pitch/50 bg-pitch/10 p-4 text-sm" role="status">
      <p className="font-medium">
        {credentials.created ? 'Účet je vytvořený.' : 'Heslo je změněné.'} Předejte přihlašovací údaje, později už heslo neuvidíte.
      </p>
      <pre className="mt-2 rounded-md bg-panel px-3 py-2 font-mono text-[0.9rem]">{text}</pre>
      <div className="mt-2 flex gap-2">
        <Button
          size="sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          <Copy className="h-4 w-4" /> {copied ? 'Zkopírováno' : 'Kopírovat'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>Zavřít</Button>
      </div>
    </div>
  );
}
