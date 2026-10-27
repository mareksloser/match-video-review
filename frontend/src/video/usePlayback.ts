import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { VideoEngine } from './engine';
import { defaultEngines, type EngineRegistry } from './registry';

/** Creates the engine for a source and exposes its state as React state. */
export function useVideoEngine(type: string, url: string, registry: EngineRegistry = defaultEngines) {
  const engine = useMemo(() => registry.create(type, url), [registry, type, url]);
  const state = useSyncExternalStore(engine.subscribe, engine.getState);
  return { engine, state };
}

/** Attaches the engine's DOM to a host element for the lifetime of the component. */
export function useEngineMount(engine: VideoEngine, host: HTMLElement | null) {
  useEffect(() => {
    if (!host) return;
    engine.mount(host);
    return () => engine.destroy();
  }, [engine, host]);
}
