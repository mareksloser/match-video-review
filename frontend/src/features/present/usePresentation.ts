import { useCallback, useEffect, useReducer } from 'react';
import type { Marker } from '@/lib/types';
import type { PlaybackState, VideoEngine } from '@/video/engine';
import { hasArrived, initialPresentation, leadInStart, presentationReducer } from './presentation';

interface Args {
  engine: VideoEngine;
  playback: PlaybackState;
  markers: Marker[];
  leadSeconds: number;
  /** Called once when the coach moves on from a marker that was shown (used for auto-review). */
  onDiscussed: (marker: Marker) => void;
}

/** Glue between the pure state machine and the video engine. */
export function usePresentation({ engine, playback, markers, leadSeconds, onDiscussed }: Args) {
  const [state, dispatch] = useReducer(presentationReducer, initialPresentation);
  const current = markers[state.index] ?? null;

  const goTo = useCallback(
    (index: number) => {
      const target = markers[index];
      if (!target) return;
      if (current && state.shownIds.includes(current.id) && index !== state.index) onDiscussed(current);
      const immediate = leadSeconds <= 0;
      dispatch({ type: 'goto', index, immediate });
      if (immediate) {
        engine.pause();
        engine.seek(target.timestampSeconds);
        dispatch({ type: 'arrived', markerId: target.id });
      } else {
        engine.seek(leadInStart(target.timestampSeconds, leadSeconds));
        engine.play();
      }
    },
    [markers, current, state.shownIds, state.index, leadSeconds, engine, onDiscussed],
  );

  const next = useCallback(() => {
    if (state.phase === 'done') return;
    if (state.index + 1 < markers.length) {
      goTo(state.index + 1);
      return;
    }
    if (current && state.shownIds.includes(current.id)) onDiscussed(current);
    engine.pause();
    dispatch({ type: 'finish' });
  }, [state, markers.length, current, goTo, engine, onDiscussed]);

  const prev = useCallback(() => goTo(Math.max(0, state.phase === 'done' ? markers.length - 1 : state.index - 1)), [goTo, state, markers.length]);
  const replay = useCallback(() => goTo(state.index), [goTo, state.index]);

  /** Space: in hold → continue playing past the moment; otherwise ordinary play/pause. */
  const togglePlay = useCallback(() => {
    if (state.phase === 'done') return;
    if (state.phase === 'hold') dispatch({ type: 'release' });
    if (engine.getState().paused) engine.play();
    else engine.pause();
  }, [state.phase, engine]);

  // Stop exactly on the marker when the run-up reaches it.
  useEffect(() => {
    if (current && hasArrived(state.phase, playback.currentTime, current.timestampSeconds)) {
      engine.pause();
      engine.seek(current.timestampSeconds);
      dispatch({ type: 'arrived', markerId: current.id });
    }
  }, [playback.currentTime, state.phase, current, engine]);

  return { ...state, current, goTo, next, prev, replay, togglePlay };
}
