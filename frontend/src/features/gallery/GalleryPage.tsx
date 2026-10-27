import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useCategories, useMatches, useMe } from '@/app/queries';
import { Button, ErrorNote, Spinner } from '@/components/ui';
import { MatchTile } from './MatchTile';
import { cn } from '@/lib/cn';

export function GalleryPage() {
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const { data: me } = useMe();
  const categories = useCategories();
  const matches = useMatches(categoryId);
  const categoryName = (id: number) => categories.data?.find((c) => c.id === id)?.name ?? '';

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {me ? 'Zápasy k rozboru' : 'Videa SK Baník Libušín'}
          </h1>
          <p className="mt-1 max-w-prose text-muted">
            {me
              ? me.role === 'admin'
                ? 'Všechny zápasy klubu. Otevřete zápas a přidejte k situacím markery a kresby.'
                : me.role === 'viewer'
                  ? 'Všechny zápasy klubu včetně rozborů trenérů.'
                  : 'Zápasy vašeho týmu a veřejné sestřihy. Projděte si situace, které trenér označil.'
              : 'Veřejné sestřihy a rozbory. Týmové poznámky trenérů vidí hráči po přihlášení.'}
          </p>
        </div>
        {me?.role === 'admin' && (
          <Link to="/new">
            <Button variant="primary">
              <Plus className="h-4 w-4" /> Přidat zápas
            </Button>
          </Link>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filtr podle kategorie">
        {[{ id: null as number | null, name: 'Všechny týmy' }, ...(categories.data ?? [])].map((c) => (
          <button
            key={c.id ?? 'all'}
            onClick={() => setCategoryId(c.id)}
            aria-pressed={categoryId === c.id}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-sm transition-colors',
              categoryId === c.id ? 'border-pitch bg-pitch/15 text-ink' : 'border-line text-muted hover:text-ink',
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {matches.isLoading && <Spinner />}
        {matches.error && <ErrorNote error={matches.error} />}
        {matches.data?.length === 0 && (
          <p className="rounded-xl border border-dashed border-line p-8 text-center text-muted">
            {categoryId === null
              ? me?.role === 'admin'
                ? 'Zatím tu nejsou žádné zápasy. Přidejte první tlačítkem Přidat zápas.'
                : 'Zatím tu nejsou žádná videa.'
              : 'V této kategorii zatím nejsou žádná videa.'}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matches.data?.map((m) => (
            <MatchTile key={m.id} match={m} categoryName={categoryName(m.teamCategoryId)} signedIn={!!me} isAdmin={me?.role === 'admin'} />
          ))}
        </div>
      </div>
    </div>
  );
}
