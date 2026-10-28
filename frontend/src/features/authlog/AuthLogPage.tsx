import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, Search } from 'lucide-react';
import { useAuthLog, useMe } from '@/app/queries';
import { Badge, Button, ErrorNote, Input, Panel, Spinner } from '@/components/ui';
import type { AuthLogEntry, AuthLogEvent, AuthLogFilter } from '@/lib/types';
import { formatDateTime, formatRelative } from '@/lib/datetime';
import { describeUserAgent } from './userAgent';
import { cn } from '@/lib/cn';

const eventMeta: Record<AuthLogEvent, { label: string; tone: string }> = {
  login_success: { label: 'Přihlášení', tone: 'bg-pitch/15 text-pitch' },
  login_failed: { label: 'Neúspěšné', tone: 'bg-card-red/15 text-card-red' },
  login_blocked: { label: 'Zablokováno', tone: 'bg-card-yellow/20 text-card-yellow' },
  user_created: { label: 'Nový účet', tone: 'bg-[#4aa8ff]/15 text-[#4aa8ff]' },
  user_updated: { label: 'Úprava účtu', tone: 'bg-[#4aa8ff]/15 text-[#4aa8ff]' },
  password_changed: { label: 'Změna hesla', tone: 'bg-[#4aa8ff]/15 text-[#4aa8ff]' },
  user_deleted: { label: 'Smazaný účet', tone: 'bg-raised text-muted' },
};

const filters: { value: AuthLogFilter; label: string }[] = [
  { value: '', label: 'Vše' },
  { value: 'logins', label: 'Přihlášení' },
  { value: 'failed', label: 'Neúspěšná' },
  { value: 'blocked', label: 'Zablokovaná' },
  { value: 'accounts', label: 'Změny účtů' },
];

export function AuthLogPage() {
  const { data: me } = useMe();
  const [type, setType] = useState<AuthLogFilter>('');
  const [input, setInput] = useState('');
  const [q, setQ] = useState('');
  const log = useAuthLog(type, q);

  if (me?.role !== 'admin') return <p className="text-muted">Log přihlášení vidí jen trenér.</p>;

  const summary = log.data?.pages[0]?.summary;
  const items = log.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <Link to="/users" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Uživatelé
      </Link>
      <h1 className="mt-2 font-display text-3xl font-semibold">Log přihlášení</h1>
      <p className="mt-1 max-w-prose text-muted">
        Přihlášení, neúspěšné pokusy a změny účtů. Záznamy se po čase samy mažou, protože obsahují IP adresy.
      </p>

      {summary && (
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Přihlášení za 24 h" value={summary.success24h} />
          <Stat label="Neúspěšné pokusy za 24 h" value={summary.failed24h} alert={summary.failed24h >= 10} />
          <Stat label="Zablokované pokusy za 24 h" value={summary.blocked24h} alert={summary.blocked24h > 0} />
          <Stat label="IP s neúspěchem za 24 h" value={summary.failedIps24h} />
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Typ záznamu">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setType(f.value)}
              aria-pressed={type === f.value}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm transition-colors',
                type === f.value ? 'border-pitch bg-pitch/15 text-ink' : 'border-line text-muted hover:text-ink',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <form
          className="relative ml-auto min-w-[240px] flex-1 md:max-w-xs"
          onSubmit={(e) => {
            e.preventDefault();
            setQ(input);
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <Input value={input} onChange={(e) => setInput(e.target.value)} onBlur={() => setQ(input)} placeholder="E-mail, jméno nebo IP" aria-label="Hledat v logu" className="pl-9" />
        </form>
      </div>

      {log.isLoading && <div className="mt-6"><Spinner /></div>}
      {log.error && <div className="mt-6"><ErrorNote error={log.error} /></div>}

      {log.data && (
        <Panel className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="px-4 py-3 font-medium">Kdy</th>
                <th className="px-4 py-3 font-medium">Událost</th>
                <th className="px-4 py-3 font-medium">Účet</th>
                <th className="px-4 py-3 font-medium">Podrobnosti</th>
                <th className="px-4 py-3 font-medium">IP</th>
                <th className="px-4 py-3 font-medium">Zařízení</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <Row key={e.id} entry={e} onSearch={(v) => (setInput(v), setQ(v))} />
              ))}
            </tbody>
          </table>
          {items.length === 0 && <p className="p-4 text-muted">Žádné záznamy.</p>}
        </Panel>
      )}

      {log.hasNextPage && (
        <div className="mt-4 flex justify-center">
          <Button onClick={() => log.fetchNextPage()} disabled={log.isFetchingNextPage}>
            {log.isFetchingNextPage ? 'Načítám…' : 'Načíst starší'}
          </Button>
        </div>
      )}
    </div>
  );
}

function Row({ entry: e, onSearch }: { entry: AuthLogEntry; onSearch: (v: string) => void }) {
  const meta = eventMeta[e.event] ?? { label: e.event, tone: 'bg-raised text-muted' };
  return (
    <tr className={cn('border-b border-line align-top last:border-0', e.event !== 'login_success' && e.event.startsWith('login') && 'bg-card-red/[0.04]')}>
      <td className="whitespace-nowrap px-4 py-2.5" title={formatDateTime(e.createdAt)}>{formatRelative(e.createdAt)}</td>
      <td className="px-4 py-2.5"><Badge className={meta.tone}>{meta.label}</Badge></td>
      <td className="px-4 py-2.5">
        {e.userName && <span className="block font-medium">{e.userName}</span>}
        <span className={cn('block', e.userName ? 'text-xs text-muted' : '')}>{e.email ?? '–'}</span>
      </td>
      <td className="px-4 py-2.5 text-muted">
        {e.detail}
        {e.actorName && <span className="block text-xs">provedl(a) {e.actorName}</span>}
      </td>
      <td className="whitespace-nowrap px-4 py-2.5">
        {e.ip ? (
          <button className="font-mono text-xs hover:text-pitch hover:underline" onClick={() => onSearch(e.ip!)} title="Zobrazit vše z této IP">
            {e.ip}
          </button>
        ) : '–'}
      </td>
      <td className="whitespace-nowrap px-4 py-2.5 text-muted" title={e.userAgent ?? undefined}>{describeUserAgent(e.userAgent)}</td>
    </tr>
  );
}

function Stat({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) {
  return (
    <Panel className={cn('p-4', alert && 'border-card-red/50')}>
      <p className="text-xs text-muted">{label}</p>
      <p className={cn('tabular mt-1 font-display text-3xl font-semibold', alert && 'text-card-red')}>{value}</p>
    </Panel>
  );
}
