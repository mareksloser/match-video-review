import { BaseEngine } from './engine';

/** MP4 / WebM from FTP, S3, local storage or a local file (blob URL). */
export class Html5Engine extends BaseEngine {
  readonly kind = 'html5';
  readonly capabilities = { inlinePlayback: true, frameStep: true, overlay: true };
  private video: HTMLVideoElement | null = null;
  /** A seek requested before metadata loaded would be dropped by the browser — apply it later. */
  private pendingSeek: number | null = null;

  constructor(private readonly src: string) {
    super();
  }

  mount(container: HTMLElement) {
    const v = document.createElement('video');
    v.src = this.src;
    v.preload = 'metadata';
    v.playsInline = true;
    v.className = 'h-full w-full object-contain bg-black';
    const sync = () =>
      this.update({
        currentTime: v.currentTime,
        duration: Number.isFinite(v.duration) ? v.duration : 0,
        paused: v.paused,
        rate: v.playbackRate,
      });
    v.addEventListener('loadedmetadata', () => {
      this.update({ ready: true, aspect: v.videoWidth && v.videoHeight ? v.videoWidth / v.videoHeight : 16 / 9 });
      if (this.pendingSeek !== null) {
        v.currentTime = Math.min(this.pendingSeek, v.duration || this.pendingSeek);
        this.pendingSeek = null;
      }
      sync();
    });
    ['timeupdate', 'play', 'pause', 'seeked', 'ratechange', 'durationchange'].forEach((e) => v.addEventListener(e, sync));
    v.addEventListener('error', () => this.update({ error: 'Video se nepodařilo načíst. Zkontrolujte adresu souboru.' }));
    container.appendChild(v);
    this.video = v;
  }

  destroy() {
    this.video?.pause();
    this.video?.remove();
    this.video = null;
  }

  play() {
    void this.video?.play().catch(() => undefined);
  }
  pause() {
    this.video?.pause();
  }
  seek(seconds: number) {
    const t = this.clampTime(seconds);
    if (this.video && this.video.readyState >= HTMLMediaElement.HAVE_METADATA) this.video.currentTime = t;
    else this.pendingSeek = t;
    this.update({ currentTime: t });
  }
  setRate(rate: number) {
    if (this.video) this.video.playbackRate = rate;
  }
}
