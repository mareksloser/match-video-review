/**
 * Pure time helpers. No DOM, no globals — safe to unit test directly.
 */

/** 2511 → "41:51", 3723 → "1:02:03" */
export function formatTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00';
  const s = Math.floor(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** "41:51" → 2511, "1:02:03" → 3723, "90" → 90. Invalid input → null. */
export function parseTimeString(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+(:\d{1,2}){0,2}$/.test(trimmed)) return null;
  const parts = trimmed.split(':').map(Number);
  if (parts.slice(1).some((p) => p > 59)) return null;
  return parts.reduce((acc, part) => acc * 60 + part, 0);
}

/** Extracts the `#t=mm:ss` fragment of a VEO link, e.g. https://app.veo.co/matches/x/#t=41:51 → 2511 */
export function extractVeoTime(url: string): number | null {
  const match = /#(?:.*&)?t=([\d:]+)/.exec(url);
  return match ? parseTimeString(match[1]) : null;
}

/** Removes the time fragment so the stored match URL stays canonical. */
export function stripVeoTime(url: string): string {
  return url.replace(/#(?:.*&)?t=[\d:]+.*$/, '').replace(/#$/, '');
}

/** Builds a VEO deep link that opens the match at the given second. */
export function buildVeoUrl(url: string, seconds: number): string {
  const base = stripVeoTime(url);
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${base.endsWith('/') ? base : base + '/'}#t=${m}:${String(s).padStart(2, '0')}`;
}

export function detectVideoType(url: string): 'veo' | 'youtube' | 'ftp' | 'other' {
  try {
    const { hostname, pathname } = new URL(url);
    if (hostname.endsWith('veo.co')) return 'veo';
    if (/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(hostname)) return 'youtube';
    if (/\.(mp4|webm|m4v|mov)$/i.test(pathname)) return 'ftp';
  } catch {
    /* not an absolute URL */
  }
  if (/\.(mp4|webm|m4v|mov)$/i.test(url)) return 'ftp';
  return 'other';
}

export function youtubeId(url: string): string | null {
  const m = /(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/.exec(url);
  return m ? m[1] : null;
}

/** Index of the marker whose time window contains `t` (markers sorted ascending). */
export function activeMarkerIndex(times: number[], t: number, windowSeconds = 8): number {
  let found = -1;
  for (let i = 0; i < times.length; i++) {
    if (times[i] <= t + 0.25 && t - times[i] <= windowSeconds) found = i;
  }
  return found;
}
