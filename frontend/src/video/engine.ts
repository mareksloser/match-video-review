/**
 * Video Engine Adapter contract. Every video source (HTML5 file, VEO, YouTube,
 * the offline demo…) implements this interface; UI code only talks to it.
 */
export interface PlaybackState {
  ready: boolean;
  paused: boolean;
  currentTime: number;
  duration: number;
  rate: number;
  aspect: number; // width / height of the picture
  error: string | null;
}

export interface EngineCapabilities {
  /** Plays inside the app (false = only deep links to an external player, e.g. VEO). */
  inlinePlayback: boolean;
  /** Precise stepping by single frames. */
  frameStep: boolean;
  /** Tactical drawings can be aligned over the picture. */
  overlay: boolean;
}

export interface VideoEngine {
  readonly kind: string;
  readonly capabilities: EngineCapabilities;
  mount(container: HTMLElement): void;
  destroy(): void;
  play(): void;
  pause(): void;
  seek(seconds: number): void;
  setRate(rate: number): void;
  getState(): PlaybackState;
  subscribe(listener: () => void): () => void;
  /** Link that opens the source at a time in its own player, when that makes sense. */
  deepLink(seconds: number): string | null;
}

export const initialPlaybackState: PlaybackState = {
  ready: false,
  paused: true,
  currentTime: 0,
  duration: 0,
  rate: 1,
  aspect: 16 / 9,
  error: null,
};

/** Shared observable state handling. Subclasses only call `update`. */
export abstract class BaseEngine implements VideoEngine {
  abstract readonly kind: string;
  abstract readonly capabilities: EngineCapabilities;
  protected state: PlaybackState = initialPlaybackState;
  private listeners = new Set<() => void>();

  abstract mount(container: HTMLElement): void;
  abstract destroy(): void;
  abstract play(): void;
  abstract pause(): void;
  abstract seek(seconds: number): void;
  abstract setRate(rate: number): void;

  getState = () => this.state;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  deepLink(_seconds: number): string | null {
    return null;
  }

  protected update(partial: Partial<PlaybackState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((l) => l());
  }

  protected clampTime(seconds: number) {
    const max = this.state.duration || Number.POSITIVE_INFINITY;
    return Math.min(Math.max(0, seconds), max);
  }
}
