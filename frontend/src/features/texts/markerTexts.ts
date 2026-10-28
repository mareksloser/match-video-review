/**
 * Round-trip of marker texts through an AI proofreader. Pure functions only.
 *
 * Export format (chosen so an AI keeps it intact and a human can read it):
 *
 *   === MARKER 12 | 14:20 ===
 *   NÁZEV: Obranný zlom – pozdní přesun stoperů
 *   POPIS:
 *   Míč jde na kraj…
 */
import type { Marker } from '@/lib/types';
import { formatTime } from '@/lib/time';

export const AI_PROMPT = `Oprav pravopis, gramatiku a interpunkci v českých textech níže. Jde o poznámky fotbalového trenéra k situacím ze zápasu.
- Neměň význam, styl ani fotbalovou terminologii (presink, stoper, šestka, krajní obránce…). Nic nepřidávej ani neodebírej.
- Zachovej přesně strukturu: řádky "=== MARKER … ===", "NÁZEV:" a "POPIS:" nech beze změny, včetně čísel.
- Vrať jen opravený text ve stejném formátu, bez komentářů a bez vysvětlování.`;

const EMPTY_DESCRIPTION = '(bez popisu)';

export function exportMarkerTexts(markers: Pick<Marker, 'id' | 'timestampSeconds' | 'title' | 'description'>[], withPrompt: boolean): string {
  const blocks = markers.map(
    (m) => `=== MARKER ${m.id} | ${formatTime(m.timestampSeconds)} ===\nNÁZEV: ${m.title}\nPOPIS:\n${m.description?.trim() || EMPTY_DESCRIPTION}`,
  );
  return (withPrompt ? `${AI_PROMPT}\n\n` : '') + blocks.join('\n\n') + '\n';
}

export interface ParsedTexts {
  entries: Map<number, { title: string; description: string | null }>;
  warnings: string[];
}

/** Tolerant parser: survives code fences, extra blank lines, bold markers and "Nazev"/"NÁZEV" variants. */
export function parseMarkerTexts(input: string): ParsedTexts {
  const entries = new Map<number, { title: string; description: string | null }>();
  const warnings: string[] = [];
  const text = input.replace(/\r\n?/g, '\n').replace(/^```[^\n]*$/gm, '');
  const header = /^[*\s]*={2,}\s*MARKER\s+(\d+)[^\n]*$/gim;
  const starts = [...text.matchAll(header)];
  if (!starts.length) warnings.push('V textu nejsou žádné bloky „=== MARKER … ===“. Vložte celou odpověď včetně těchto řádků.');

  starts.forEach((match, i) => {
    const id = Number(match[1]);
    const body = text.slice(match.index! + match[0].length, starts[i + 1]?.index ?? text.length);
    const title = /^[*\s]*n[aá]zev\s*:?\**\s*(.*)$/im.exec(body)?.[1]?.replace(/\*+$/, '').trim() ?? '';
    const descMatch = /^[*\s]*popis\s*:?\**[ \t]*(.*)$/im.exec(body);
    let description: string | null = null;
    if (descMatch) {
      const rest = descMatch[1] + body.slice(descMatch.index + descMatch[0].length);
      const clean = rest.replace(/\n{3,}/g, '\n\n').trim();
      description = clean && clean !== EMPTY_DESCRIPTION ? clean : null;
    }
    if (entries.has(id)) warnings.push(`Marker ${id} je v textu dvakrát, použil jsem první výskyt.`);
    else if (!title) warnings.push(`U markeru ${id} chybí řádek „NÁZEV:“, přeskočil jsem ho.`);
    else entries.set(id, { title, description });
  });
  return { entries, warnings };
}

export type DiffPart = { type: 'same' | 'del' | 'ins'; text: string };

/** Word-level diff (LCS). Whitespace is kept attached to tokens so the result reads naturally. */
export function diffWords(before: string, after: string): DiffPart[] {
  const a = before.match(/\s+|[^\s]+/g) ?? [];
  const b = after.match(/\s+|[^\s]+/g) ?? [];
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);

  const out: DiffPart[] = [];
  const push = (type: DiffPart['type'], text: string) => {
    const last = out[out.length - 1];
    if (last?.type === type) last.text += text;
    else out.push({ type, text });
  };
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) (push('same', a[i]), i++, j++);
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) push('del', a[i++]);
    else push('ins', b[j++]);
  }
  while (i < a.length) push('del', a[i++]);
  while (j < b.length) push('ins', b[j++]);
  return groupChanges(out);
}

/**
 * Spaces that happen to match between two changed words would make a rewrite read as
 * "old new old new…". Merge them into the surrounding change so it reads "old old | new new".
 */
function groupChanges(parts: DiffPart[]): DiffPart[] {
  const out: DiffPart[] = [];
  let del = '', ins = '';
  const flush = () => {
    if (del) out.push({ type: 'del', text: del });
    if (ins) out.push({ type: 'ins', text: ins });
    del = ins = '';
  };
  parts.forEach((p, k) => {
    if (p.type === 'del') del += p.text;
    else if (p.type === 'ins') ins += p.text;
    else if ((del || ins) && /^\s+$/.test(p.text) && parts[k + 1] && parts[k + 1].type !== 'same') {
      del += p.text;
      ins += p.text;
    } else {
      flush();
      out.push(p);
    }
  });
  flush();
  return out;
}

/**
 * How much the text changed, 0–1, by characters (Levenshtein / length).
 * Spelling fixes touch a few letters even when they hit most words of a short title;
 * a rewrite changes most characters.
 */
export function changeRatio(before: string, after: string): number {
  if (before === after) return 0;
  const a = [...before], b = [...after];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++)
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length] / Math.max(a.length, b.length, 1);
}

export interface TextChange {
  marker: Marker;
  title: string;
  description: string | null;
  titleChanged: boolean;
  descriptionChanged: boolean;
  /** More than a proofreading fix — probably rewritten; not pre-selected. */
  suspicious: boolean;
}

export const SUSPICIOUS_RATIO = 0.3;

export function computeChanges(markers: Marker[], parsed: ParsedTexts): { changes: TextChange[]; unchanged: number; warnings: string[] } {
  const warnings = [...parsed.warnings];
  const known = new Set(markers.map((m) => m.id));
  for (const id of parsed.entries.keys()) if (!known.has(id)) warnings.push(`Marker ${id} u tohoto zápasu neexistuje, přeskočil jsem ho.`);
  const missing = markers.filter((m) => !parsed.entries.has(m.id)).length;
  if (missing && parsed.entries.size) warnings.push(`${missing} markerů v opraveném textu chybí, zůstanou beze změny.`);

  const changes: TextChange[] = [];
  let unchanged = 0;
  for (const m of markers) {
    const e = parsed.entries.get(m.id);
    if (!e) continue;
    const titleChanged = e.title !== m.title;
    const descriptionChanged = (e.description ?? '') !== (m.description?.trim() ?? '');
    if (!titleChanged && !descriptionChanged) {
      unchanged++;
      continue;
    }
    const ratio = Math.max(changeRatio(m.title, e.title), changeRatio(m.description ?? '', e.description ?? ''));
    changes.push({ marker: m, title: e.title, description: e.description, titleChanged, descriptionChanged, suspicious: ratio > SUSPICIOUS_RATIO });
  }
  return { changes, unchanged, warnings };
}
