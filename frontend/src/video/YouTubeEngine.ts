import { youtubeId } from '@/lib/time';
import { BaseEngine } from './engine';

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(s: number, allowSeekAhead: boolean): void;
  setPlaybackRate(r: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  destroy(): void;
}
declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, opts: unknown) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;
function loadApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  apiPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => reject(new Error('YouTube API blocked'));
    window.onYouTubeIframeAPIReady = () => resolve();
    document.head.appendChild(s);
  });
  return apiPromise;
}

export class YouTubeEngine extends BaseEngine {
  readonly kind = 'youtube';
  readonly capabilities = { inlinePlayback: true, frameStep: false, overlay: true };
  private player: YTPlayer | null = null;
  private poll: number | undefined;

  constructor(private readonly url: string) {
    super();
  }

  mount(container: HTMLElement) {
    const id = youtubeId(this.url);
    if (!id) {
      this.update({ error: 'Odkaz neobsahuje ID YouTube videa.' });
      return;
    }
    const host = document.createElement('div');
    host.className = 'h-full w-full';
    container.appendChild(host);
    loadApi()
      .then(() => {
        this.player = new window.YT!.Player(host, {
          videoId: id,
          width: '100%',
          height: '100%',
          playerVars: { controls: 0, rel: 0, modestbranding: 1, playsinline: 1 },
          events: { onReady: () => this.update({ ready: true, duration: this.player!.getDuration() }) },
        });
        this.poll = window.setInterval(() => {
          if (!this.player?.getCurrentTime) return;
          this.update({ currentTime: this.player.getCurrentTime(), paused: this.player.getPlayerState() !== 1 });
        }, 250);
      })
      .catch(() => this.update({ error: 'YouTube přehrávač se nepodařilo načíst.' }));
  }

  destroy() {
    window.clearInterval(this.poll);
    this.player?.destroy();
  }
  play() {
    this.player?.playVideo();
  }
  pause() {
    this.player?.pauseVideo();
  }
  seek(seconds: number) {
    this.player?.seekTo(this.clampTime(seconds), true);
    this.update({ currentTime: this.clampTime(seconds) });
  }
  setRate(rate: number) {
    this.player?.setPlaybackRate(rate);
    this.update({ rate });
  }
}
