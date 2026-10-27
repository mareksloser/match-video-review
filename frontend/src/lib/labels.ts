import type { MarkerKind } from './types';

export const markerKinds: { value: MarkerKind; label: string; color: string }[] = [
  { value: 'tactic', label: 'Taktika', color: '#4aa8ff' },
  { value: 'goal', label: 'Gól', color: '#1fbf75' },
  { value: 'chance', label: 'Šance', color: '#f5e63c' },
  { value: 'foul', label: 'Faul', color: '#f2c230' },
  { value: 'substitution', label: 'Střídání', color: '#e5484d' },
];

export const kindMeta = (kind: MarkerKind) =>
  markerKinds.find((k) => k.value === kind) ?? markerKinds[0];

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
