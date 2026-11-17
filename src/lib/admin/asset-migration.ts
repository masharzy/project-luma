import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { db } from '@/lib/auth/db';
import { audit } from '@/lib/auth/http';
import { putPrivate, storageConfigured } from '@/lib/products/storage';
import { canonicalExamKind } from '@/lib/practice-routes';
import { assetHost, assetKind, assetExtension, externalAssets, findAssetsInDocument, mediaFormat, rewriteAssets, sniffMediaType, mirrorUrl, dropRedundantFallback, type AssetKind, type AssetUsage } from './asset-urls';

export const MAX_ASSET_BYTES = 200_000_000;
export type ScannedAsset = { url: string; preview: string; kind: AssetKind; ext: string; host: string; usages: AssetUsage[]; attempts: number; migrated: null | { assetId: string; newUrl: string } };
export type MigratedAsset = { sourceUrl: string; assetId: string; newUrl: string; contentType: string; bytes: number; migratedAt: string; replaced: Record<string, number> };

/** Inline base64 images are long; they are keyed and shown by their content hash. */
function sourceKey(url: string) { return url.startsWith('data:') ? 'inline:sha256:' + createHash('sha256').update(url).digest('hex') : url; }
const mediaUrl = (origin: string, id: string) => origin + '/api/media/' + id;

const moduleQuery = `SELECT m.kind, m.parent_id::text AS id, m.module, m.document::text AS doc, m.revision,
  CASE WHEN m.kind='cambridge' THEN 'Cambridge '||t.book_number||' · Test '||t.test_number ELSE coalesce(c.title,'#'||m.parent_id) END AS title,
  v.title AS book, c.book_slug
 FROM public.exam_modules m
 LEFT JOIN public.cambridge_tests t ON m.kind='cambridge' AND t.id=m.parent_id
 LEFT JOIN public.admin_content c ON m.kind<>'cambridge' AND c.id=m.parent_id
 LEFT JOIN public.book_volumes v ON v.slug=c.book_slug`;

function collectionOf(r: any) { return r.kind === 'cambridge' ? 'Cambridge' : r.kind === 'mock' ? 'Mock paper' : r.book_slug ? 'Other Books' : 'Recent Tests'; }

export async function scanAssets(origin: string) {
  const [modules, mocks, attempts, sources] = await Promise.all([
    db().query(moduleQuery + ` WHERE m.document::text ~ '(https?://|data:image/)'`),
    db().query(`SELECT id::text, title, snapshot::text AS snap FROM public.mock_events WHERE snapshot::text ~ '(https?://|data:image/)'`),
    db().query(`SELECT snapshot::text AS snap FROM public.exam_attempts WHERE snapshot::text ~ '(https?://|data:image/)'`),
    db().query(`SELECT s.source_url, s.asset_id::text, s.migrated_at, s.replaced, a.content_type, a.bytes FROM public.media_asset_sources s JOIN public.media_assets a ON a.id=s.asset_id ORDER BY s.migrated_at DESC`),
  ]);
  const map = new Map<string, ScannedAsset>();
  const entry = (url: string) => {
    let e = map.get(url);
    if (!e) { e = { url, preview: url, kind: assetKind(url)!, ext: assetExtension(url) || '', host: assetHost(url), usages: [], attempts: 0, migrated: null }; map.set(url, e); }
    return e;
  };
  for (const r of modules) {
    const doc = JSON.parse(r.doc);
    const label = (r.book ? r.book + ' · ' : '') + r.title;
    const editHref = '/admin/engine/' + canonicalExamKind(r.kind) + '/' + r.id + '/' + r.module;
    for (const f of findAssetsInDocument(doc, origin)) entry(f.url).usages.push({ label, collection: collectionOf(r), module: r.module, location: f.location, editHref });
  }
  for (const r of mocks) {
    const snap = JSON.parse(r.snap);
    (Array.isArray(snap) ? snap : []).forEach((item: any) => {
      for (const f of findAssetsInDocument(item?.document, origin)) entry(f.url).usages.push({ label: 'Mock event · ' + (r.title || '#' + r.id), collection: 'Scheduled mock (copy)', module: String(item?.module || ''), location: f.location, editHref: '/admin/mocks/' + r.id });
    });
  }
  for (const r of attempts) for (const url of new Set(externalAssets(r.snap, origin))) { const e = map.get(url); if (e) e.attempts++; else entry(url).attempts = 1; }
  const byKey = new Map(sources.map((s: any) => [s.source_url, s]));
  for (const e of map.values()) {
    const s: any = byKey.get(sourceKey(e.url));
    if (s) e.migrated = { assetId: s.asset_id, newUrl: mediaUrl(origin, s.asset_id) };
  }
  const migrated: MigratedAsset[] = sources.map((s: any) => ({ sourceUrl: s.source_url, assetId: s.asset_id, newUrl: mediaUrl(origin, s.asset_id), contentType: s.content_type, bytes: Number(s.bytes), migratedAt: new Date(s.migrated_at).toISOString(), replaced: s.replaced || {} }));
  const assets = [...map.values()].sort((a, b) => a.host.localeCompare(b.host) || a.url.localeCompare(b.url));
  return { configured: storageConfigured(), origin, assets, migrated };
}

/** The URL must really be used by test content: the endpoint never fetches arbitrary addresses. */
async function referenced(url: string) {
  const needle = likeNeedle(url);
  const rows = await db().query(`SELECT EXISTS(SELECT 1 FROM public.exam_modules WHERE document::text LIKE $1) OR EXISTS(SELECT 1 FROM public.mock_events WHERE snapshot::text LIKE $1) OR EXISTS(SELECT 1 FROM public.exam_attempts WHERE snapshot::text LIKE $1) AS ok`, [needle]);
  return Boolean(rows[0]?.ok);
}
function likeNeedle(url: string) {
  const part = url.startsWith('data:') ? url.slice(url.indexOf(',') + 1, url.indexOf(',') + 121) : (() => { const u = new URL(url); return u.host + u.pathname; })();
  return '%' + part.replace(/[\\%_]/g, m => '\\' + m) + '%';
}

function safeRemote(url: string) {
  const u = new URL(url);
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new MigrationError('Only http(s) links can be migrated.');
  if (u.username || u.password) throw new MigrationError('Links with credentials are not allowed.');
  const h = u.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || /^(\d+\.){3}\d+$/.test(h) || h.includes(':')) throw new MigrationError('Private or IP-address hosts are not allowed.');
  return u;
}
export class MigrationError extends Error {}

async function fetchBytes(url: string, accept: string): Promise<Uint8Array> {
  const u = safeRemote(url);
  let res: Response;
  try { res = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(240_000), headers: { 'User-Agent': 'JumpToNine asset migration (+https://jumptonine.com)', Accept: accept } }); }
  catch (e) { throw new MigrationError('Download failed: ' + (e instanceof Error && e.name === 'TimeoutError' ? 'timed out' : 'host did not respond')); }
  if (!res.ok || !res.body) throw new MigrationError('Download failed: HTTP ' + res.status);
  safeRemote(res.url || url);
  const declared = Number(res.headers.get('content-length') || 0);
  if (declared > MAX_ASSET_BYTES) throw new MigrationError('File is larger than 200 MB.');
  const reader = res.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > MAX_ASSET_BYTES) { await reader.cancel(); throw new MigrationError('File is larger than 200 MB.'); } chunks.push(value); }
  if (!size) throw new MigrationError('The host returned an empty file.');
  return new Uint8Array(Buffer.concat(chunks));
}
async function download(url: string): Promise<Uint8Array> {
  if (url.startsWith('data:')) return new Uint8Array(Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
  try { return await fetchBytes(url, 'audio/*,image/*,*/*;q=0.5'); }
  catch (e) {
    const mirror = mirrorUrl(url);
    if (!mirror || !(e instanceof MigrationError) || !/HTTP (401|403|404|429)/.test(e.message)) throw e;
    // Same upload through the site's own image CDN; ask for the original formats (not WebP).
    try { return await fetchBytes(mirror, 'image/png,image/jpeg,image/gif;q=0.9,*/*;q=0.1'); }
    catch (m) { throw new MigrationError(e.message + '; image CDN copy also failed (' + (m instanceof Error ? m.message : 'error') + ')'); }
  }
}

function fileName(url: string, ext: string) {
  if (url.startsWith('data:')) return 'inline-image.' + ext;
  const base = decodeURIComponent(new URL(url).pathname.split('/').pop() || 'asset.' + ext);
  return base.slice(-200);
}

async function ensureAsset(url: string, userId: string) {
  const key = sourceKey(url);
  const known = await db().query('SELECT asset_id::text FROM public.media_asset_sources WHERE source_url=$1', [key]);
  if (known.length) return { assetId: String(known[0].asset_id), reused: true, bytes: 0, contentType: '' };
  if (!storageConfigured()) throw new MigrationError('R2 storage is not configured.');
  const bytes = await download(url);
  const type = sniffMediaType(bytes), fmt = type ? mediaFormat(type) : null;
  if (!type || !fmt) throw new MigrationError('The downloaded file is not a supported audio or image file (the host may have returned an HTML page).');
  if (fmt.kind !== assetKind(url)) throw new MigrationError('Expected ' + assetKind(url) + ' but the host sent ' + type + '.');
  const sha = createHash('sha256').update(bytes).digest('hex');
  let assetId: string;
  const same = await db().query('SELECT id::text FROM public.media_assets WHERE sha256=$1', [sha]);
  if (same.length) assetId = String(same[0].id);
  else {
    assetId = randomUUID();
    const objectKey = 'test-assets/' + sha.slice(0, 40) + '.' + fmt.ext;
    await putPrivate(objectKey, bytes, type);
    const ins = await db().query(`INSERT INTO public.media_assets(id,object_key,content_type,original_name,bytes,access,uploaded_by,sha256,origin) VALUES($1,$2,$3,$4,$5,'free',$6::uuid,$7,'migration')
      ON CONFLICT DO NOTHING RETURNING id::text`, [assetId, objectKey, type, fileName(url, fmt.ext), bytes.length, userId, sha]);
    if (!ins.length) assetId = String((await db().query('SELECT id::text FROM public.media_assets WHERE sha256=$1 OR object_key=$2', [sha, objectKey]))[0].id);
  }
  await db().query('INSERT INTO public.media_asset_sources(source_url,asset_id,migrated_by) VALUES($1,$2::uuid,$3::uuid) ON CONFLICT(source_url) DO NOTHING', [key, assetId, userId]);
  return { assetId, reused: Boolean(same.length), bytes: bytes.length, contentType: type };
}

/** Swap every occurrence of `url` (including doubled-host variants) for our media link, guarded against concurrent edits. */
async function rewriteEverywhere(url: string, newUrl: string, userId: string) {
  const map = new Map([[url, newUrl]]), needle = likeNeedle(url);
  const replaced = { modules: 0, mocks: 0, attempts: 0, links: 0, conflicts: 0 };
  for (let pass = 0; pass < 3; pass++) {
    const rows = await db().query(`SELECT kind, parent_id::text AS id, module, revision, document::text AS doc FROM public.exam_modules WHERE document::text LIKE $1`, [needle]);
    let pending = 0;
    for (const r of rows) {
      const out = rewriteAssets(r.doc, map); if (!out.count) continue;
      JSON.parse(out.text);
      const ok = await db().query(`UPDATE public.exam_modules SET document=$1::jsonb, revision=revision+1, updated_by=$2::uuid, updated_at=now() WHERE kind=$3 AND parent_id=$4::bigint AND module=$5 AND revision=$6 RETURNING 1`, [out.text, userId, r.kind, r.id, r.module, r.revision]);
      if (ok.length) { replaced.modules++; replaced.links += out.count; } else pending++;
    }
    if (!pending) break; replaced.conflicts = pending;
  }
  for (const [table, column, counter] of [['mock_events', 'snapshot', 'mocks'], ['exam_attempts', 'snapshot', 'attempts']] as const) {
    const rows = await db().query(`SELECT id::text, md5(${column}::text) AS h, ${column}::text AS doc FROM public.${table} WHERE ${column}::text LIKE $1`, [needle]);
    for (const r of rows) {
      const out = rewriteAssets(r.doc, map); if (!out.count) continue;
      JSON.parse(out.text);
      const ok = await db().query(`UPDATE public.${table} SET ${column}=$1::jsonb WHERE id=$2 AND md5(${column}::text)=$3 RETURNING 1`, [out.text, r.id, r.h]);
      if (ok.length) { replaced[counter]++; replaced.links += out.count; } else replaced.conflicts++;
    }
  }
  return replaced;
}

/**
 * For an unreachable fallback recording: remove it from parts whose main audio is already in our bucket.
 * Only applied when every remaining use is such a redundant fallback; otherwise nothing is written.
 */
async function dropFallbackEverywhere(url: string, userId: string, origin: string) {
  const needle = likeNeedle(url);
  const res = { modules: 0, mocks: 0, attempts: 0, links: 0, conflicts: 0, stillUsed: false };
  const mods = await db().query(`SELECT kind, parent_id::text AS id, module, revision, document FROM public.exam_modules WHERE document::text LIKE $1`, [needle]);
  const snaps: { table: string; counter: 'mocks' | 'attempts'; rows: any[] }[] = [];
  for (const [table, counter] of [['mock_events', 'mocks'], ['exam_attempts', 'attempts']] as const)
    snaps.push({ table, counter, rows: await db().query(`SELECT id::text, md5(snapshot::text) AS h, snapshot FROM public.${table} WHERE snapshot::text LIKE $1`, [needle]) });
  const plans = [...mods.map(r => ({ r, out: dropRedundantFallback(r.document, url, origin) })), ...snaps.flatMap(s => s.rows.map(r => ({ r, s, out: dropRedundantFallback(r.snapshot, url, origin) })))] as any[];
  if (plans.some(p => p.out.stillUsed)) return { ...res, stillUsed: true };
  for (const p of plans) {
    if (!p.out.removed) continue;
    if (!p.s) {
      const ok = await db().query(`UPDATE public.exam_modules SET document=$1::jsonb, revision=revision+1, updated_by=$2::uuid, updated_at=now() WHERE kind=$3 AND parent_id=$4::bigint AND module=$5 AND revision=$6 RETURNING 1`, [JSON.stringify(p.out.value), userId, p.r.kind, p.r.id, p.r.module, p.r.revision]);
      if (ok.length) { res.modules++; res.links += p.out.removed; } else res.conflicts++;
    } else {
      const ok = await db().query(`UPDATE public.${p.s.table} SET snapshot=$1::jsonb WHERE id=$2 AND md5(snapshot::text)=$3 RETURNING 1`, [JSON.stringify(p.out.value), p.r.id, p.r.h]);
      if (ok.length) { res[p.s.counter as 'mocks' | 'attempts']++; res.links += p.out.removed; } else res.conflicts++;
    }
  }
  return res;
}

export async function migrateAsset(url: string, userId: string, origin: string) {
  if (typeof url !== 'string' || url.length < 8 || url.length > 1_600_000 || !assetKind(url)) throw new MigrationError('Not a supported audio or image link.');
  if (!(await referenced(url))) throw new MigrationError('This link is no longer used by any test.');
  let asset;
  try { asset = await ensureAsset(url, userId); }
  catch (e) {
    if (!(e instanceof MigrationError) || assetKind(url) !== 'audio' || !/^Download failed/.test(e.message)) throw e;
    const dropped = await dropFallbackEverywhere(url, userId, origin);
    if (dropped.stillUsed || !dropped.links) throw new MigrationError(e.message + (dropped.stillUsed ? ' (still used as main audio somewhere; nothing changed there)' : ''));
    await audit(userId, 'asset_fallback_removed:' + createHash('sha256').update(url).digest('hex').slice(0, 16));
    return { assetId: null, newUrl: null, bytes: 0, contentType: '', reused: false, droppedFallback: true, replaced: dropped };
  }
  const newUrl = mediaUrl(origin, asset.assetId);
  const replaced = await rewriteEverywhere(url, newUrl, userId);
  await db().query(`UPDATE public.media_asset_sources SET replaced=$2::jsonb, rewritten_at=now() WHERE source_url=$1`, [sourceKey(url), JSON.stringify(replaced)]);
  await audit(userId, 'asset_migrated:' + asset.assetId);
  return { assetId: asset.assetId, newUrl, bytes: asset.bytes, contentType: asset.contentType, reused: asset.reused, replaced };
}
