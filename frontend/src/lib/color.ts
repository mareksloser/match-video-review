/** Pure color helpers for the accent color setting. */

export function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** "31 191 117" — the format the Tailwind theme variables use (rgb(var(--pitch) / alpha)). */
export const rgbTriplet = (rgb: [number, number, number]) => rgb.join(' ');

/** WCAG relative luminance, 0 (black) – 1 (white). */
export function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio 1–21. */
export function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export const INK_DARK: [number, number, number] = [5, 28, 16];
export const INK_LIGHT: [number, number, number] = [255, 255, 255];

/** Text color for buttons filled with the accent: whichever of dark/white reads better. */
export const readableInk = (accent: [number, number, number]) =>
  contrast(accent, INK_DARK) >= contrast(accent, INK_LIGHT) ? INK_DARK : INK_LIGHT;

/** App backgrounds the accent is used on as text/icons (light and dark theme). */
export const BACKGROUNDS = { light: [255, 255, 255] as [number, number, number], dark: [19, 27, 40] as [number, number, number] };
