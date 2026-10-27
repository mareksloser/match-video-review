/**
 * Deterministic match simulation for the offline demo: every frame is a pure
 * function of time, so seeking anywhere is exact and repeatable.
 */
import type { Point } from '@/lib/types';

const OWN_BASE: Point[] = [
  { x: 0.05, y: 0.5 },
  { x: 0.22, y: 0.14 }, { x: 0.19, y: 0.38 }, { x: 0.19, y: 0.62 }, { x: 0.22, y: 0.86 },
  { x: 0.4, y: 0.3 }, { x: 0.35, y: 0.5 }, { x: 0.4, y: 0.7 },
  { x: 0.6, y: 0.18 }, { x: 0.64, y: 0.5 }, { x: 0.6, y: 0.82 },
];
const OPP_BASE: Point[] = [
  { x: 0.95, y: 0.5 },
  { x: 0.78, y: 0.15 }, { x: 0.8, y: 0.39 }, { x: 0.8, y: 0.61 }, { x: 0.78, y: 0.85 },
  { x: 0.6, y: 0.2 }, { x: 0.62, y: 0.42 }, { x: 0.62, y: 0.58 }, { x: 0.6, y: 0.8 },
  { x: 0.42, y: 0.42 }, { x: 0.42, y: 0.58 },
];

export interface SimFrame {
  ball: Point;
  own: Point[];
  opponent: Point[];
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function simulate(t: number): SimFrame {
  const ball = {
    x: clamp(0.5 + 0.3 * Math.sin(t * 0.083) + 0.12 * Math.sin(t * 0.31 + 1.3), 0.03, 0.97),
    y: clamp(0.5 + 0.28 * Math.sin(t * 0.121 + 2) + 0.12 * Math.cos(t * 0.43), 0.04, 0.96),
  };
  const shift = (base: Point[], phase: number, xPull: number): Point[] =>
    base.map((p, i) => {
      const gk = i === 0;
      return {
        x: clamp(p.x + (ball.x - 0.5) * (gk ? 0.08 : xPull) + 0.012 * Math.sin(t * 0.7 + i * 1.7 + phase), 0.02, 0.98),
        y: clamp(p.y + (ball.y - 0.5) * (gk ? 0.15 : 0.32) + 0.018 * Math.cos(t * 0.55 + i * 2.3 + phase), 0.03, 0.97),
      };
    });
  return { ball, own: shift(OWN_BASE, 0, 0.5), opponent: shift(OPP_BASE, 3, 0.45) };
}

/* ---------- Broadcast-style perspective projection (side camera) ---------- */

export interface Projection {
  w: number;
  h: number;
}

const TOP = 0.4, BOTTOM = 0.97, K = -0.45, FAR_HALF = 0.37, NEAR_HALF = 0.64;

/** Pitch point (x along length, y across width; y=0 far touchline) → screen pixels. */
export function project(p: Point, { w, h }: Projection): Point & { scale: number } {
  const depth = (p.y * (1 + K)) / (1 + K * p.y);
  const sy = TOP + (BOTTOM - TOP) * depth;
  const half = FAR_HALF + (NEAR_HALF - FAR_HALF) * depth;
  return { x: w / 2 + (p.x - 0.5) * 2 * half * w, y: sy * h, scale: 0.55 + depth * 0.75 };
}
