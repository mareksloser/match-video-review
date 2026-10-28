import { useMemo, useRef, useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, ClipboardCopy, TriangleAlert } from 'lucide-react';
import { useApi } from '@/app/ApiContext';
import { keys, useMarkers, useMatch, useMe } from '@/app/queries';
import { Badge, Button, ErrorNote, Panel, Spinner, Textarea } from '@/components/ui';
import { KindIcon } from '@/features/match/KindIcon';
import { kindMeta } from '@/lib/labels';
import { formatTime } from '@/lib/time';
import { cn } from '@/lib/cn';
import { computeChanges, diffWords, exportMarkerTexts, parseMarkerTexts, type TextChange } from './markerTexts';
import { DiffText } from './DiffText';

type Result = ReturnType<typeof computeChanges>;
type SaveState = { done: number; total: number; failed: { title: string; error: string }[] } | null;

export function MarkerTextsPage() {
  const { matchId } = useParams({ strict: false }) as { matchId: string };
  const id = Number(matchId);
  const api = useApi();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const match = useMatch(id);
  const markers = useMarkers(id);

  const [withPrompt, setWithPrompt] = useState(true);
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [accepted, setAccepted] = useState<Set<number>>(new Set());
  const [save, setSave] = useState<SaveState>(null);
  const exportRef = useRef<HTMLTextAreaElement>(null);

  const exported = useMemo(() => exportMarkerTexts(markers.data ?? [], withPrompt), [markers.data, withPrompt]);

  if (me?.role !== 'admin') return <p className="text-muted">Texty markerů upravuje trenér.</p>;
  if (match.isLoading || markers.isLoading) return <Spinner />;
  if (match.error || !match.data) return <ErrorNote error={match.error} />;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exported);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API blocked: select the text so Ctrl+C works.
      exportRef.current?.select();
    }
  };

  const compare = () => {
    const r = computeChanges(markers.data ?? [], parseMarkerTexts(pasted));
    setResult(r);
    setAccepted(new Set(r.changes.filter((c) => !c.suspicious).map((c) => c.marker.id)));
    setSave(null);
  };

  const apply = async () => {
    if (!result) return;
    const chosen = result.changes.filter((c) => accepted.has(c.marker.id));
    const state = { done: 0, total: chosen.length, failed: [] as { title: string; error: string }[] };
    setSave({ ...state });
    for (const c of chosen) {
      const m = c.marker;
      try {
        await api.updateMarker(m.id, {
          timestampSeconds: m.timestampSeconds,
          kind: m.kind,
          title: c.title,
          description: c.description,
          ruleId: m.ruleId,
          ruleLink: m.ruleLink,
        });
      } catch (e) {
        state.failed.push({ title: m.title, error: e instanceof Error ? e.message : 'Chyba' });
      }
      state.done++;
      setSave({ ...state });
    }
    await qc.invalidateQueries({ queryKey: keys.markers(id) });
    setResult(null);
    setPasted('');
  };

  const toggle = (markerId: number) =>
    setAccepted((s) => {
      const n = new Set(s);
      if (n.has(markerId)) n.delete(markerId);
      else n.add(markerId);
      return n;
    });

  const saving = save !== null && save.done < save.total;

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/match/$matchId" params={{ matchId }} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Zpět na rozbor
      </Link>
      <h1 className="mt-2 font-display text-3xl font-semibold">Korektura textů</h1>
      <p className="mt-1 text-muted">{match.data.title}</p>

      {markers.data?.length === 0 ? (
        <p className="mt-6 text-muted">Zápas zatím nemá žádné markery.</p>
      ) : (
        <>
          <Step n={1} title="Zkopírujte texty" text="Vložte je do Clauda nebo ChatGPT. Instrukce na začátku říkají, ať opraví jen pravopis a zachová formát.">
            <Textarea ref={exportRef} readOnly value={exported} rows={8} className="font-mono text-sm" aria-label="Texty markerů k opravě" />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button variant="primary" onClick={copy}>
                {copied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />} {copied ? 'Zkopírováno' : 'Zkopírovat'}
              </Button>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--pitch))]" checked={withPrompt} onChange={(e) => setWithPrompt(e.target.checked)} />
                Přidat instrukce pro AI
              </label>
              <span className="text-sm text-muted">{markers.data?.length} markerů</span>
            </div>
          </Step>

          <Step n={2} title="Vložte opravený text" text="Celou odpověď AI, včetně řádků „=== MARKER … ===“. Na pořadí ani případném ``` obalu nezáleží.">
            <Textarea value={pasted} onChange={(e) => setPasted(e.target.value)} rows={8} className="font-mono text-sm" aria-label="Opravený text" />
            <Button className="mt-3" variant="primary" disabled={!pasted.trim() || saving} onClick={compare}>
              Porovnat změny
            </Button>
          </Step>
        </>
      )}

      {save && !saving && (
        <div className={cn('mt-6 rounded-xl border p-4 text-sm', save.failed.length ? 'border-card-red/40 bg-card-red/5' : 'border-pitch/50 bg-pitch/10')} role="status">
          <p className="font-medium">Uloženo {save.total - save.failed.length} z {save.total} markerů.</p>
          {save.failed.map((f) => (
            <p key={f.title} className="mt-1 text-card-red">{f.title}: {f.error}</p>
          ))}
        </div>
      )}

      {result && (
        <Step n={3} title="Zkontrolujte a uložte" text={`${changedLabel(result.changes.length)}, ${result.unchanged} beze změny.`}>
          {result.warnings.length > 0 && (
            <ul className="mb-4 space-y-1 rounded-lg border border-card-yellow/40 bg-card-yellow/10 p-3 text-sm">
              {result.warnings.map((w) => (
                <li key={w} className="flex gap-2"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-card-yellow" /> {w}</li>
              ))}
            </ul>
          )}
          {result.changes.length > 0 && (
            <>
              <div className="mb-3 flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setAccepted(new Set(result.changes.map((c) => c.marker.id)))}>Vybrat vše</Button>
                <Button size="sm" variant="ghost" onClick={() => setAccepted(new Set())}>Nic</Button>
              </div>
              <ol className="space-y-3">
                {result.changes.map((c) => (
                  <ChangeCard key={c.marker.id} change={c} accepted={accepted.has(c.marker.id)} onToggle={() => toggle(c.marker.id)} />
                ))}
              </ol>
              <div className="mt-4 flex items-center gap-3">
                <Button variant="primary" disabled={!accepted.size || saving} onClick={apply}>
                  {saving ? `Ukládám ${save!.done} / ${save!.total}…` : `Uložit vybrané (${accepted.size})`}
                </Button>
                <Button variant="ghost" disabled={saving} onClick={() => setResult(null)}>Zrušit</Button>
              </div>
            </>
          )}
        </Step>
      )}
    </div>
  );
}

/** Czech plural: 1 marker se změnil, 2–4 markery se změnily, 5+ markerů se změnilo. */
function changedLabel(n: number) {
  if (n === 1) return '1 marker se změnil';
  if (n >= 2 && n <= 4) return `${n} markery se změnily`;
  return `${n} markerů se změnilo`;
}

function Step({ n, title, text, children }: { n: number; title: string; text: string; children: React.ReactNode }) {
  return (
    <Panel className="mt-6 p-5">
      <div className="mb-3 flex items-start gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-pitch font-display font-semibold text-pitch-ink">{n}</span>
        <div>
          <h2 className="font-display text-lg font-semibold leading-tight">{title}</h2>
          <p className="text-sm text-muted">{text}</p>
        </div>
      </div>
      {children}
    </Panel>
  );
}

function ChangeCard({ change: c, accepted, onToggle }: { change: TextChange; accepted: boolean; onToggle: () => void }) {
  const meta = kindMeta(c.marker.kind);
  return (
    <li className={cn('rounded-lg border p-4', accepted ? 'border-pitch/60' : 'border-line opacity-70')}>
      <label className="relative flex cursor-pointer items-center gap-3">
        <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--pitch))]" checked={accepted} onChange={onToggle} />
        <span className="grid h-6 w-6 place-items-center rounded-full text-[#0b111b]" style={{ background: meta.color }}>
          <KindIcon kind={c.marker.kind} />
        </span>
        <span className="tabular font-display font-semibold">{formatTime(c.marker.timestampSeconds)}</span>
        {c.suspicious && (
          <Badge className="bg-card-yellow/15 text-card-yellow">
            <TriangleAlert className="h-3.5 w-3.5" /> Větší změna, zkontrolujte
          </Badge>
        )}
      </label>
      <dl className="mt-3 grid gap-2 text-[0.95rem] leading-relaxed sm:grid-cols-[70px_1fr]">
        <dt className="text-sm text-muted">Název</dt>
        <dd className="font-medium">{c.titleChanged ? <DiffText parts={diffWords(c.marker.title, c.title)} /> : c.title}</dd>
        {(c.descriptionChanged || c.description) && (
          <>
            <dt className="text-sm text-muted">Popis</dt>
            <dd>{c.descriptionChanged ? <DiffText parts={diffWords(c.marker.description ?? '', c.description ?? '')} /> : c.description}</dd>
          </>
        )}
      </dl>
    </li>
  );
}
