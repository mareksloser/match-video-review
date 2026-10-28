/** Tiny synthesized sound effects. One shared AudioContext (browsers cap how many may exist). */
let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx ??= new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

type Tone = { type: OscillatorType; from: number; to: number; ramp: 'exp' | 'lin'; gain: number; duration: number };

const TONES: Record<'kick' | 'goal' | 'save', Tone> = {
  kick: { type: 'triangle', from: 120, to: 40, ramp: 'exp', gain: 0.5, duration: 0.15 },
  goal: { type: 'sine', from: 400, to: 800, ramp: 'exp', gain: 0.3, duration: 0.3 },
  save: { type: 'sawtooth', from: 200, to: 80, ramp: 'lin', gain: 0.25, duration: 0.25 },
};

export function playTone(name: keyof typeof TONES) {
  const ac = context();
  if (!ac) return;
  const t = TONES[name];
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = t.type;
  const now = ac.currentTime;
  osc.frequency.setValueAtTime(t.from, now);
  if (t.ramp === 'exp') osc.frequency.exponentialRampToValueAtTime(t.to, now + t.duration);
  else osc.frequency.linearRampToValueAtTime(t.to, now + t.duration);
  gain.gain.setValueAtTime(t.gain, now);
  gain.gain.linearRampToValueAtTime(0.001, now + t.duration);
  osc.start(now);
  osc.stop(now + t.duration);
}
