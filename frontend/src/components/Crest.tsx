import crestUrl from '@/assets/crest.svg';
import { cn } from '@/lib/cn';

/**
 * SK Baník Libušín crest (vectorized from the club PNG, 5:6 aspect ratio).
 * Decorative next to text; pass `label` where the crest stands alone as a link.
 */
export function Crest({ className = 'h-12 w-10', label }: { className?: string; label?: string }) {
  return <img src={crestUrl} alt={label ?? ''} className={cn('object-contain', className)} draggable={false} />;
}
