import {
  ArrowLeftRight,
  CircleAlert,
  Crosshair,
  Flag,
  Goal,
  Lightbulb,
  RectangleVertical,
  Route,
  ThumbsUp,
  type LucideIcon,
} from 'lucide-react';
import type { MarkerKind } from '@/lib/types';

const icons: Record<MarkerKind, LucideIcon> = {
  praise: ThumbsUp,
  mistake: CircleAlert,
  improvement: Lightbulb,
  tactic: Route,
  goal: Goal,
  chance: Crosshair,
  set_piece: Flag,
  foul: RectangleVertical,
  substitution: ArrowLeftRight,
};

export function KindIcon({ kind, className = 'h-3.5 w-3.5' }: { kind: MarkerKind; className?: string }) {
  const Icon = icons[kind] ?? Route;
  return <Icon className={className} aria-hidden="true" />;
}
