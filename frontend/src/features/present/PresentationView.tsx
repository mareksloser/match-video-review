import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, X } from 'lucide-react';
import type { Marker, Rule } from '@/lib/types';
import { useVideoEngine, useEngineMount } from '@/video/usePlayback';
import { DrawingOverlay } from '@/features/match/DrawingOverlay';
import { KindIcon } from '@/features/match/KindIcon';
import { kindMeta } from '@/lib/labels';
import { formatTime } from '@/lib/time';
import { cn } from '@/lib/cn';
import type { PresentationOptions } from './presentation';
import { usePresentation } from './usePresentation';

interface Props {
  videoType: string;
  videoUrl: string;
  title: string;
  markers: Marker[];
  rules: Rule[];
  options: PresentationOptions;
  onDiscussed: (marker: Marker) => void;
  onExit: () => void;
}

export function PresentationView({ videoType, videoUrl, title, markers, rules, options, onDiscussed, onExit }: Props) {
  const { engine, state: playback } = useVideoEngine(videoType, videoUrl);
  const p = usePresentation({ engine, playback, markers, leadSeconds: options.leadSeconds, onDiscussed });
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  useEngineMount(engine, host);

  const [showDrawing, setShowDrawing] = useState(true);
  const [showNotes, setShowNotes] = useState(options.showNotes);
  const [blackout, setBlackout] = useState(false);
  const [chrome, setChrome] = useState(true);
  const idle = useRef<number>();

  // Start at the first situation once the stage exists.
  const started = useRef(false);
  useEffect(() => {
    if (host && !started.current) {
      started.current = true;
      p.goTo(0);
    }
  }, [host, p]);

  // Top bar and buttons fade out while the coach isn't touching the mouse.
  const wake = useCallback(() => {
    setChrome(true);
    window.clearTimeout(idle.current);
    idle.current = window.setTimeout(() => setChrome(false), 2500);
  }, []);
  useEffect(() => {
    wake();
    return () => window.clearTimeout(idle.current);
  }, [wake]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const k = e.key.toLowerCase();
      if (blackout && k !== 'escape') {
        e.preventDefault();
        setBlackout(false);
        return;
      }
      const actions: Record<string, () => void> = {
        arrowright: p.next, pagedown: p.next, enter: p.next,
        arrowleft: p.prev, pageup: p.prev,
        ' ': p.togglePlay, r: p.replay,
        d: () => setShowDrawing((v) => !v),
        i: () => setShowNotes((v) => !v),
        b: () => setBlackout(true), '.': () => setBlackout(true), // clickers' "blank screen" key
        escape: onExit, // in fullscreen the browser handles the first Esc itself
      };
      const action = actions[k];
      if (action) {
        e.preventDefault();
        action();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [p, blackout, onExit]);

  const box = useFitBox(playback.aspect);
  const m = p.current;
  const meta = m ? kindMeta(m.kind) : null;
  const rule = m ? rules.find((r) => r.id === m.ruleId) : undefined;
  const drawing = p.phase === 'hold' && showDrawing && m?.drawing ? m.drawing.shapes : [];

  return (
    <div
      className={cn('fixed inset-0 z-[60] flex flex-col bg-black text-white', !chrome && 'cursor-none')}
      onMouseMove={wake}
      role="dialog"
      aria-label={`Prezentace: ${title}`}
    >
      {/* progress + title */}
      <div className={cn('absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/80 to-transparent px-5 pb-6 pt-3 transition-opacity', chrome || p.phase === 'done' ? 'opacity-100' : 'opacity-0')}>
        <div className="flex gap-1" aria-hidden="true">
          {markers.map((x, i) => (
            <button
              key={x.id}
              onClick={(e) => {
                p.goTo(i);
                e.currentTarget.blur();
              }}
              tabIndex={-1}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                i === p.index && p.phase !== 'done' ? 'bg-white' : p.shownIds.includes(x.id) ? 'bg-[rgb(31,191,117)]' : 'bg-white/25',
              )}
              title={`${formatTime(x.timestampSeconds)} ${x.title}`}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center gap-3 text-sm text-white/80">
          <span className="truncate">{title}</span>
          <span className="tabular ml-auto font-display text-base">
            {p.phase === 'done' ? markers.length : p.index + 1} / {markers.length}
          </span>
          <button onClick={onExit} className="rounded-md p-1.5 hover:bg-white/10" aria-label="Ukončit prezentaci">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* video */}
      <div ref={box.ref} className="relative grid min-h-0 flex-1 place-items-center">
        <div className="relative overflow-hidden" style={{ width: box.width, height: box.height }}>
          <div ref={setHost} className="absolute inset-0" />
          {engine.capabilities.overlay && <DrawingOverlay shapes={drawing} />}
          {p.phase === 'leadIn' && m && (
            <span className="absolute left-4 top-16 rounded-md bg-black/60 px-3 py-1.5 font-display text-lg">
              Situace v {formatTime(m.timestampSeconds)}…
            </span>
          )}
          {playback.error && <p className="absolute inset-0 grid place-items-center bg-black/80 p-6 text-center">{playback.error}</p>}
        </div>

        {/* big transparent click targets + controls, visible with the mouse */}
        <div className={cn('absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 p-1.5 transition-opacity', chrome ? 'opacity-100' : 'pointer-events-none opacity-0')}>
          <RoundButton label="Předchozí situace" onClick={p.prev}><ChevronLeft className="h-6 w-6" /></RoundButton>
          <RoundButton label="Přehrát situaci znovu" onClick={p.replay}><RotateCcw className="h-5 w-5" /></RoundButton>
          <RoundButton label={playback.paused ? 'Pustit dál' : 'Pozastavit'} onClick={p.togglePlay}>
            {playback.paused ? <Play className="h-6 w-6 fill-current" /> : <Pause className="h-6 w-6 fill-current" />}
          </RoundButton>
          <RoundButton label="Další situace" onClick={p.next}><ChevronRight className="h-6 w-6" /></RoundButton>
        </div>
      </div>

      {/* notes for the room */}
      {showNotes && m && meta && p.phase !== 'done' && (
        <div className="border-t border-white/10 bg-[#0b111b] px-6 py-4 md:px-10 md:py-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium text-[#0b111b]" style={{ background: meta.color }}>
              <KindIcon kind={m.kind} className="h-4 w-4" /> {meta.label}
            </span>
            <span className="tabular font-display text-xl text-white/60">{formatTime(m.timestampSeconds)}</span>
          </div>
          <h2 className="mt-2 font-display text-3xl font-semibold leading-tight md:text-4xl">{m.title}</h2>
          {m.description && <p className="mt-2 line-clamp-3 max-w-5xl text-lg leading-snug text-white/85 md:text-xl">{m.description}</p>}
          {rule && (
            <p className="mt-2 text-base text-[rgb(31,191,117)] md:text-lg">
              Zásada {rule.code}: {rule.title}
            </p>
          )}
        </div>
      )}

      {p.phase === 'done' && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/85 p-6 text-center">
          <div>
            <p className="font-display text-4xl font-semibold">Rozbor je u konce</p>
            <p className="mt-2 text-lg text-white/70">
              Prošli jste {p.shownIds.length} z {markers.length} situací.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button onClick={() => p.goTo(0)} className="rounded-md border border-white/25 px-4 py-2 hover:bg-white/10">Znovu od začátku</button>
              <button onClick={onExit} className="rounded-md bg-[rgb(31,191,117)] px-4 py-2 font-medium text-[#051c10] hover:opacity-90">Zpět na rozbor</button>
            </div>
          </div>
        </div>
      )}

      {blackout && (
        <button className="absolute inset-0 z-30 cursor-none bg-black" onClick={() => setBlackout(false)} aria-label="Zrušit zatemnění" />
      )}
    </div>
  );
}

function RoundButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={(e) => {
        onClick();
        e.currentTarget.blur();
      }}
      aria-label={label}
      title={label}
      className="grid h-12 w-12 place-items-center rounded-full hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
      {children}
    </button>
  );
}

/** Largest box of the given aspect ratio that fits the element (letterboxing for any screen). */
function useFitBox(aspect: number) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  const width = Math.min(size.w, size.h * aspect);
  return { ref: setEl, width, height: width / aspect };
}
