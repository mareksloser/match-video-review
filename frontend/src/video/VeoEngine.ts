import { buildVeoUrl, extractVeoTime } from '@/lib/time';
import { BaseEngine } from './engine';

/**
 * VEO does not allow its player to be embedded or controlled, so this adapter
 * keeps a "virtual" playhead and turns every seek into a VEO deep link
 * (https://app.veo.co/matches/…/#t=mm:ss). For drawings over the picture,
 * download the recording from VEO and attach it as a file.
 */
export class VeoEngine extends BaseEngine {
  readonly kind = 'veo';
  readonly capabilities = { inlinePlayback: false, frameStep: false, overlay: false };

  constructor(private readonly url: string) {
    super();
    this.state = { ...this.state, ready: true, currentTime: extractVeoTime(url) ?? 0 };
  }

  mount() {}
  destroy() {}
  play() {}
  pause() {}
  setRate() {}
  seek(seconds: number) {
    this.update({ currentTime: Math.max(0, seconds) });
  }
  override deepLink(seconds: number) {
    return buildVeoUrl(this.url, seconds);
  }
}
