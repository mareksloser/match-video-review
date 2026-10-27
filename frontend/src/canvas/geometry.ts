/**
 * Pure geometry for the tactical overlay. All coordinates are normalized (0..1)
 * relative to the video frame so drawings survive any player size.
 */
import type { Point, Shape, ShapeColor, ShapeType } from '@/lib/types';

export const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function toNormalized(clientX: number, clientY: number, rect: DOMRect): Point {
  return { x: clamp01((clientX - rect.left) / rect.width), y: clamp01((clientY - rect.top) / rect.height) };
}

export interface ShapeOptions {
  color: ShapeColor;
  dashed: boolean;
  team: 'own' | 'opponent';
  label: string;
  text: string;
}

let counter = 0;
export const newShapeId = () => `s${Date.now().toString(36)}${(counter++).toString(36)}`;

/** Builds a shape from a drag gesture. Returns null for gestures too small to mean anything. */
export function shapeFromGesture(
  tool: ShapeType,
  start: Point,
  end: Point,
  opts: ShapeOptions,
  id = newShapeId(),
): Shape | null {
  const dist = Math.hypot(end.x - start.x, end.y - start.y);
  switch (tool) {
    case 'arrow':
      return dist < 0.01 ? null : { id, type: 'arrow', from: start, to: end, color: opts.color, dashed: opts.dashed };
    case 'line':
      return dist < 0.01 ? null : { id, type: 'line', from: start, to: end, color: opts.color };
    case 'zone': {
      const rx = Math.max(Math.abs(end.x - start.x), 0.02);
      const ry = Math.max(Math.abs(end.y - start.y), 0.015);
      return { id, type: 'zone', center: start, rx, ry, color: opts.color };
    }
    case 'player':
      return { id, type: 'player', at: end, team: opts.team, label: opts.label };
    case 'text':
      return opts.text.trim() ? { id, type: 'text', at: end, text: opts.text.trim(), color: opts.color } : null;
  }
}

export function translateShape(shape: Shape, dx: number, dy: number): Shape {
  const move = (p: Point): Point => ({ x: clamp01(p.x + dx), y: clamp01(p.y + dy) });
  switch (shape.type) {
    case 'arrow':
    case 'line':
      return { ...shape, from: move(shape.from), to: move(shape.to) };
    case 'zone':
      return { ...shape, center: move(shape.center) };
    case 'player':
    case 'text':
      return { ...shape, at: move(shape.at) };
  }
}

function distanceToSegment(p: Point, a: Point, b: Point, aspect: number): number {
  // Work in a space where x is scaled by aspect so distances are visually uniform.
  const ax = a.x * aspect, bx = b.x * aspect, px = p.x * aspect;
  const dx = bx - ax, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), p.y - (a.y + t * dy));
}

/** aspect = width / height of the canvas. tolerance is in normalized height units. */
export function hitTest(shape: Shape, p: Point, aspect: number, tolerance = 0.025): boolean {
  switch (shape.type) {
    case 'arrow':
    case 'line':
      return distanceToSegment(p, shape.from, shape.to, aspect) <= tolerance;
    case 'zone': {
      const nx = (p.x - shape.center.x) / shape.rx;
      const ny = (p.y - shape.center.y) / shape.ry;
      return nx * nx + ny * ny <= 1.15;
    }
    case 'player':
      return Math.hypot((p.x - shape.at.x) * aspect, p.y - shape.at.y) <= 0.04;
    case 'text':
      return Math.abs(p.y - shape.at.y) < 0.04 && p.x >= shape.at.x - 0.01 && p.x <= shape.at.x + shape.text.length * 0.012;
  }
}

/** Top-most shape under the pointer (last drawn wins). */
export function shapeAt(shapes: Shape[], p: Point, aspect: number): Shape | null {
  for (let i = shapes.length - 1; i >= 0; i--) if (hitTest(shapes[i], p, aspect)) return shapes[i];
  return null;
}

/** Next free player label for the given team, e.g. "1", "2"… */
export function nextPlayerLabel(shapes: Shape[], team: 'own' | 'opponent'): string {
  const used = shapes.filter((s) => s.type === 'player' && s.team === team).length;
  return String(used + 1);
}
