import type { DiffPart } from './markerTexts';

/** Inline word diff: removed words struck through in red, added in green. */
export function DiffText({ parts }: { parts: DiffPart[] }) {
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((p, i) =>
        p.type === 'same' ? (
          <span key={i}>{p.text}</span>
        ) : p.type === 'del' ? (
          <del key={i} className="mr-1 rounded-sm bg-card-red/15 px-0.5 text-card-red decoration-card-red/70">{p.text}</del>
        ) : (
          <ins key={i} className="rounded-sm bg-pitch/15 px-0.5 text-pitch no-underline">{p.text}</ins>
        ),
      )}
    </span>
  );
}
