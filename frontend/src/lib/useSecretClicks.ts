import { useRef } from 'react';

/**
 * Calls `onUnlock` after `count` clicks within `windowMs` (an easter-egg trigger).
 * Returns a click handler; it prevents the element's default action only on the unlocking click,
 * so a normal single click keeps working as usual.
 */
export function useSecretClicks(onUnlock: () => void, count = 5, windowMs = 2000) {
  const clicks = useRef<number[]>([]);
  return (e: { preventDefault(): void }) => {
    const now = Date.now();
    clicks.current = [...clicks.current.filter((t) => now - t < windowMs), now];
    if (clicks.current.length >= count) {
      clicks.current = [];
      e.preventDefault();
      onUnlock();
    }
  };
}
