import { useState } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useDeleteMatch, useMatch, useMe, useUpdateMatch } from '@/app/queries';
import { Button, ErrorNote, Panel, Spinner } from '@/components/ui';
import { MatchForm } from './MatchForm';

export function EditMatchPage() {
  const { matchId } = useParams({ strict: false }) as { matchId: string };
  const id = Number(matchId);
  const { data: me } = useMe();
  const match = useMatch(id);
  const update = useUpdateMatch(id);
  const remove = useDeleteMatch();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  if (me?.role !== 'admin') return <p className="text-muted">Zápasy upravuje trenér.</p>;
  if (match.isLoading) return <Spinner />;
  if (match.error || !match.data) return <ErrorNote error={match.error} />;
  const m = match.data;
  const back = { to: '/match/$matchId' as const, params: { matchId } };

  return (
    <div className="mx-auto max-w-2xl">
      <Link {...back} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Zpět na rozbor
      </Link>
      <h1 className="mt-3 font-display text-3xl font-semibold">Upravit zápas</h1>
      <MatchForm
        key={m.id}
        initial={m}
        submitLabel="Uložit změny"
        pending={update.isPending}
        error={update.error}
        cancelTo={back}
        onSubmit={(value) => update.mutate(value, { onSuccess: () => navigate(back) })}
      />

      <Panel className="mt-6 border-card-red/40 p-5">
        <h2 className="font-display text-lg font-semibold">Smazat zápas</h2>
        <p className="mt-1 text-sm text-muted">
          {m.markerCount > 0
            ? `Smaže se i ${m.markerCount} ${m.markerCount === 1 ? 'marker' : m.markerCount < 5 ? 'markery' : 'markerů'} včetně kreseb a záznamů o zhlédnutí. Nahrané video na úložišti zůstane.`
            : 'Nahrané video na úložišti zůstane.'}
        </p>
        {remove.error ? <div className="mt-3"><ErrorNote error={remove.error} /></div> : null}
        <div className="mt-4 flex gap-2">
          {confirming ? (
            <>
              <Button variant="danger" disabled={remove.isPending} onClick={() => remove.mutate(id, { onSuccess: () => navigate({ to: '/' }) })}>
                <Trash2 className="h-4 w-4" /> Opravdu smazat
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(false)}>Ponechat</Button>
            </>
          ) : (
            <Button variant="danger" onClick={() => setConfirming(true)}>
              <Trash2 className="h-4 w-4" /> Smazat zápas
            </Button>
          )}
        </div>
      </Panel>
    </div>
  );
}
