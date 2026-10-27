import { useState } from 'react';
import { Check } from 'lucide-react';
import { useAnalytics, useMatches, useMe } from '@/app/queries';
import { ErrorNote, Field, Panel, Select, Spinner } from '@/components/ui';
import { formatTime } from '@/lib/time';

export function AnalyticsPage() {
  const { data: me } = useMe();
  const matches = useMatches(null);
  const [matchId, setMatchId] = useState<number | null>(null);
  const withMarkers = matches.data?.filter((m) => m.markerCount > 0) ?? [];
  const current = matchId ?? withMarkers[0]?.id ?? null;
  const analytics = useAnalytics(me?.role === 'admin' ? current : null);

  if (me?.role !== 'admin') return <p className="text-muted">Přehled zhlédnutí vidí jen trenér.</p>;

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-display text-3xl font-semibold">Kdo si rozbor prošel</h1>
      <p className="mt-1 max-w-prose text-muted">Které situace si hráči z domova pustili. Hodí se před společným rozborem v kabině.</p>

      <Field label="Zápas" className="mt-5 max-w-md">
        <Select value={current ?? ''} onChange={(e) => setMatchId(Number(e.target.value))}>
          {withMarkers.map((m) => (
            <option key={m.id} value={m.id}>{m.title}</option>
          ))}
        </Select>
      </Field>

      {analytics.isLoading && <div className="mt-6"><Spinner /></div>}
      {analytics.error && <div className="mt-6"><ErrorNote error={analytics.error} /></div>}
      {analytics.data && (
        <Panel className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="sticky left-0 bg-panel px-4 py-3 font-medium">Hráč</th>
                {analytics.data.markers.map((m) => (
                  <th key={m.id} className="px-2 py-3 text-center font-normal text-muted" title={m.title}>
                    <span className="tabular font-display text-base text-ink">{formatTime(m.timestampSeconds)}</span>
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-medium">Zhlédnuto</th>
              </tr>
            </thead>
            <tbody>
              {analytics.data.players.map((p) => {
                const count = p.viewedMarkerIds.length;
                const total = analytics.data!.markers.length;
                return (
                  <tr key={p.id} className="border-b border-line last:border-0">
                    <td className="sticky left-0 bg-panel px-4 py-2.5 font-medium">{p.name}</td>
                    {analytics.data!.markers.map((m) => (
                      <td key={m.id} className="px-2 py-2.5 text-center">
                        {p.viewedMarkerIds.includes(m.id) ? (
                          <Check className="mx-auto h-4 w-4 text-pitch" aria-label="Zhlédnuto" />
                        ) : (
                          <span className="text-muted/50" aria-label="Nezhlédnuto">–</span>
                        )}
                      </td>
                    ))}
                    <td className="tabular px-4 py-2.5 text-right">
                      <span className={count === total ? 'font-semibold text-pitch' : count === 0 ? 'text-card-red' : ''}>
                        {count} z {total}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {analytics.data.players.length === 0 && <p className="p-4 text-muted">V tomto týmu nejsou žádní hráči s účtem.</p>}
        </Panel>
      )}
    </div>
  );
}
