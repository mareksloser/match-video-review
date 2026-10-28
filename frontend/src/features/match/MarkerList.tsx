import { Check } from 'lucide-react';
import type { Marker, Rule } from '@/lib/types';
import { kindMeta } from '@/lib/labels';
import { formatTime } from '@/lib/time';
import { KindIcon } from './KindIcon';
import { cn } from '@/lib/cn';

interface Props {
  markers: Marker[];
  rules: Rule[];
  selectedId: number | null;
  activeId: number | null;
  isAdmin: boolean;
  /** "Nové" / viewed tick — only for players, whose views are recorded. */
  showViews: boolean;
  onSelect: (m: Marker) => void;
  onReviewedChange: (m: Marker, reviewed: boolean) => void;
}

export function MarkerList({ markers, rules, selectedId, activeId, isAdmin, showViews, onSelect, onReviewedChange }: Props) {
  if (!markers.length)
    return (
      <p className="px-4 py-6 text-sm text-muted">
        {isAdmin ? 'Zatím žádné markery. Zastavte video u situace a přidejte první.' : 'K tomuto zápasu trenér zatím nepřidal žádné situace.'}
      </p>
    );

  return (
    <ol className="flex flex-col gap-2 p-3">
      {markers.map((m) => {
        const meta = kindMeta(m.kind);
        const rule = rules.find((r) => r.id === m.ruleId);
        const selected = m.id === selectedId;
        return (
          <li key={m.id}>
            <div
              className={cn(
                'flex items-start gap-3 rounded-lg border p-3 transition-colors',
                selected ? 'border-pitch bg-pitch/10' : 'border-line bg-raised/40 hover:border-muted/50',
              )}
            >
              <button onClick={() => onSelect(m)} className="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline-none">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[#0b111b]" style={{ background: meta.color }}>
                  <KindIcon kind={m.kind} />
                </span>
                <span className="block min-w-0 flex-1">
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className={cn('tabular font-display text-base font-semibold', m.id === activeId && 'text-pitch')}>
                      {formatTime(m.timestampSeconds)}
                    </span>
                    <span className="truncate font-medium">{m.title}</span>
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    <span>{meta.label}</span>
                    {rule && <span>Zásada {rule.code}</span>}
                    {m.drawing && <span>Kresba</span>}
                    {!isAdmin && m.reviewed && <span className="text-pitch">Probráno na rozboru</span>}
                    {showViews && !m.viewedByMe && <span className="font-medium text-ink">Nové</span>}
                  </span>
                </span>
              </button>
              {isAdmin ? (
                <label className="relative flex shrink-0 cursor-pointer items-center" title="Probráno s týmem na rozboru">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={m.reviewed}
                    onChange={(e) => onReviewedChange(m, e.target.checked)}
                    aria-label={`Probráno s týmem: ${m.title}`}
                  />
                  <span className="grid h-6 w-6 place-items-center rounded-md border-2 border-line text-pitch-ink transition-colors peer-checked:border-pitch peer-checked:bg-pitch peer-focus-visible:ring-2 peer-focus-visible:ring-pitch">
                    {m.reviewed && <Check className="h-4 w-4" strokeWidth={3} />}
                  </span>
                </label>
              ) : (
                showViews && m.viewedByMe && (
                  <span className="mt-1 shrink-0 text-muted" title="Zhlédnuto">
                    <Check className="h-4 w-4" />
                  </span>
                )
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
