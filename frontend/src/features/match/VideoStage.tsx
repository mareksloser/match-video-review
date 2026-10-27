import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { PlaybackState, VideoEngine } from '@/video/engine';
import { useEngineMount } from '@/video/usePlayback';
import type { Shape } from '@/lib/types';
import type { DrawingEditor } from '@/canvas/useDrawingEditor';
import { DrawingOverlay } from './DrawingOverlay';
import { formatTime } from '@/lib/time';

interface Props {
  engine: VideoEngine;
  state: PlaybackState;
  shapes: Shape[];
  editor: DrawingEditor | null;
  badge?: string | null;
}

export function VideoStage({ engine, state, shapes, editor, badge }: Props) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  useEngineMount(engine, host);

  if (!engine.capabilities.inlinePlayback) {
    const link = engine.deepLink(state.currentTime);
    return (
      <div className="grid aspect-video place-items-center rounded-t-xl bg-[rgb(var(--chalk))] p-6 text-center text-white">
        <div className="max-w-md">
          <p className="font-display text-2xl font-semibold">Záznam je na VEO</p>
          <p className="mt-2 text-sm text-white/70">
            VEO nedovoluje přehrávat svá videa uvnitř jiných stránek. Vyberte marker a otevřete záznam přesně v daném čase.
            Kresby do obrazu fungují po nahrání staženého souboru na FTP.
          </p>
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-pitch px-4 py-2 font-medium text-pitch-ink hover:bg-pitch/90"
            >
              Otevřít na VEO v {formatTime(state.currentTime)} <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-t-xl bg-black" style={{ aspectRatio: String(state.aspect) }}>
      <div ref={setHost} className="absolute inset-0" />
      {engine.capabilities.overlay && <DrawingOverlay shapes={shapes} editor={editor} />}
      {badge && (
        <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-2 rounded-md bg-black/65 px-2.5 py-1 font-display text-sm font-semibold text-white">
          <span className="h-2 w-2 rounded-full bg-card-red" aria-hidden="true" />
          {badge}
        </span>
      )}
      {state.error && (
        <div className="absolute inset-0 grid place-items-center bg-black/80 p-6 text-center text-white">
          <p>{state.error}</p>
        </div>
      )}
    </div>
  );
}
