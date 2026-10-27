import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { ArrowLeft, Plus } from 'lucide-react';
import { useCategories, useMarkerMutations, useMarkers, useMatch, useMe, useRules } from '@/app/queries';
import { Button, ErrorNote, Panel, Spinner } from '@/components/ui';
import { useVideoEngine } from '@/video/usePlayback';
import { useDrawingEditor } from '@/canvas/useDrawingEditor';
import { activeMarkerIndex, formatTime } from '@/lib/time';
import { formatDate } from '@/lib/labels';
import type { Marker, MarkerInput, Match, Rule, User } from '@/lib/types';
import { VideoStage } from './VideoStage';
import { PlayerControls } from './PlayerControls';
import { MarkerTimeline } from './MarkerTimeline';
import { MarkerList } from './MarkerList';
import { MarkerDetail } from './MarkerDetail';
import { MarkerForm } from './MarkerForm';
import { DrawingToolbar } from './DrawingToolbar';

export function MatchReviewPage() {
  const { matchId } = useParams({ strict: false }) as { matchId: string };
  const id = Number(matchId);
  const me = useMe();
  const match = useMatch(id);
  const markers = useMarkers(id);
  const rules = useRules(!!me.data);

  if (match.isLoading || markers.isLoading || me.isLoading) return <Spinner />;
  if (match.error) return <ErrorNote error={match.error} />;
  if (!match.data) return null;
  return <ReviewWorkspace key={id} match={match.data} markers={markers.data ?? []} rules={rules.data ?? []} me={me.data ?? null} />;
}

type Mode = { kind: 'view' } | { kind: 'draw' } | { kind: 'create' } | { kind: 'edit' };

const DRAWING_WINDOW = 3; // seconds after a marker during which its drawing stays on screen

function ReviewWorkspace({ match, markers, rules, me }: { match: Match; markers: Marker[]; rules: Rule[]; me: User | null }) {
  const isAdmin = me?.role === 'admin';
  const { engine, state } = useVideoEngine(match.videoType, match.videoUrl);
  const mutations = useMarkerMutations(match.id);
  const categories = useCategories();
  const editor = useDrawingEditor([]);
  const frameRef = useRef<HTMLDivElement>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: 'view' });
  const [overlayOn, setOverlayOn] = useState(true);
  const [autoStop, setAutoStop] = useState(false);

  const selected = markers.find((m) => m.id === selectedId) ?? null;
  const lastMarker = markers.at(-1)?.timestampSeconds ?? 0;
  const duration = state.duration || Math.max(45 * 60, lastMarker + 120);
  const times = useMemo(() => markers.map((m) => m.timestampSeconds), [markers]);
  const activeIdx = activeMarkerIndex(times, state.currentTime);
  const active = activeIdx >= 0 ? markers[activeIdx] : null;

  // Drawing shown on the video: the editor while drawing, otherwise the marker currently on screen.
  const shownShapes = useMemo(() => {
    if (!overlayOn) return [];
    const near = (m: Marker | null) => m && state.currentTime >= m.timestampSeconds - 0.3 && state.currentTime - m.timestampSeconds <= DRAWING_WINDOW;
    const source = near(selected) ? selected : near(active) ? active : null;
    return source?.drawing?.shapes ?? [];
  }, [overlayOn, selected, active, state.currentTime]);

  const select = (m: Marker) => {
    if (mode.kind !== 'view') return;
    setSelectedId(m.id);
    engine.pause();
    engine.seek(m.timestampSeconds);
    if (me && !isAdmin && !m.viewedByMe) mutations.markViewed.mutate(m.id);
  };

  // Optional: stop playback when the playhead crosses a marker
  const prevTime = useRef(state.currentTime);
  useEffect(() => {
    const prev = prevTime.current;
    prevTime.current = state.currentTime;
    if (!autoStop || state.paused || state.currentTime < prev) return;
    const crossed = markers.find((m) => m.timestampSeconds > prev && m.timestampSeconds <= state.currentTime);
    if (crossed) select(crossed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentTime]);

  // Keyboard: space play/pause, arrows ±5 s, comma/period ±0.1 s
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable) return;
      const s = engine.getState();
      if (e.key === ' ') {
        e.preventDefault();
        if (s.paused) engine.play();
        else engine.pause();
      } else if (e.key === 'ArrowLeft') engine.seek(s.currentTime - 5);
      else if (e.key === 'ArrowRight') engine.seek(s.currentTime + 5);
      else if (e.key === ',') (engine.pause(), engine.seek(s.currentTime - 0.1));
      else if (e.key === '.') (engine.pause(), engine.seek(s.currentTime + 0.1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [engine]);

  const startDrawing = () => {
    if (!selected) return;
    engine.pause();
    engine.seek(selected.timestampSeconds);
    editor.reset(selected.drawing?.shapes ?? []);
    setOverlayOn(true);
    setMode({ kind: 'draw' });
  };

  const saveDrawing = () => {
    if (!selected) return;
    mutations.saveDrawing.mutate(
      { id: selected.id, drawing: { version: 1, shapes: editor.shapes } },
      { onSuccess: () => setMode({ kind: 'view' }) },
    );
  };

  const submitMarker = (input: MarkerInput) => {
    if (mode.kind === 'edit' && selected) {
      mutations.update.mutate({ id: selected.id, input }, { onSuccess: () => setMode({ kind: 'view' }) });
    } else {
      mutations.create.mutate(input, {
        onSuccess: (m) => {
          setSelectedId(m.id);
          setMode({ kind: 'view' });
        },
      });
    }
  };

  const fullscreen = () => {
    void frameRef.current?.requestFullscreen?.().catch(() => undefined);
  };

  const category = categories.data?.find((c) => c.id === match.teamCategoryId)?.name;
  const reviewed = markers.filter((m) => m.reviewed).length;

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Zápasy
          </Link>
          <h1 className="mt-1 font-display text-2xl font-semibold leading-tight md:text-3xl">{match.title}</h1>
          <p className="text-sm text-muted">
            {formatDate(match.matchDate)}
            {category && <>, {category}</>}
          </p>
        </div>
        {me && markers.length > 0 && (
          <p className="text-sm text-muted">
            {isAdmin ? (
              <>Probráno s týmem <span className="tabular font-medium text-ink">{reviewed} z {markers.length}</span></>
            ) : (
              <>Zhlédnuto <span className="tabular font-medium text-ink">{markers.filter((m) => m.viewedByMe).length} z {markers.length}</span></>
            )}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <div ref={frameRef} className="overflow-hidden rounded-xl border border-line bg-[rgb(var(--chalk))]">
            {mode.kind === 'draw' && (
              <DrawingToolbar editor={editor} saving={mutations.saveDrawing.isPending} onSave={saveDrawing} onCancel={() => setMode({ kind: 'view' })} />
            )}
            <VideoStage
              engine={engine}
              state={state}
              shapes={shownShapes}
              editor={mode.kind === 'draw' ? editor : null}
              badge={mode.kind === 'draw' ? 'Kreslení' : match.videoType === 'demo' ? 'Ukázkový záznam' : null}
            />
            <PlayerControls
              engine={engine}
              state={state}
              duration={duration}
              overlayOn={overlayOn}
              onOverlayChange={setOverlayOn}
              autoStop={autoStop}
              onAutoStopChange={setAutoStop}
              onFullscreen={fullscreen}
            />
            {me && <MarkerTimeline markers={markers} duration={duration} currentTime={state.currentTime} selectedId={selectedId} onSelect={select} onSeek={(t) => engine.seek(t)} />}
          </div>
          {!me && (
            <p className="mt-4 rounded-lg border border-line bg-panel p-4 text-sm text-muted">
              Markery, kresby a poznámky trenéra vidí jen hráči týmu.{' '}
              <Link to="/login" className="font-medium text-pitch hover:underline">Přihlaste se</Link> a projděte si rozbor.
            </p>
          )}
        </div>

        {me && (
          <aside className="flex flex-col gap-4">
            <Panel>
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <h2 className="font-display text-lg font-semibold">Situace</h2>
                {isAdmin && mode.kind === 'view' && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      engine.pause();
                      setMode({ kind: 'create' });
                    }}
                  >
                    <Plus className="h-4 w-4" /> Marker v {formatTime(state.currentTime)}
                  </Button>
                )}
              </div>
              <div className="max-h-[440px] overflow-y-auto">
                <MarkerList
                  markers={markers}
                  rules={rules}
                  selectedId={selectedId}
                  activeId={active?.id ?? null}
                  isAdmin={isAdmin}
                  onSelect={select}
                  onReviewedChange={(m, reviewedNow) => mutations.setReviewed.mutate({ id: m.id, reviewed: reviewedNow })}
                />
              </div>
            </Panel>

            {(mode.kind === 'create' || mode.kind === 'edit') && (
              <Panel>
                <h2 className="border-b border-line px-4 py-3 font-display text-lg font-semibold">
                  {mode.kind === 'create' ? 'Nový marker' : 'Upravit marker'}
                </h2>
                <MarkerForm
                  key={mode.kind + (selected?.id ?? '')}
                  initial={
                    mode.kind === 'edit' && selected
                      ? selected
                      : { timestampSeconds: Math.floor(state.currentTime), kind: 'tactic', title: '', description: null, ruleId: null, ruleLink: null }
                  }
                  rules={rules}
                  currentTime={state.currentTime}
                  submitLabel={mode.kind === 'create' ? 'Přidat marker' : 'Uložit změny'}
                  pending={mutations.create.isPending || mutations.update.isPending}
                  onSubmit={submitMarker}
                  onCancel={() => setMode({ kind: 'view' })}
                />
              </Panel>
            )}

            {mode.kind === 'draw' && (
              <Panel className="p-4 text-sm text-muted">
                Kreslete přímo do obrazu. Souřadnice se ukládají poměrově, takže kresba sedí na každé velikosti přehrávače.
              </Panel>
            )}

            {mode.kind === 'view' && selected && (
              <Panel>
                <MarkerDetail
                  marker={selected}
                  rules={rules}
                  isAdmin={isAdmin}
                  canDraw={engine.capabilities.overlay}
                  deepLink={engine.deepLink(selected.timestampSeconds)}
                  onPlay={() => {
                    engine.seek(Math.max(0, selected.timestampSeconds - 3));
                    engine.play();
                  }}
                  onDraw={startDrawing}
                  onEdit={() => setMode({ kind: 'edit' })}
                  onDelete={() => mutations.remove.mutate(selected.id, { onSuccess: () => setSelectedId(null) })}
                />
              </Panel>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
