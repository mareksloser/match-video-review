import type { MarkerKind } from './types';

/** Order = order in the select and in the list filter. Colors stay distinct on the dark timeline. */
export const markerKinds: { value: MarkerKind; label: string; color: string }[] = [
  { value: 'praise', label: 'Pochvala', color: '#1fbf75' },
  { value: 'mistake', label: 'Chyba', color: '#ff5a5f' },
  { value: 'improvement', label: 'Lepší řešení', color: '#fb923c' },
  { value: 'tactic', label: 'Taktika', color: '#4aa8ff' },
  { value: 'goal', label: 'Gól', color: '#c084fc' },
  { value: 'chance', label: 'Šance', color: '#f472b6' },
  { value: 'set_piece', label: 'Standardka', color: '#22d3ee' },
  { value: 'foul', label: 'Faul', color: '#f2c230' },
  { value: 'substitution', label: 'Střídání', color: '#94a3b8' },
];

export const kindMeta = (kind: MarkerKind) =>
  markerKinds.find((k) => k.value === kind) ?? markerKinds.find((k) => k.value === 'tactic')!;

export const videoTypeLabel: Record<string, string> = {
  veo: 'VEO',
  ftp: 'Soubor',
  youtube: 'YouTube',
  demo: 'Ukázka',
  other: 'Jiný',
};

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d}. ${m}. ${y}`;
}
