import type { Marker, MarkerKind } from '@/lib/types';
import { markerKinds } from '@/lib/labels';
import { KindIcon } from './KindIcon';
import { cn } from '@/lib/cn';

interface Props {
  markers: Marker[];
  value: MarkerKind | null;
  onChange: (kind: MarkerKind | null) => void;
}

/** Chips with counts, only for kinds that occur in this match (e.g. "Pochvala 3"). */
export function KindFilter({ markers, value, onChange }: Props) {
  const present = markerKinds
    .map((k) => ({ ...k, count: markers.filter((m) => m.kind === k.value).length }))
    .filter((k) => k.count > 0);
  if (present.length < 2) return null;

  return (
    <div className="flex flex-wrap gap-1.5 border-b border-line px-3 py-2.5" role="group" aria-label="Filtr podle typu situace">
      {present.map((k) => {
        const active = value === k.value;
        return (
          <button
            key={k.value}
            onClick={() => onChange(active ? null : k.value)}
            aria-pressed={active}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors',
              active ? 'border-ink/40 bg-raised text-ink' : 'border-line text-muted hover:text-ink',
            )}
          >
            <span className="grid h-4 w-4 place-items-center rounded-full text-[#0b111b]" style={{ background: k.color }}>
              <KindIcon kind={k.value} className="h-2.5 w-2.5" />
            </span>
            {k.label}
            <span className="tabular text-muted">{k.count}</span>
          </button>
        );
      })}
    </div>
  );
}
