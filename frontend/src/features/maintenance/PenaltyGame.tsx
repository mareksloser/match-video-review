import { useEffect, useRef, useState } from 'react';
import { Flame, RotateCcw, Target, Trophy, Volume2, VolumeX } from 'lucide-react';
import { Panel } from '@/components/ui';
import { cn } from '@/lib/cn';
import { applyShot, emptyScore, pickKeeperZone, ZONES, type Score, type Zone } from './penalty';
import { playTone } from './sound';

const SHOT_MS = 650;
const RESULT_MS = 1300;
const STORAGE = { best: 'mvr-penalty-best', sound: 'mvr-penalty-sound' };

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode: just not remembered */
  }
};

type Phase = { kind: 'ready' } | { kind: 'shooting'; target: Zone; keeper: Zone } | { kind: 'result'; target: Zone; keeper: Zone; goal: boolean };

/** Penalty shoot-out to pass the time while the app is in maintenance. */
export function PenaltyGame() {
  const [score, setScore] = useState<Score>(() => ({ ...emptyScore, best: Number(read(STORAGE.best)) || 0 }));
  const [phase, setPhase] = useState<Phase>({ kind: 'ready' });
  const [sound, setSound] = useState(() => read(STORAGE.sound) !== 'off');
  const history = useRef<string[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => write(STORAGE.best, String(score.best)), [score.best]);

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  const tone = (name: Parameters<typeof playTone>[0]) => sound && playTone(name);

  const shoot = (target: Zone) => {
    if (phase.kind === 'shooting') return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const keeper = pickKeeperZone(history.current);
    history.current = [...history.current, target.id].slice(-20);
    setPhase({ kind: 'shooting', target, keeper });
    tone('kick');
    later(() => {
      const goal = keeper.id !== target.id;
      setScore((s) => applyShot(s, goal));
      setPhase({ kind: 'result', target, keeper, goal });
      tone(goal ? 'goal' : 'save');
      later(() => setPhase({ kind: 'ready' }), RESULT_MS);
    }, SHOT_MS);
  };

  const reset = () => {
    timers.current.forEach(clearTimeout);
    history.current = [];
    setScore((s) => ({ ...emptyScore, best: s.best }));
    setPhase({ kind: 'ready' });
  };

  const toggleSound = () => {
    write(STORAGE.sound, sound ? 'off' : 'on');
    setSound(!sound);
  };

  const keeper = phase.kind === 'ready' ? { x: 50, y: 66 } : phase.keeper;
  const ball = phase.kind === 'ready' ? null : phase.target;
  const accuracy = score.shots ? Math.round((score.goals / score.shots) * 100) : 0;

  return (
    <Panel className="overflow-hidden text-left">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line px-4 py-3">
        <h2 className="mr-auto font-display text-lg font-semibold">Zkraťte si čekání penaltou</h2>
        <Stat icon={<Flame className="h-4 w-4" />} label="Série" value={score.streak} highlight={score.streak >= 3} />
        <Stat icon={<Trophy className="h-4 w-4" />} label="Rekord" value={score.best} />
        <Stat icon={<Target className="h-4 w-4" />} label="Úspěšnost" value={`${accuracy} %`} />
        <div className="flex gap-1">
          <IconButton onClick={toggleSound} label={sound ? 'Vypnout zvuky' : 'Zapnout zvuky'}>
            {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </IconButton>
          <IconButton onClick={reset} label="Vynulovat skóre">
            <RotateCcw className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      {/* Scene: same night-stadium look as the demo recording */}
      <div className="relative aspect-[16/10] overflow-hidden bg-[rgb(var(--chalk))] sm:aspect-[16/9]">
        <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-[#05080f] to-[#121a26]" aria-hidden="true">
          <div className="absolute -left-10 top-0 h-40 w-64 rounded-full bg-[radial-gradient(closest-side,rgba(255,250,230,0.35),transparent)]" />
          <div className="absolute -right-10 top-0 h-40 w-64 rounded-full bg-[radial-gradient(closest-side,rgba(255,250,230,0.35),transparent)]" />
        </div>
        <div
          className="absolute inset-x-0 bottom-0 h-[68%]"
          style={{ background: 'repeating-linear-gradient(90deg, #2f6e2c 0 8%, #357a31 8% 16%)' }}
          aria-hidden="true"
        >
          <div className="absolute bottom-0 left-1/2 h-full w-[86%] -translate-x-1/2 border-x-2 border-t-2 border-white/40" />
          <div className="absolute bottom-[9%] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-white/85" />
        </div>

        {/* Goal */}
        <div className="absolute bottom-[22%] left-1/2 h-[56%] w-[76%] -translate-x-1/2 rounded-t-sm border-x-[6px] border-t-[6px] border-white shadow-2xl">
          <div
            className="absolute inset-0 opacity-25"
            style={{ backgroundImage: 'linear-gradient(to right,#fff 1px,transparent 1px),linear-gradient(to bottom,#fff 1px,transparent 1px)', backgroundSize: '14px 14px' }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 z-20 grid grid-cols-3 grid-rows-2 gap-1.5 p-1.5" role="group" aria-label="Kam vystřelit">
            {ZONES.map((z) => (
              <button
                key={z.id}
                onClick={() => shoot(z)}
                disabled={phase.kind === 'shooting'}
                aria-label={z.label}
                className="group grid place-items-center rounded-md border-2 border-dashed border-white/15 transition-colors hover:border-white/70 hover:bg-white/10 focus-visible:border-white focus-visible:outline-none disabled:cursor-default disabled:hover:border-white/15 disabled:hover:bg-transparent"
              >
                <span className="rounded bg-black/70 px-2 py-0.5 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 group-disabled:opacity-0">
                  {z.label}
                </span>
              </button>
            ))}
          </div>
          <div
            className="pointer-events-none absolute z-10 h-[46%] w-[15%] -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-out"
            style={{ left: `${keeper.x}%`, top: `${keeper.y}%` }}
            aria-hidden="true"
          >
            <Keeper diving={phase.kind !== 'ready'} side={keeper.x < 40 ? -1 : keeper.x > 60 ? 1 : 0} />
          </div>
        </div>

        {/* Ball: flies from the spot into the chosen zone (coordinates mapped from the goal box to the scene) */}
        <div
          className={cn(
            'pointer-events-none absolute z-30 h-7 w-7 -translate-x-1/2 -translate-y-1/2 sm:h-9 sm:w-9',
            ball ? 'scale-75 transition-all duration-[650ms] ease-out' : 'transition-none',
          )}
          style={ball ? { left: `${12 + ball.x * 0.76}%`, top: `${22 + ball.y * 0.56}%`, rotate: '540deg' } : { left: '50%', top: '91%' }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-xl">
            <circle cx="50" cy="50" r="46" fill="#fff" stroke="#1e293b" strokeWidth="4" />
            <polygon points="50,30 35,42 40,60 60,60 65,42" fill="#0f172a" />
            <polygon points="50,8 35,18 20,12 25,2 45,2" fill="#0f172a" />
            <polygon points="90,40 80,28 85,12 98,18 98,35" fill="#0f172a" />
            <polygon points="10,40 20,28 15,12 2,18 2,35" fill="#0f172a" />
          </svg>
        </div>

        {/* Result: a short call that never blocks the goal */}
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 top-[6%] z-40 flex justify-center transition-all duration-300',
            phase.kind === 'result' ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0',
          )}
          role="status"
          aria-live="polite"
        >
          {phase.kind === 'result' && (
            <span
              className={cn(
                'rounded-lg px-5 py-2 text-center font-display text-3xl font-bold uppercase tracking-wide shadow-xl sm:text-4xl',
                phase.goal ? 'bg-pitch text-pitch-ink' : 'bg-card-red text-white',
              )}
            >
              {phase.goal ? (score.streak >= 3 ? `Gól! Série ${score.streak}` : 'Gól!') : 'Chyceno!'}
            </span>
          )}
        </div>
      </div>

      <p className="border-t border-line px-4 py-2.5 text-sm text-muted">
        Klikněte do branky, kam chcete vystřelit. Brankář si pamatuje, kam střílíte, takže to střídejte.
      </p>
    </Panel>
  );
}

function Stat({ icon, label, value, highlight = false }: { icon: React.ReactNode; label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <span className={cn('text-muted', highlight && 'text-pitch')}>{icon}</span>
      <span className="text-muted">{label}</span>
      <span className={cn('tabular font-display text-lg font-semibold', highlight && 'text-pitch')}>{value}</span>
    </div>
  );
}

function IconButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-raised hover:text-ink">
      {children}
    </button>
  );
}

/** Goalkeeper in the club's yellow GK kit; leans into the dive. */
function Keeper({ diving, side }: { diving: boolean; side: -1 | 0 | 1 }) {
  return (
    <svg
      viewBox="0 0 100 120"
      className="h-full w-full drop-shadow-lg transition-transform duration-500"
      style={{ transform: diving && side !== 0 ? `rotate(${side * 35}deg)` : undefined }}
    >
      <ellipse cx="50" cy="55" rx="22" ry="30" fill="#f2c230" />
      <circle cx="50" cy="22" r="13" fill="#e8c9a8" />
      <circle cx={diving ? 14 : 22} cy={diving ? 30 : 45} r="9" fill="#fff" />
      <circle cx={diving ? 86 : 78} cy={diving ? 30 : 45} r="9" fill="#fff" />
      <rect x="36" y="80" width="10" height="28" rx="4" fill="#14244d" />
      <rect x="54" y="80" width="10" height="28" rx="4" fill="#14244d" />
      <rect x="31" y="104" width="16" height="9" rx="3" fill="#fff" />
      <rect x="53" y="104" width="16" height="9" rx="3" fill="#fff" />
    </svg>
  );
}
