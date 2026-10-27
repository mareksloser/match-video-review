import { useMemo, useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { useMarkerMutations, useMarkers, useMatch, useMe, useRules } from '@/app/queries';
import { ErrorNote, Spinner } from '@/components/ui';
import { defaultEngines } from '@/video/registry';
import type { Marker } from '@/lib/types';
import { PresentSetup } from './PresentSetup';
import { PresentationView } from './PresentationView';
import { loadOptions, saveOptions, type PresentationOptions } from './presentation';

export function PresentPage() {
  const { matchId } = useParams({ strict: false }) as { matchId: string };
  const id = Number(matchId);
  const me = useMe();
  const match = useMatch(id);
  const markers = useMarkers(id);
  const rules = useRules(!!me.data);
  const mutations = useMarkerMutations(id);
  const [options, setOptions] = useState<PresentationOptions>(loadOptions);
  const [playlist, setPlaylist] = useState<Marker[] | null>(null);

  const inline = useMemo(
    () => (match.data ? defaultEngines.create(match.data.videoType, match.data.videoUrl).capabilities.inlinePlayback : true),
    [match.data],
  );

  if (match.isLoading || markers.isLoading || me.isLoading) return <Spinner />;
  if (match.error || !match.data) return <ErrorNote error={match.error} />;
  if (!me.data) return <p className="text-muted">Prezentace je dostupná po přihlášení.</p>;
  const isAdmin = me.data.role === 'admin';

  if (!inline)
    return (
      <div className="mx-auto max-w-xl">
        <h1 className="font-display text-3xl font-semibold">Prezentace rozboru</h1>
        <p className="mt-2 text-muted">
          Prezentace potřebuje video, které se přehrává přímo v aplikaci. Záznam z VEO stáhněte a v úpravě zápasu ho nahrajte jako soubor.
        </p>
        <Link to="/match/$matchId/edit" params={{ matchId }} className="mt-4 inline-block font-medium text-pitch hover:underline">
          Upravit zápas
        </Link>
      </div>
    );

  const exit = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    setPlaylist(null);
  };

  return (
    <>
      <PresentSetup
        matchId={id}
        title={match.data.title}
        markers={markers.data ?? []}
        isAdmin={isAdmin}
        options={options}
        onOptionsChange={(o) => {
          setOptions(o);
          saveOptions(o);
        }}
        onStart={(selected) => {
          // Must run inside the click so the browser allows fullscreen.
          void document.documentElement.requestFullscreen?.().catch(() => undefined);
          setPlaylist(selected);
        }}
      />
      {playlist && (
        <PresentationView
          videoType={match.data.videoType}
          videoUrl={match.data.videoUrl}
          title={match.data.title}
          markers={playlist}
          rules={rules.data ?? []}
          options={options}
          onDiscussed={(m) => {
            if (isAdmin && options.autoReview && !m.reviewed) mutations.setReviewed.mutate({ id: m.id, reviewed: true });
          }}
          onExit={exit}
        />
      )}
    </>
  );
}
