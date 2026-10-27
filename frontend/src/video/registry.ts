import type { VideoEngine } from './engine';
import { Html5Engine } from './Html5Engine';
import { VeoEngine } from './VeoEngine';
import { YouTubeEngine } from './YouTubeEngine';
import { DemoEngine } from './DemoEngine';

export type EngineFactory = (url: string) => VideoEngine;

/**
 * Maps `matches.video_type` to an engine. Adding Vimeo or Hudl = one `register` call;
 * no player UI changes needed.
 */
export class EngineRegistry {
  private factories = new Map<string, EngineFactory>();

  register(type: string, factory: EngineFactory): this {
    this.factories.set(type, factory);
    return this;
  }

  supports(type: string) {
    return this.factories.has(type);
  }

  create(type: string, url: string): VideoEngine {
    const factory = this.factories.get(type) ?? this.factories.get('other');
    if (!factory) throw new Error(`No video engine registered for "${type}"`);
    return factory(url);
  }
}

export const defaultEngines = new EngineRegistry()
  .register('ftp', (url) => new Html5Engine(url))
  .register('other', (url) => new Html5Engine(url))
  .register('veo', (url) => new VeoEngine(url))
  .register('youtube', (url) => new YouTubeEngine(url))
  .register('demo', () => new DemoEngine());
