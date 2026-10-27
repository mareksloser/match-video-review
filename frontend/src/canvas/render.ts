import type { Shape, ShapeColor } from '@/lib/types';

export const shapeColors: Record<ShapeColor, string> = {
  yellow: '#f5e63c',
  blue: '#4aa8ff',
  red: '#ff5a5f',
  white: '#ffffff',
};

/**
 * Draws shapes onto a 2D context whose size is `w`×`h` CSS pixels.
 * Stateless: the same input always produces the same picture.
 */
export function renderShapes(
  ctx: CanvasRenderingContext2D,
  shapes: Shape[],
  w: number,
  h: number,
  selectedId: string | null = null,
) {
  const unit = Math.max(1.5, h / 260); // stroke scale relative to frame height
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const shape of shapes) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = unit * 2;
    drawShape(ctx, shape, w, h, unit);
    ctx.restore();
    if (shape.id === selectedId) drawSelection(ctx, shape, w, h, unit);
  }
  ctx.restore();
}

function drawShape(ctx: CanvasRenderingContext2D, s: Shape, w: number, h: number, unit: number) {
  switch (s.type) {
    case 'arrow':
    case 'line': {
      const color = shapeColors[s.color];
      const ax = s.from.x * w, ay = s.from.y * h, bx = s.to.x * w, by = s.to.y * h;
      ctx.strokeStyle = color;
      ctx.lineWidth = unit * 2;
      if (s.type === 'arrow' && s.dashed) ctx.setLineDash([unit * 5, unit * 4]);
      const angle = Math.atan2(by - ay, bx - ax);
      const head = unit * 9;
      const endX = s.type === 'arrow' ? bx - Math.cos(angle) * head * 0.6 : bx;
      const endY = s.type === 'arrow' ? by - Math.sin(angle) * head * 0.6 : by;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.setLineDash([]);
      if (s.type === 'arrow') {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx - head * Math.cos(angle - 0.42), by - head * Math.sin(angle - 0.42));
        ctx.lineTo(bx - head * Math.cos(angle + 0.42), by - head * Math.sin(angle + 0.42));
        ctx.closePath();
        ctx.fill();
      }
      return;
    }
    case 'zone': {
      const color = shapeColors[s.color];
      ctx.beginPath();
      ctx.ellipse(s.center.x * w, s.center.y * h, s.rx * w, s.ry * h, 0, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(color, 0.2);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = unit * 1.4;
      ctx.stroke();
      return;
    }
    case 'player': {
      const r = unit * 7.5;
      const x = s.at.x * w, y = s.at.y * h;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = s.team === 'own' ? '#1fbf75' : '#ff5a5f';
      ctx.fill();
      ctx.lineWidth = unit;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = `600 ${Math.round(r * 1.05)}px Barlow, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.label, x, y + 0.5);
      return;
    }
    case 'text': {
      const size = Math.round(unit * 8);
      ctx.font = `600 ${size}px "Barlow Condensed", Barlow, system-ui, sans-serif`;
      ctx.textBaseline = 'middle';
      const x = s.at.x * w, y = s.at.y * h;
      const width = ctx.measureText(s.text).width;
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(10,15,25,0.72)';
      roundRect(ctx, x - unit * 3, y - size * 0.75, width + unit * 6, size * 1.5, unit * 2);
      ctx.fill();
      ctx.fillStyle = shapeColors[s.color];
      ctx.fillText(s.text, x, y);
      return;
    }
  }
}

function drawSelection(ctx: CanvasRenderingContext2D, s: Shape, w: number, h: number, unit: number) {
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.setLineDash([unit * 2, unit * 2]);
  ctx.lineWidth = unit * 0.8;
  const pts =
    s.type === 'arrow' || s.type === 'line'
      ? [s.from, s.to]
      : s.type === 'zone'
        ? [{ x: s.center.x - s.rx, y: s.center.y - s.ry }, { x: s.center.x + s.rx, y: s.center.y + s.ry }]
        : [s.at, s.at];
  const xs = pts.map((p) => p.x * w), ys = pts.map((p) => p.y * h);
  const pad = unit * 8;
  ctx.strokeRect(Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) - Math.min(...xs) + pad * 2, Math.max(...ys) - Math.min(...ys) + pad * 2);
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hexToRgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** Sizes a canvas for the device pixel ratio and returns a context in CSS pixels. */
export function prepareCanvas(canvas: HTMLCanvasElement): { ctx: CanvasRenderingContext2D; w: number; h: number } | null {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(1, Math.round(rect.width)), h = Math.max(1, Math.round(rect.height));
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}
