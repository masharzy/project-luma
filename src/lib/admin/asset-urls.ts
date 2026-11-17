// Pure helpers for finding and rewriting test asset links (audio + images) inside stored JSON documents.
// No server imports, so tests can load this file directly.

export type AssetKind = 'audio' | 'image';
export type AssetUsage = { label: string; collection: string; module: string; location: string; editHref?: string };

const audioExt = ['mp3', 'm4a', 'wav', 'aac', 'ogg'];
const imageExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
/** A whole URL token as it appears inside JSON text or HTML attributes. */
export const URL_TOKEN = /https?:\/\/[^\s"'<>()\\]+|data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+/g;

/** The URL to fetch: repairs links saved twice, e.g. "https://a.comhttps://a.com/x.png". */
export function canonicalAssetUrl(token: string): string {
  if (token.startsWith('data:')) return token;
  const last = token.lastIndexOf('https://');
  return last > 0 ? token.slice(last) : token;
}

export function assetExtension(url: string): string | null {
  if (url.startsWith('data:image/')) return url.slice(11, url.indexOf(';')).replace('jpeg', 'jpg');
  try { const m = new URL(url).pathname.toLowerCase().match(/\.([a-z0-9]{2,5})$/); return m ? m[1] : null; } catch { return null; }
}
export function assetKind(url: string): AssetKind | null {
  const ext = assetExtension(url);
  return ext && audioExt.includes(ext) ? 'audio' : ext && imageExt.includes(ext) ? 'image' : null;
}
export function assetHost(url: string) { if (url.startsWith('data:')) return 'inline (base64)'; try { return new URL(url).host; } catch { return 'invalid'; } }

/** Our own bucket: anything served by /api/media/<uuid> on this site. */
export function isOwnMedia(url: string, origin: string) {
  return /^\/api\/media\/[0-9a-f-]{36}$/i.test(url) || (url.startsWith(origin + '/api/media/') && /\/api\/media\/[0-9a-f-]{36}$/i.test(url));
}

/** Every external asset token in a string. Links to web pages (no media extension) are ignored. */
export function externalAssets(text: string, origin: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(URL_TOKEN)) {
    const canonical = canonicalAssetUrl(m[0]);
    if (!isOwnMedia(canonical, origin) && assetKind(canonical)) out.push(canonical);
  }
  return out;
}

/** Replace every token whose canonical form is a key of `map`. Returns the new text and the number of replacements. */
export function rewriteAssets(text: string, map: Map<string, string>): { text: string; count: number } {
  let count = 0;
  const next = text.replace(URL_TOKEN, token => { const to = map.get(canonicalAssetUrl(token)); if (to === undefined) return token; count++; return to; });
  return { text: next, count };
}

/** Readable place inside an exam module document, e.g. "Part 2 · audio_url" or "Part 1 · Group 3 · sourceHtml". */
export function describePath(path: (string | number)[]): string {
  const bits: string[] = []; let field = '';
  for (let i = 0; i < path.length; i++) {
    const k = path[i], n = path[i + 1];
    if (k === 'parts' && typeof n === 'number') { bits.push('Part ' + (n + 1)); i++; continue; }
    if (k === 'question_groups' && typeof n === 'number') { bits.push('Group ' + (n + 1)); i++; continue; }
    if (k === 'questions' && typeof n === 'number') { bits.push('Question ' + (n + 1)); i++; continue; }
    if (k === 'audio_fallbacks' && typeof n === 'number') { field = 'audio_fallbacks[' + n + ']'; i++; continue; }
    if (typeof k === 'string') field = k;
  }
  if (field === 'audioUrl' && !bits.length) return 'Full-test audio';
  return [...bits, field].filter(Boolean).join(' · ');
}

/** Walk a JSON value and report each external asset with its path. */
export function findAssetsInDocument(doc: unknown, origin: string): { url: string; location: string }[] {
  const found: { url: string; location: string }[] = [];
  const walk = (v: unknown, path: (string | number)[]) => {
    if (typeof v === 'string') { for (const url of externalAssets(v, origin)) found.push({ url, location: describePath(path) }); return; }
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, [...path, i])); return; }
    if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, [...path, k]);
  };
  walk(doc, []);
  return found;
}

const formats: Record<string, { ext: string; kind: AssetKind }> = {
  'audio/mpeg': { ext: 'mp3', kind: 'audio' }, 'audio/mp4': { ext: 'm4a', kind: 'audio' }, 'audio/wav': { ext: 'wav', kind: 'audio' },
  'image/jpeg': { ext: 'jpg', kind: 'image' }, 'image/png': { ext: 'png', kind: 'image' }, 'image/webp': { ext: 'webp', kind: 'image' }, 'image/gif': { ext: 'gif', kind: 'image' },
};
export function mediaFormat(type: string) { return formats[type] || null; }

/** Detect the real file type from its first bytes (never trust the remote Content-Type). */
export function sniffMediaType(d: Uint8Array): string | null {
  const ascii = (a: number, b: number) => String.fromCharCode(...d.slice(a, b));
  if (d.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => d[i] === n)) return 'image/png';
  if (d.length >= 3 && d[0] === 255 && d[1] === 216 && d[2] === 255) return 'image/jpeg';
  if (d.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  if (d.length >= 6 && (ascii(0, 6) === 'GIF87a' || ascii(0, 6) === 'GIF89a')) return 'image/gif';
  if (d.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE') return 'audio/wav';
  if (d.length >= 12 && ascii(4, 8) === 'ftyp') return 'audio/mp4';
  if (d.length >= 3 && (ascii(0, 3) === 'ID3' || (d[0] === 255 && (d[1] & 224) === 224))) return 'audio/mpeg';
  return null;
}
