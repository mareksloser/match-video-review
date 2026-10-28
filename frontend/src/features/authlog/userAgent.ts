/** Short, human description of a user agent: "Chrome · Windows", "Safari · iPhone". Pure. */
export function describeUserAgent(ua: string | null): string {
  if (!ua) return '–';
  const browser =
    /Edg\//.test(ua) ? 'Edge'
    : /OPR\/|Opera/.test(ua) ? 'Opera'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
    : /Chrome\/|CriOS/.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari'
    : /curl|wget|python|okhttp|Go-http/i.test(ua) ? 'Skript'
    : 'Jiný prohlížeč';
  const os =
    /iPhone/.test(ua) ? 'iPhone'
    : /iPad/.test(ua) ? 'iPad'
    : /Android/.test(ua) ? 'Android'
    : /Windows/.test(ua) ? 'Windows'
    : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
    : /Linux/.test(ua) ? 'Linux'
    : null;
  return os ? `${browser} · ${os}` : browser;
}
