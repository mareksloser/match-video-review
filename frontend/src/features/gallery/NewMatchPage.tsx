import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useCategories, useCreateMatch, useMe } from '@/app/queries';
import { Button, ErrorNote, Field, Input, Panel, Select } from '@/components/ui';
import { detectVideoType, extractVeoTime, formatTime, stripVeoTime } from '@/lib/time';
import { isDemo } from '@/api';

type Source = 'veo' | 'ftp' | 'youtube' | 'file';

export function NewMatchPage() {
  const { data: me } = useMe();
  const categories = useCategories();
  const create = useCreateMatch();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [source, setSource] = useState<Source>('veo');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState(false);

  if (me?.role !== 'admin') return <p className="text-muted">Zápasy přidává trenér.</p>;

  const veoTime = source === 'veo' ? extractVeoTime(url) : null;
  const detected = url ? detectVideoType(url) : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) return;
    const videoUrl = source === 'veo' ? stripVeoTime(url.trim()) : url.trim();
    create.mutate(
      {
        title: title.trim(),
        matchDate: date,
        teamCategoryId: categoryId,
        videoType: source === 'file' ? 'ftp' : source,
        videoUrl,
        isPublic,
        file: source === 'file' ? file : null,
      },
      { onSuccess: (m) => navigate({ to: '/match/$matchId', params: { matchId: String(m.id) } }) },
    );
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Zpět na zápasy
      </Link>
      <h1 className="mt-3 font-display text-3xl font-semibold">Přidat zápas</h1>
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
            <Select value={source} onChange={(e) => setSource(e.target.value as Source)}>
              <option value="veo">VEO odkaz</option>
              <option value="ftp">Soubor na FTP / serveru (MP4, WebM)</option>
              <option value="youtube">YouTube</option>
              <option value="file">{isDemo ? 'Soubor z tohoto počítače (jen do zavření stránky)' : 'Nahrát soubor z počítače'}</option>
            </Select>
          </Field>
          {source === 'file' ? (
            <Field
              label="Videosoubor"
              hint={isDemo ? 'V ukázce se soubor nikam nenahrává, přehraje se jen v tomto okně.' : 'MP4 nebo WebM. Soubor se uloží na klubové úložiště (FTP / server).'}
            >
              <Input type="file" accept="video/mp4,video/webm" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </Field>
          ) : (
            <Field
              label="Adresa videa"
              hint={
                source === 'veo' ? (
                  veoTime !== null ? (
                    <>Odkaz obsahuje čas {formatTime(veoTime)}. Uloží se adresa zápasu, čas použijte při zakládání markeru.</>
                  ) : (
                    'VEO nejde vložit přímo do stránky: markery otevřou záznam na VEO v daném čase. Pro kreslení do videa nahrajte stažený soubor na FTP.'
                  )
                ) : detected && detected !== source && detected !== 'other' ? (
                  <>Adresa vypadá jako {detected.toUpperCase()}, zkontrolujte zdroj.</>
                ) : undefined
              }
            >
              <Input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={source === 'veo' ? 'https://app.veo.co/matches/…/#t=41:51' : source === 'youtube' ? 'https://youtu.be/…' : 'https://video.banik-libusin.cz/2026/zapas.mp4'}
              />
            </Field>
          )}
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-[rgb(var(--pitch))]" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            <span>
              <span className="font-medium">Zobrazit ve veřejné galerii</span>
              <span className="block text-muted">Video uvidí i nepřihlášení návštěvníci. Markery a poznámky zůstávají jen pro tým.</span>
            </span>
          </label>
          {create.error && <ErrorNote error={create.error} />}
          <div className="flex justify-end gap-2">
            <Link to="/"><Button type="button" variant="ghost">Zrušit</Button></Link>
            <Button type="submit" variant="primary" disabled={create.isPending}>
              {create.isPending && source === 'file' ? 'Nahrávám video…' : 'Přidat zápas'}
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
