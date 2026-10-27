/** Original club crest: shield with crossed miner's hammers. */
export function Crest({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 56" className={className} aria-hidden="true">
      <path d="M24 2 44 9v18c0 13-9 22-20 27C13 49 4 40 4 27V9z" fill="#14532d" stroke="#1fbf75" strokeWidth="2.5" />
      <g stroke="#e8f5ee" strokeWidth="3.2" strokeLinecap="round">
        <path d="M15 17 33 38" />
        <path d="M33 17 15 38" />
      </g>
      <g fill="#e8f5ee">
        <rect x="10" y="12.5" width="11" height="6" rx="1.2" transform="rotate(48 15.5 15.5)" />
        <rect x="27" y="12.5" width="11" height="6" rx="1.2" transform="rotate(-48 32.5 15.5)" />
      </g>
    </svg>
  );
}
