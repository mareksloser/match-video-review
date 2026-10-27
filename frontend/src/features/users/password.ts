/** Readable random password (no 0/O/1/l look-alikes). Pure apart from the injected RNG. */
export function generatePassword(length = 12, random: (n: number) => Uint32Array = (n) => crypto.getRandomValues(new Uint32Array(n))): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(random(length), (v) => alphabet[v % alphabet.length]).join('');
}
