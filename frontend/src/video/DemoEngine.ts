import { BaseEngine } from './engine';
import { project, simulate } from './demoMatch';
import type { Point } from '@/lib/types';

const DURATION = 45 * 60;

/** Offline "recording": a rendered, seekable match so the app can be tried without any video file. */
export class DemoEngine extends BaseEngine {
  readonly kind = 'demo';
  readonly capabilities = { inlinePlayback: true, frameStep: true, overlay: true };
  private canvas: HTMLCanvasElement | null = null;
  private raf = 0;
  private lastTick = 0;
  private resize: ResizeObserver | null = null;

  constructor() {
    super();
    this.state = { ...this.state, ready: true, duration: DURATION, currentTime: 6 * 60 };
  }

  mount(container: HTMLElement) {
    const c = document.createElement('canvas');
    c.className = 'h-full w-full block';
    container.appendChild(c);
    this.canvas = c;
    this.resize = new ResizeObserver(() => this.draw());
    this.resize.observe(c);
    this.draw();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.update({ paused: true });
    this.resize?.disconnect();
    this.canvas?.remove();
  }

  play() {
    if (!this.state.paused) return;
    this.update({ paused: false });
    this.lastTick = performance.now();
    const loop = (now: number) => {
      const dt = ((now - this.lastTick) / 1000) * this.state.rate;
      this.lastTick = now;
      const next = this.state.currentTime + dt;
      if (next >= DURATION) {
        this.update({ currentTime: DURATION, paused: true });
        this.draw();
        return;
      }
      this.update({ currentTime: next });
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  pause() {
    cancelAnimationFrame(this.raf);
    this.update({ paused: true });
  }

  seek(seconds: number) {
    this.update({ currentTime: this.clampTime(seconds) });
    this.draw();
  }

  setRate(rate: number) {
    this.update({ rate });
  }

  private draw() {
    const c = this.canvas;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, rect.width), h = Math.max(1, rect.height);
    if (c.width !== Math.round(w * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawScene(ctx, w, h, this.state.currentTime);
  }
}

function drawScene(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const P = { w, h };
  const pr = (x: number, y: number) => project({ x, y }, P);

  // Night sky and stand
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.42);
  sky.addColorStop(0, '#05080f');
  sky.addColorStop(1, '#121a26');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#1a2230';
  ctx.beginPath();
  ctx.moveTo(w * 0.08, h * 0.39);
  ctx.lineTo(w * 0.16, h * 0.25);
  ctx.lineTo(w * 0.84, h * 0.25);
  ctx.lineTo(w * 0.92, h * 0.39);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let row = 0; row < 5; row++)
    for (let i = 0; i < 70; i++) {
      const x = w * (0.17 + (i / 70) * 0.66) + ((row * 7 + i * 13) % 5);
      ctx.fillRect(x, h * (0.27 + row * 0.022), 2, 2);
    }
  for (const fx of [0.1, 0.9]) {
    const g = ctx.createRadialGradient(w * fx, h * 0.08, 0, w * fx, h * 0.08, w * 0.22);
    g.addColorStop(0, 'rgba(255,250,230,0.55)');
    g.addColorStop(1, 'rgba(255,250,230,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  // Grass with mowing stripes
  const stripes = 14;
  for (let i = 0; i < stripes; i++) {
    const a = i / stripes, b = (i + 1) / stripes;
    const pts = [pr(a - 0.04, -0.06), pr(b - 0.04, -0.06), pr(b + 0.04, 1.08), pr(a + 0.04, 1.08)];
    ctx.fillStyle = i % 2 ? '#2f6e2c' : '#357a31';
    poly(ctx, pts);
    ctx.fill();
  }
  const vignette = ctx.createLinearGradient(0, h * 0.4, 0, h);
  vignette.addColorStop(0, 'rgba(0,0,0,0.25)');
  vignette.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, h * 0.38, w, h);

  // Lines
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = Math.max(1, h / 400);
  const line = (pts: Point[], close = false) => {
    poly(ctx, pts.map((p) => pr(p.x, p.y)), close);
    ctx.stroke();
  };
  line([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }], true);
  line([{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }]);
  line([{ x: 0, y: 0.2 }, { x: 0.16, y: 0.2 }, { x: 0.16, y: 0.8 }, { x: 0, y: 0.8 }]);
  line([{ x: 1, y: 0.2 }, { x: 0.84, y: 0.2 }, { x: 0.84, y: 0.8 }, { x: 1, y: 0.8 }]);
  line([{ x: 0, y: 0.37 }, { x: 0.055, y: 0.37 }, { x: 0.055, y: 0.63 }, { x: 0, y: 0.63 }]);
  line([{ x: 1, y: 0.37 }, { x: 0.945, y: 0.37 }, { x: 0.945, y: 0.63 }, { x: 1, y: 0.63 }]);
  const circle = Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * Math.PI * 2;
    return { x: 0.5 + Math.cos(a) * 0.087, y: 0.5 + Math.sin(a) * 0.135 };
  });
  line(circle, true);

  // Players, sorted far → near so nearer ones overlap correctly
  const frame = simulate(t);
  const people = [
    ...frame.own.map((p, i) => ({ p, own: true, gk: i === 0 })),
    ...frame.opponent.map((p, i) => ({ p, own: false, gk: i === 0 })),
  ].sort((a, b) => a.p.y - b.p.y);
  const base = h / 88;
  for (const { p, own, gk } of people) {
    const s = pr(p.x, p.y);
    const r = base * s.scale;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, r * 1.1, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = gk ? (own ? '#f2c230' : '#ff8a3d') : own ? '#2f6bff' : '#f1f3f6';
    ctx.fillRect(s.x - r * 0.55, s.y - r * 3.2, r * 1.1, r * 1.9);
    ctx.fillStyle = own ? '#14244d' : '#c9ced6';
    ctx.fillRect(s.x - r * 0.5, s.y - r * 1.35, r * 0.4, r * 1.3);
    ctx.fillRect(s.x + r * 0.1, s.y - r * 1.35, r * 0.4, r * 1.3);
    ctx.fillStyle = '#e8c9a8';
    ctx.beginPath();
    ctx.arc(s.x, s.y - r * 3.6, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
  const b = pr(frame.ball.x, frame.ball.y);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(b.x, b.y - base * 0.6, base * 0.42 * b.scale, 0, Math.PI * 2);
  ctx.fill();
}

function poly(ctx: CanvasRenderingContext2D, pts: Point[], close = true) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  if (close) ctx.closePath();
}
