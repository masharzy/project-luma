// Turns a browser user-agent string into a short label for the admin device list.
export function describeDevice(agent: unknown) {
  const ua = typeof agent === 'string' ? agent : '';
  if (!ua) return { label: 'Unknown device', kind: 'unknown' as const };
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\/|CriOS/.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /CrOS/.test(ua) ? 'ChromeOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown OS';
  const kind = /iPhone|Android.*Mobile|Mobile/.test(ua) ? 'phone' as const : /iPad|Tablet|Android/.test(ua) ? 'tablet' as const : 'desktop' as const;
  return { label: `${browser} on ${os}`, kind };
}
