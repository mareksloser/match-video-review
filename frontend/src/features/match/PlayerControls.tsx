import { Maximize, Pause, Play, RotateCcw, RotateCw, StepBack, StepForward } from 'lucide-react';
import type { PlaybackState, VideoEngine } from '@/video/engine';
import { formatTime } from '@/lib/time';
import { cn } from '@/lib/cn';

interface Props {
  engine: VideoEngine;
  state: PlaybackState;
  duration: number;
  overlayOn: boolean;
  onOverlayChange: (v: boolean) => void;
  autoStop: boolean;
  onAutoStopChange: (v: boolean) => void;
  onFullscreen: () => void;
}

const iconBtn = 'grid h-9 w-9 place-items-center rounded-md text-white/85 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-pitch';

export function PlayerControls({ engine, state, duration, overlayOn, onOverlayChange, autoStop, onAutoStopChange, onFullscreen }: Props) {
  const inline = engine.capabilities.inlinePlayback;
  const step = (d: number) => {
    engine.pause();
    engine.seek(state.currentTime + d);
  };
  return (
    <div className="bg-[rgb(var(--chalk))] px-3 pb-3 pt-2 text-white">
      <input
        type="range"
        min={0}
        max={duration || 1}
        step={0.1}
        value={Math.min(state.currentTime, duration)}
        onChange={(e) => engine.seek(Number(e.target.value))}
        aria-label="Pozice ve videu"
        className="h-1.5 w-full cursor-pointer accent-[rgb(var(--pitch))]"
      />
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {inline && (
          <button className={iconBtn} onClick={() => (state.paused ? engine.play() : engine.pause())} aria-label={state.paused ? 'Přehrát' : 'Pozastavit'}>
            {state.paused ? <Play className="h-5 w-5 fill-current" /> : <Pause className="h-5 w-5 fill-current" />}
          </button>
        )}
        <span className="tabular px-2 font-display text-base">
          {formatTime(state.currentTime)} <span className="text-white/50">/ {formatTime(duration)}</span>
        </span>
        {inline && (
          <div className="ml-1 flex items-center">
            <button className={iconBtn} onClick={() => engine.seek(state.currentTime - 5)} aria-label="Zpět o 5 sekund" title="Zpět o 5 s (←)">
              <RotateCcw className="h-4 w-4" />
            </button>
            {engine.capabilities.frameStep && (
              <>
                <button className={iconBtn} onClick={() => step(-0.1)} aria-label="Zpět o 0,1 sekundy" title="Zpět o 0,1 s (,)">
                  <StepBack className="h-4 w-4" />
                </button>
                <button className={iconBtn} onClick={() => step(0.1)} aria-label="Vpřed o 0,1 sekundy" title="Vpřed o 0,1 s (.)">
                  <StepForward className="h-4 w-4" />
                </button>
              </>
            )}
            <button className={iconBtn} onClick={() => engine.seek(state.currentTime + 5)} aria-label="Vpřed o 5 sekund" title="Vpřed o 5 s (→)">
              <RotateCw className="h-4 w-4" />
            </button>
            <select
              value={state.rate}
              onChange={(e) => engine.setRate(Number(e.target.value))}
              aria-label="Rychlost přehrávání"
              className="ml-1 h-8 rounded-md border border-white/15 bg-transparent px-1.5 text-sm text-white [&>option]:text-black"
            >
              {[0.25, 0.5, 1, 1.5, 2].map((r) => (
                <option key={r} value={r}>{r}×</option>
              ))}
            </select>
          </div>
        )}
        <div className="ml-auto flex items-center gap-3">
          {inline && (
            <>
              <Toggle label="Stop u markerů" checked={autoStop} onChange={onAutoStopChange} />
              <Toggle label="Kresby" checked={overlayOn} onChange={onOverlayChange} />
              <button className={iconBtn} onClick={onFullscreen} aria-label="Celá obrazovka">
                <Maximize className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-white/85">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors', checked ? 'bg-[rgb(var(--pitch))]' : 'bg-white/20')}
      >
          <span className={cn('absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform', checked ? 'translate-x-4' : 'translate-x-0')} />
      </button>
    </label>
  );
}
