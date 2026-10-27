import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useCreateMatch, useMe } from '@/app/queries';
import { MatchForm } from './MatchForm';

export function NewMatchPage() {
  const { data: me } = useMe();
  const create = useCreateMatch();
  const navigate = useNavigate();

  if (me?.role !== 'admin') return <p className="text-muted">Zápasy přidává trenér.</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Zpět na zápasy
      </Link>
      <h1 className="mt-3 font-display text-3xl font-semibold">Přidat zápas</h1>
      <MatchForm
        initial={null}
        submitLabel="Přidat zápas"
        pending={create.isPending}
        error={create.error}
        cancelTo={{ to: '/' }}
        onSubmit={(value) =>
          create.mutate(value, { onSuccess: (m) => navigate({ to: '/match/$matchId', params: { matchId: String(m.id) } }) })
        }
      />
    </div>
  );
}
