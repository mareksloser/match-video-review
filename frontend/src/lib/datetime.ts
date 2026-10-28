/** "28. 10. 2026 19:42" in the viewer's time zone. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "před 5 min", "před 3 h", "včera 19:42", otherwise the full date. `now` injectable for tests. */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const minutes = Math.round((now.getTime() - d.getTime()) / 60000);
  if (minutes < 1) return 'právě teď';
  if (minutes < 60) return `před ${minutes} min`;
  if (minutes < 6 * 60) return `před ${Math.round(minutes / 60)} h`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const time = formatDateTime(iso).split(' ').pop();
  if (d.toDateString() === now.toDateString()) return `dnes ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `včera ${time}`;
  return formatDateTime(iso);
}
