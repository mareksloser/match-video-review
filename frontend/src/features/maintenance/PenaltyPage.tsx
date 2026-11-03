import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { PenaltyGame } from './PenaltyGame';

/** Hidden page with the maintenance mini game (5× click on the crest, or the 404 page). */
export function PenaltyPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Zpět k zápasům
      </Link>
      <h1 className="mt-2 font-display text-3xl font-semibold">Penalta</h1>
      <p className="mt-1 text-muted">Našli jste schovanou hru. Rozbor počká, tohle je jen na rozehřátí.</p>
      <div className="mt-5">
        <PenaltyGame />
      </div>
    </div>
  );
}
