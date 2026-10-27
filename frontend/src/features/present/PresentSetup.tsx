import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, Check, Play } from 'lucide-react';
import type { Marker, MarkerKind } from '@/lib/types';
import { kindMeta, markerKinds } from '@/lib/labels';
import { formatTime } from '@/lib/time';
import { Button, Panel, Select } from '@/components/ui';
import { KindIcon } from '@/features/match/KindIcon';
import type { PresentationOptions } from './presentation';
import { cn } from '@/lib/cn';

interface Props {
  matchId: number;
  title: string;
  markers: Marker[];
  isAdmin: boolean;
  options: PresentationOptions;
  onOptionsChange: (o: PresentationOptions) => void;
  onStart: (selected: Marker[]) => void;
}

const keys: [string, string][] = [
  ['→  PageDown  Enter', 'další situace'],
  ['←  PageUp', 'předchozí situace'],
  ['Mezerník', 'pustit dál / pozastavit'],
  ['R', 'přehrát situaci znovu'],
  ['D', 'skrýt / ukázat kresbu'],
  ['I', 'skrýt / ukázat poznámky'],
  ['B', 'zatemnit obrazovku'],
  ['Esc', 'ukončit'],
];

export function PresentSetup({ matchId, title, markers, isAdmin, options, onOptionsChange, onStart }: Props) {
  // Coach: start with what hasn't been discussed yet (or everything, if all is done).
  const [selected, setSelected] = useState<Set<number>>(() => {
    const open = markers.filter((m) => !m.reviewed);
    return new Set((isAdmin && open.length ? open : markers).map((m) => m.id));
  });
  const kinds = markerKinds.filter((k) => markers.some((m) => m.kind === k.value));

  const toggle = (id: number) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const selectKind = (kind: MarkerKind) => setSelected(new Set(markers.filter((m) => m.kind === kind).map((m) => m.id)));
  const chosen = markers.filter((m) => selected.has(m.id));

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/match/$matchId" params={{ matchId: String(matchId) }} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Zpět na rozbor
      </Link>
      <h1 className="mt-2 font-display text-3xl font-semibold">Prezentace rozboru</h1>
      <p className="mt-1 text-muted">{title}</p>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Panel>
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
            <h2 className="mr-auto font-display text-lg font-semibold">
              Situace <span className="tabular text-muted">{chosen.length} z {markers.length}</span>
            </h2>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set(markers.map((m) => m.id)))}>Vše</Button>
            {isAdmin && (
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set(markers.filter((m) => !m.reviewed).map((m) => m.id)))}>
                Neprobrané
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Nic</Button>
          </div>
          {kinds.length > 1 && (
            <div className="flex flex-wrap gap-1.5 border-b border-line px-4 py-2.5">
              <span className="mr-1 self-center text-xs text-muted">Jen typ:</span>
              {kinds.map((k) => (
                <button
                  key={k.value}
                  onClick={() => selectKind(k.value)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs text-muted hover:text-ink"
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: k.color }} /> {k.label}
                </button>
              ))}
            </div>
          )}
          <ol className="max-h-[480px] overflow-y-auto p-2">
            {markers.map((m) => {
              const on = selected.has(m.id);
              const meta = kindMeta(m.kind);
              return (
                <li key={m.id}>
                  <label className={cn('relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-raised', !on && 'opacity-55')}>
                    <input type="checkbox" className="peer sr-only" checked={on} onChange={() => toggle(m.id)} />
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded border-2 border-line text-pitch-ink peer-checked:border-pitch peer-checked:bg-pitch peer-focus-visible:ring-2 peer-focus-visible:ring-pitch">
                      {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </span>
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[#0b111b]" style={{ background: meta.color }}>
                      <KindIcon kind={m.kind} />
                    </span>
                    <span className="tabular w-12 shrink-0 font-display font-semibold">{formatTime(m.timestampSeconds)}</span>
                    <span className="min-w-0 flex-1 truncate">{m.title}</span>
                    {isAdmin && m.reviewed && <span className="shrink-0 text-xs text-pitch">probráno</span>}
                  </label>
                </li>
              );
            })}
          </ol>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel className="grid gap-4 p-4">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Rozběh před situací</span>
              <Select value={options.leadSeconds} onChange={(e) => onOptionsChange({ ...options, leadSeconds: Number(e.target.value) })}>
                {[0, 3, 5, 8, 12].map((s) => (
                  <option key={s} value={s}>{s === 0 ? 'Žádný, rovnou zastavit' : `${s} sekund`}</option>
                ))}
              </Select>
              <span className="text-xs text-muted">Video se pustí kousek před situací a samo zastaví na markeru.</span>
            </label>
            <Option checked={options.showNotes} onChange={(v) => onOptionsChange({ ...options, showNotes: v })} label="Zobrazit poznámky" hint="Název, rozbor a zásada pod videem." />
            {isAdmin && (
              <Option
                checked={options.autoReview}
                onChange={(v) => onOptionsChange({ ...options, autoReview: v })}
                label="Označovat jako probrané"
                hint="Situace, u které video zastavilo a vy jste pokračovali dál, se zaškrtne."
              />
            )}
            <Button variant="primary" disabled={!chosen.length} onClick={() => onStart(chosen)}>
              <Play className="h-4 w-4 fill-current" /> Spustit prezentaci
            </Button>
          </Panel>
          <Panel className="p-4">
            <h3 className="text-sm font-medium">Ovládání</h3>
            <p className="mt-1 text-xs text-muted">Funguje i s běžným prezentačním klikerem.</p>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
              {keys.map(([k, d]) => (
                <div key={k} className="contents">
                  <dt><kbd className="rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-xs">{k}</kbd></dt>
                  <dd className="text-muted">{d}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Option({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm">
      <input type="checkbox" className="mt-1 h-4 w-4 accent-[rgb(var(--pitch))]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="font-medium">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
    </label>
  );
}
