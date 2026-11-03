import { Link } from '@tanstack/react-router';
import { Crest } from '@/components/Crest';

export function NotFoundPage() {
  return (
    <div className="mx-auto mt-10 max-w-md text-center">
      <Crest className="mx-auto h-20 w-16" />
      <p className="mt-4 font-display text-6xl font-bold text-muted/60">404</p>
      <h1 className="mt-1 font-display text-2xl font-semibold">Tahle stránka neexistuje</h1>
      <p className="mt-2 text-muted">Odkaz je možná starý nebo v něm chybí kus adresy.</p>
      <div className="mt-6 flex flex-col items-center gap-3">
        <Link to="/" className="rounded-md bg-pitch px-4 py-2 font-medium text-pitch-ink hover:bg-pitch/90">
          Na přehled zápasů
        </Link>
        <Link to="/penalta" className="text-sm text-muted hover:text-ink hover:underline">
          Nebo si mezitím dejte penaltu
        </Link>
      </div>
    </div>
  );
}
