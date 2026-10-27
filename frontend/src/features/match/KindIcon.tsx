import { ArrowLeftRight, Crosshair, Goal, RectangleVertical, Route } from 'lucide-react';
import type { MarkerKind } from '@/lib/types';

const icons = { tactic: Route, goal: Goal, chance: Crosshair, foul: RectangleVertical, substitution: ArrowLeftRight };

export function KindIcon({ kind, className = 'h-3.5 w-3.5' }: { kind: MarkerKind; className?: string }) {
  const Icon = icons[kind];
  return <Icon className={className} aria-hidden="true" />;
}
