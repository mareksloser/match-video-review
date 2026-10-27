import { useCallback, useRef, useState } from 'react';
import type { Point, Shape, ShapeColor, ShapeType } from '@/lib/types';
import { nextPlayerLabel, shapeAt, shapeFromGesture, translateShape } from './geometry';

export type Tool = ShapeType | 'select' | 'erase';

/**
 * Drawing editor state machine. Knows nothing about video or React components —
 * the overlay feeds it normalized pointer positions.
 */
export function useDrawingEditor(initial: Shape[]) {
  const [shapes, setShapes] = useState<Shape[]>(initial);
  const [history, setHistory] = useState<Shape[][]>([]);
  const [tool, setTool] = useState<Tool>('arrow');
  const [color, setColor] = useState<ShapeColor>('yellow');
  const [dashed, setDashed] = useState(false);
  const [team, setTeam] = useState<'own' | 'opponent'>('own');
  const [text, setText] = useState('');
  const [draft, setDraft] = useState<Shape | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const gesture = useRef<{ start: Point; last: Point; movingId: string | null } | null>(null);

  const commit = useCallback((next: Shape[]) => {
    setHistory((h) => [...h.slice(-49), shapes]);
    setShapes(next);
  }, [shapes]);

  const options = (current: Shape[]) => ({ color, dashed, team, text, label: nextPlayerLabel(current, team) });

  const pointerDown = (p: Point, aspect: number) => {
    if (tool === 'erase') {
      const hit = shapeAt(shapes, p, aspect);
      if (hit) commit(shapes.filter((s) => s.id !== hit.id));
      return;
    }
    if (tool === 'select') {
      const hit = shapeAt(shapes, p, aspect);
      setSelectedId(hit?.id ?? null);
      gesture.current = { start: p, last: p, movingId: hit?.id ?? null };
      if (hit) setHistory((h) => [...h.slice(-49), shapes]);
      return;
    }
    gesture.current = { start: p, last: p, movingId: null };
    setDraft(shapeFromGesture(tool, p, p, options(shapes), 'draft'));
  };

  const pointerMove = (p: Point) => {
    const g = gesture.current;
    if (!g) return;
    if (tool === 'select') {
      if (!g.movingId) return;
      const dx = p.x - g.last.x, dy = p.y - g.last.y;
      g.last = p;
      setShapes((all) => all.map((s) => (s.id === g.movingId ? translateShape(s, dx, dy) : s)));
      return;
    }
    g.last = p;
    setDraft(shapeFromGesture(tool as ShapeType, g.start, p, options(shapes), 'draft'));
  };

  const pointerUp = (p: Point) => {
    const g = gesture.current;
    gesture.current = null;
    setDraft(null);
    if (!g || tool === 'select' || tool === 'erase') return;
    const shape = shapeFromGesture(tool, g.start, p, options(shapes));
    if (shape) commit([...shapes, shape]);
  };

  const undo = () => {
    setHistory((h) => {
      if (!h.length) return h;
      setShapes(h[h.length - 1]);
      return h.slice(0, -1);
    });
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    commit(shapes.filter((s) => s.id !== selectedId));
    setSelectedId(null);
  };

  const reset = (next: Shape[]) => {
    setShapes(next);
    setHistory([]);
    setSelectedId(null);
  };

  return {
    shapes, draft, selectedId, tool, color, dashed, team, text, canUndo: history.length > 0,
    setTool, setColor, setDashed, setTeam, setText,
    pointerDown, pointerMove, pointerUp, undo, deleteSelected, clear: () => commit([]), reset,
  };
}

export type DrawingEditor = ReturnType<typeof useDrawingEditor>;
