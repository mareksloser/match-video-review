import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useCategories } from '@/app/queries';
import { Button, ErrorNote, Field, Input, Panel, Select } from '@/components/ui';
import { detectVideoType, extractVeoTime, formatTime, stripVeoTime } from '@/lib/time';
import { videoTypeLabel } from '@/lib/labels';
import type { MatchInput } from '@/lib/types';
import { isDemo } from '@/api';

export type MatchFormValue = MatchInput & { file?: File | null };

const KNOWN_SOURCES = ['veo', 'ftp', 'youtube'] as const;

interface Props {
  /** Existing match when editing; null for a new one. */
  initial: MatchInput | null;
  submitLabel: string;
  pending: boolean;
  error: unknown;
  cancelTo: { to: '/' } | { to: '/match/$matchId'; params: { matchId: string } };
  onSubmit: (value: MatchFormValue) => void;
}

/** Shared by "Přidat zápas" and "Upravit zápas". */
export function MatchForm({ initial, submitLabel, pending, error, cancelTo, onSubmit }: Props) {
  const categories = useCategories();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [date, setDate] = useState(initial?.matchDate ?? new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState<number | ''>(initial?.teamCategoryId ?? '');
  const [source, setSource] = useState<string>(initial?.videoType ?? 'veo');
  const [url, setUrl] = useState(initial?.videoUrl ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState(initial?.isPublic ?? false);

  // A source the form does not know (e.g. the demo recording) stays selectable so editing doesn't break it.
  const extraSource = initial && !(KNOWN_SOURCES as readonly string[]).includes(initial.videoType) ? initial.videoType : null;
  const veoTime = source === 'veo' ? extractVeoTime(url) : null;
  const detected = url ? detectVideoType(url) : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) return;
    onSubmit({
      title: title.trim(),
      matchDate: date,
      teamCategoryId: categoryId,
      videoType: source === 'file' ? 'ftp' : source,
      videoUrl: source === 'veo' ? stripVeoTime(url.trim()) : url.trim(),
      isPublic,
      file: source === 'file' ? file : null,
    });
  };

  return (
    <Panel className="mt-5 p-5">
      <form onSubmit={submit} className="grid gap-4">
        <Field label="Název">
          <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="SK Baník Libušín – FK Lipová" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Datum zápasu">
            <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Tým">
            <Select required value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value) || '')}>
              <option value="">Vyberte tým</option>
              {categories.data?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Zdroj videa">
          <Select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="veo">VEO odkaz</option>
            <option value="ftp">Soubor na FTP / serveru (MP4, WebM)</option>
            <option value="youtube">YouTube</option>
            <option value="file">
              {isDemo ? 'Soubor z tohoto počítače (jen do zavření stránky)' : initial ? 'Nahrát nový soubor z počítače' : 'Nahrát soubor z počítače'}
            </option>
            {extraSource && <option value={extraSource}>{videoTypeLabel[extraSource] ?? extraSource}</option>}
          </Select>
        </Field>
        {source === 'file' ? (
          <Field
            label="Videosoubor"
            hint={isDemo ? 'V ukázce se soubor nikam nenahrává, přehraje se jen v tomto okně.' : 'MP4 nebo WebM. Soubor se uloží na klubové úložiště (FTP / server).'}
          >
            <Input type="file" accept="video/mp4,video/webm" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
        ) : source !== extraSource ? (
          <Field
            label="Adresa videa"
            hint={
              source === 'veo' ? (
                veoTime !== null ? (
                  <>Odkaz obsahuje čas {formatTime(veoTime)}. Uloží se adresa zápasu, čas použijte při zakládání markeru.</>
                ) : (
                  'VEO nejde vložit přímo do stránky: markery otevřou záznam na VEO v daném čase. Pro kreslení do videa nahrajte stažený soubor.'
                )
              ) : detected && detected !== source && detected !== 'other' ? (
                <>Adresa vypadá jako {detected.toUpperCase()}, zkontrolujte zdroj.</>
              ) : undefined
            }
          >
            <Input
              type={source === 'ftp' ? 'text' : 'url'}
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={source === 'veo' ? 'https://app.veo.co/matches/…/#t=41:51' : source === 'youtube' ? 'https://youtu.be/…' : 'https://video.banik-libusin.cz/2026/zapas.mp4'}
            />
          </Field>
        ) : null}
        {initial && (source !== initial.videoType || url !== initial.videoUrl) && (
          <p className="rounded-md border border-line bg-raised px-3 py-2 text-sm text-muted">
            Markery zůstanou na stejných časech. Pokud nové video začíná jinde (např. sestřih), časy nebudou sedět.
          </p>
        )}
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-[rgb(var(--pitch))]" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          <span>
            <span className="font-medium">Zobrazit ve veřejné galerii</span>
            <span className="block text-muted">Video uvidí i nepřihlášení návštěvníci. Markery a poznámky zůstávají jen pro tým.</span>
          </span>
        </label>
        {error ? <ErrorNote error={error} /> : null}
        <div className="flex justify-end gap-2">
          <Link {...cancelTo}>
            <Button type="button" variant="ghost">Zrušit</Button>
          </Link>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending && source === 'file' ? 'Nahrávám video…' : submitLabel}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
