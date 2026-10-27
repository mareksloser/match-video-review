/**
 * Presentation flow as a pure state machine (no video, no DOM) — easy to unit test.
 *
 *   leadIn ──(playhead reaches the marker)──▶ hold ──(space)──▶ free
 *     ▲                                         │
 *     └──────────── goto / next / prev ─────────┘           last next ▶ done
 *
 * leadIn: video plays the run-up to the situation, no drawing
 * hold:   paused exactly on the marker, drawing + notes visible — the coach talks
 * free:   coach plays/pauses freely after the moment
 */
export type Phase = 'leadIn' | 'hold' | 'free' | 'done';

export interface PresentationState {
  index: number;
  phase: Phase;
  /** Markers that reached "hold" at least once — those count as discussed. */
  shownIds: number[];
}

export type PresentationAction =
  | { type: 'goto'; index: number; immediate: boolean }
  | { type: 'arrived'; markerId: number }
  | { type: 'release' }
  | { type: 'finish' };

export const initialPresentation: PresentationState = { index: 0, phase: 'leadIn', shownIds: [] };

export function presentationReducer(state: PresentationState, action: PresentationAction): PresentationState {
  switch (action.type) {
    case 'goto':
      return { ...state, index: action.index, phase: action.immediate ? 'hold' : 'leadIn' };
    case 'arrived':
      return {
        ...state,
        phase: 'hold',
        shownIds: state.shownIds.includes(action.markerId) ? state.shownIds : [...state.shownIds, action.markerId],
      };
    case 'release':
      return state.phase === 'hold' ? { ...state, phase: 'free' } : state;
    case 'finish':
      return { ...state, phase: 'done' };
  }
}

/** Where playback starts for a marker: `lead` seconds earlier, never before 0. */
export const leadInStart = (markerTime: number, lead: number) => Math.max(0, markerTime - lead);

/** True when the run-up has reached the marker and the video should stop on it. */
export const hasArrived = (phase: Phase, currentTime: number, markerTime: number) =>
  phase === 'leadIn' && currentTime >= markerTime - 0.05;

export interface PresentationOptions {
  leadSeconds: number;
  autoReview: boolean;
  showNotes: boolean;
}

export const defaultOptions: PresentationOptions = { leadSeconds: 5, autoReview: true, showNotes: true };

const OPTIONS_KEY = 'mvr-present-options';

export function loadOptions(): PresentationOptions {
  try {
    return { ...defaultOptions, ...JSON.parse(localStorage.getItem(OPTIONS_KEY) ?? '{}') };
  } catch {
    return defaultOptions;
  }
}

export function saveOptions(options: PresentationOptions) {
  try {
    localStorage.setItem(OPTIONS_KEY, JSON.stringify(options));
  } catch {
    /* storage unavailable: options just aren't remembered */
  }
}
