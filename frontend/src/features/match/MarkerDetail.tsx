import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Check, ExternalLink, Link2, PenLine, Pencil, Play, Trash2 } from 'lucide-react';
import type { Marker, Rule } from '@/lib/types';
import { formatTime } from '@/lib/time';
import { kindMeta } from '@/lib/labels';
import { Button } from '@/components/ui';

interface Props {
  marker: Marker;
  rules: Rule[];
  isAdmin: boolean;
  canDraw: boolean;
  deepLink: string | null;
  /** Link to this situation in the app (shared to the team chat). */
  shareUrl: string;
  onPlay: () => void;
  onDraw: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function MarkerDetail({ marker, rules, isAdmin, canDraw, deepLink, shareUrl, onPlay, onDraw, onEdit, onDelete }: Props) {
  const rule = rules.find((r) => r.id === marker.ruleId);
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <p className="text-sm text-muted">
          {kindMeta(marker.kind).label} v čase <span className="tabular">{formatTime(marker.timestampSeconds)}</span>
        </p>
        <h2 className="font-display text-xl font-semibold leading-tight">{marker.title}</h2>
      </div>

      <div className="flex flex-wrap gap-2">
        {deepLink ? (
          <a href={deepLink} target="_blank" rel="noreferrer">
            <Button size="sm" variant="primary">
              Otevřít na VEO <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
        ) : (
          <Button size="sm" variant="primary" onClick={onPlay}>
            <Play className="h-4 w-4 fill-current" /> Přehrát situaci
          </Button>
        )}
        <ShareButton url={shareUrl} title={`${formatTime(marker.timestampSeconds)} ${marker.title}`} />
        {isAdmin && (
          <>
            {canDraw && (
              <Button size="sm" onClick={onDraw}>
                <PenLine className="h-4 w-4" /> {marker.drawing ? 'Upravit kresbu' : 'Kreslit'}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onEdit} aria-label="Upravit marker">
              <Pencil className="h-4 w-4" />
            </Button>
            {confirming ? (
              <Button size="sm" variant="danger" onClick={onDelete} onBlur={() => setConfirming(false)} autoFocus>
                Opravdu smazat
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setConfirming(true)} aria-label="Smazat marker">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>

      {marker.description && <p className="whitespace-pre-line leading-relaxed">{marker.description}</p>}

      {(rule || marker.ruleLink) && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-muted">Klubová pravidla</h3>
          {rule && (
            <Link
              to="/playbook"
              hash={`rule-${rule.id}`}
              className="block rounded-lg border border-line p-3 hover:border-pitch/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pitch"
            >
              <span className="font-display text-base font-semibold">
                Zásada {rule.code}: {rule.title}
              </span>
              <span className="mt-1 block text-sm text-muted">{rule.body}</span>
            </Link>
          )}
          {marker.ruleLink && (
            <a href={marker.ruleLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-pitch underline-offset-2 hover:underline">
              Externí odkaz <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Phones: the system share sheet (WhatsApp, Messenger…). Elsewhere: copy to clipboard,
 * or show the link selected when the clipboard is blocked.
 */
function ShareButton({ url, title }: { url: string; title: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'manual'>('idle');
  const share = async () => {
    const touch = window.matchMedia?.('(pointer: coarse)').matches;
    if (touch && navigator.share) {
      try {
        await navigator.share({ title, text: title, url });
        return;
      } catch {
        /* cancelled — fall back to copying */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setState('copied');
      window.setTimeout(() => setState('idle'), 2000);
    } catch {
      setState('manual');
    }
  };
  return (
    <>
      <Button size="sm" onClick={share} title="Odkaz přímo na tuto situaci">
        {state === 'copied' ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />} {state === 'copied' ? 'Zkopírováno' : 'Odkaz'}
      </Button>
      {state === 'manual' && (
        <input
          readOnly
          value={url}
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          onBlur={() => setState('idle')}
          aria-label="Odkaz na situaci"
          className="h-8 w-full rounded-md border border-line bg-bg px-2 font-mono text-xs"
        />
      )}
    </>
  );
}
