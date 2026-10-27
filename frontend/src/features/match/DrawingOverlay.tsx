import { useEffect, useRef, useState } from 'react';
import type { Shape } from '@/lib/types';
import { prepareCanvas, renderShapes } from '@/canvas/render';
import { toNormalized } from '@/canvas/geometry';
import type { DrawingEditor } from '@/canvas/useDrawingEditor';
import { cn } from '@/lib/cn';

interface Props {
  shapes: Shape[];
  editor?: DrawingEditor | null;
}

/** Canvas layer above the video. Read-only unless an editor is passed in. */
export function DrawingOverlay({ shapes, editor }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setTick((t) => t + 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const all = editor ? (editor.draft ? [...editor.shapes, editor.draft] : editor.shapes) : shapes;
  useEffect(() => {
    const prepared = ref.current && prepareCanvas(ref.current);
    if (!prepared) return;
    renderShapes(prepared.ctx, all, prepared.w, prepared.h, editor?.selectedId ?? null);
  }, [all, editor?.selectedId, tick]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { p: toNormalized(e.clientX, e.clientY, rect), aspect: rect.width / rect.height };
  };

  return (
    <canvas
      ref={ref}
      className={cn('absolute inset-0 h-full w-full touch-none', editor ? 'cursor-crosshair' : 'pointer-events-none')}
      aria-label={editor ? 'Kreslicí plocha' : undefined}
      onPointerDown={
        editor
          ? (e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              const { p, aspect } = point(e);
              editor.pointerDown(p, aspect);
            }
          : undefined
      }
      onPointerMove={editor ? (e) => editor.pointerMove(point(e).p) : undefined}
      onPointerUp={editor ? (e) => editor.pointerUp(point(e).p) : undefined}
    />
  );
}
