import { Link } from '@tanstack/react-router';
import { Globe, Lock } from 'lucide-react';
import type { Match } from '@/lib/types';
import { formatDate, videoTypeLabel } from '@/lib/labels';

export function MatchTile({ match, categoryName, signedIn, isAdmin }: { match: Match; categoryName: string; signedIn: boolean; isAdmin: boolean }) {
  const done = isAdmin ? match.reviewedCount : match.viewedCount ?? 0;
  const progress = match.markerCount ? done / match.markerCount : 0;
  return (
    <Link
      to="/match/$matchId"
      params={{ matchId: String(match.id) }}
      className="group overflow-hidden rounded-xl border border-line bg-panel transition-colors hover:border-pitch/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pitch"
    >
      <div className="relative aspect-video" style={{ background: 'repeating-linear-gradient(90deg, #2f6e2c 0 9%, #357a31 9% 18%)' }}>
        <svg viewBox="0 0 160 90" className="absolute inset-0 h-full w-full opacity-60" aria-hidden="true">
          <g fill="none" stroke="#fff" strokeWidth="0.8">
            <rect x="8" y="8" width="144" height="74" />
            <line x1="80" y1="8" x2="80" y2="82" />
            <circle cx="80" cy="45" r="11" />
            <rect x="8" y="27" width="20" height="36" />
            <rect x="132" y="27" width="20" height="36" />
          </g>
        </svg>
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
        <span className="absolute left-3 top-3 rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
          {videoTypeLabel[match.videoType] ?? match.videoType}
        </span>
        <span className="absolute right-3 top-3 rounded bg-black/60 p-1 text-white" title={match.isPublic ? 'Veřejné' : 'Jen pro tým'}>
          {match.isPublic ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
        </span>
        <span className="absolute bottom-2 left-3 font-display text-sm font-semibold text-white">{categoryName}</span>
      </div>
      <div className="p-4">
        <h2 className="font-display text-lg font-semibold leading-snug group-hover:text-pitch">{match.title}</h2>
        <p className="text-sm text-muted">{formatDate(match.matchDate)}</p>
        {signedIn && match.markerCount > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted">
              <span>{isAdmin ? 'Probráno s týmem' : 'Zhlédnuto'}</span>
              <span className="tabular">{done} / {match.markerCount}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-raised">
              <div className="h-full rounded-full bg-pitch" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
