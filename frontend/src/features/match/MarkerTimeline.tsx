import type { Marker } from '@/lib/types';
import { kindMeta } from '@/lib/labels';
import { formatTime } from '@/lib/time';
import { KindIcon } from './KindIcon';
import { cn } from '@/lib/cn';

interface Props {
  markers: Marker[];
  duration: number;
  currentTime: number;
  selectedId: number | null;
  onSelect: (m: Marker) => void;
  onSeek: (t: number) => void;
}

/** Event strip under the video: one pin per marker, five-minute grid, playhead. */
export function MarkerTimeline({ markers, duration, currentTime, selectedId, onSelect, onSeek }: Props) {
  if (!duration) return null;
  const pct = (t: number) => `${Math.min(100, (t / duration) * 100)}%`;
  const grid = Array.from({ length: Math.floor(duration / 300) + 1 }, (_, i) => i * 300);

  return (
    <div className="rounded-b-xl border-t border-white/5 bg-[rgb(var(--chalk))] px-4 pb-3 pt-9 text-white">
      <div
        className="relative h-7 cursor-pointer rounded bg-white/[0.06]"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          onSeek(((e.clientX - r.left) / r.width) * duration);
        }}
      >
        {grid.map((t) => (
          <div key={t} className="absolute top-0 h-full border-l border-white/10" style={{ left: pct(t) }}>
            {t % 900 === 0 && (
              <span className="absolute -bottom-5 -translate-x-1/2 font-display text-xs text-white/45">{t / 60}′</span>
            )}
          </div>
        ))}
        <div className="absolute inset-y-0 left-0 rounded-l bg-[rgb(var(--pitch))]/20" style={{ width: pct(currentTime) }} />
        <div className="absolute -top-1 bottom-[-4px] w-0.5 bg-white" style={{ left: pct(currentTime) }} aria-hidden="true" />
        {markers.map((m) => {
          const meta = kindMeta(m.kind);
          const selected = m.id === selectedId;
          return (
            <button
              key={m.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(m);
              }}
              className="group absolute top-0 h-full w-4 -translate-x-1/2 focus-visible:outline-none"
              style={{ left: pct(m.timestampSeconds) }}
              aria-label={`${formatTime(m.timestampSeconds)} ${m.title}`}
            >
              <span className="absolute left-1/2 top-0 h-full w-[3px] -translate-x-1/2 rounded" style={{ background: meta.color }} />
              <span
                className={cn(
                  'absolute -top-8 left-1/2 grid h-6 w-6 -translate-x-1/2 place-items-center rounded-full border text-[#0b111b] transition-transform group-hover:scale-110 group-focus-visible:ring-2 group-focus-visible:ring-white',
                  selected ? 'scale-110 border-white' : 'border-transparent',
                )}
                style={{ background: meta.color }}
              >
                <KindIcon kind={m.kind} />
              </span>
              <span className="pointer-events-none absolute -top-16 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-black/85 px-2 py-1 text-xs group-hover:block">
                {formatTime(m.timestampSeconds)} {m.title}
              </span>
            </button>
          );
        })}
      </div>
      <div className="h-4" />
    </div>
  );
}
