/**
 * Penalty shoot-out logic for the maintenance page. Pure functions: the randomness is
 * injected, so the keeper's behaviour can be tested deterministically.
 */
export interface Zone {
  id: string;
  label: string;
  /** Position in the goal, percent of its width / height. */
  x: number;
  y: number;
}

export const ZONES: Zone[] = [
  { id: 'top-left', label: 'Levá šibenice', x: 17, y: 28 },
  { id: 'top-center', label: 'Nahoru doprostřed', x: 50, y: 28 },
  { id: 'top-right', label: 'Pravá šibenice', x: 83, y: 28 },
  { id: 'bottom-left', label: 'K levé tyči', x: 17, y: 72 },
  { id: 'bottom-center', label: 'Středem po zemi', x: 50, y: 72 },
  { id: 'bottom-right', label: 'K pravé tyči', x: 83, y: 72 },
];

/** How many recent shots the keeper remembers. */
export const MEMORY = 8;

/**
 * The keeper dives with a base chance for every zone plus extra weight for the zones the
 * player used recently: shoot into the same corner and you'll get caught more often.
 */
export function keeperWeights(history: string[]): number[] {
  const recent = history.slice(-MEMORY);
  return ZONES.map((z) => 1 + 0.7 * recent.filter((id) => id === z.id).length);
}

export function pickKeeperZone(history: string[], random: () => number = Math.random): Zone {
  const weights = keeperWeights(history);
  let roll = random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < ZONES.length; i++) {
    roll -= weights[i];
    if (roll < 0) return ZONES[i];
  }
  return ZONES[ZONES.length - 1];
}

export interface Score {
  streak: number;
  best: number;
  shots: number;
  goals: number;
}

export const emptyScore: Score = { streak: 0, best: 0, shots: 0, goals: 0 };

export function applyShot(score: Score, goal: boolean): Score {
  const streak = goal ? score.streak + 1 : 0;
  return {
    streak,
    best: Math.max(score.best, streak),
    shots: score.shots + 1,
    goals: score.goals + (goal ? 1 : 0),
  };
}
