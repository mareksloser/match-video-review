/**
 * Accepts only same-site paths for "return after login" redirects.
 * "//evil.com" and "/\evil.com" are protocol-relative URLs in browsers, so they are refused.
 */
export function safeRedirect(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/')) return null;
  if (value.startsWith('//') || value.startsWith('/\\')) return null;
  return value;
}
