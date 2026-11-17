import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mirrorUrl, dropRedundantFallback, canonicalAssetUrl, externalAssets, rewriteAssets, findAssetsInDocument, describePath, assetKind, sniffMediaType, isOwnMedia } from '../src/lib/admin/asset-urls.ts';
const origin = 'https://jumptonine.com';
const own = origin + '/api/media/0b9c3c1e-1111-4222-8333-944445555666';

test('finds audio and image links, ignores page links and our own bucket', () => {
  const html = '<img src="https://engnovate.com/wp-content/uploads/a.jpg"><a href="https://engnovate.com/test/">page</a><img src="' + own + '">';
  assert.deepEqual(externalAssets(html, origin), ['https://engnovate.com/wp-content/uploads/a.jpg']);
  assert.equal(isOwnMedia(own, origin), true);
  assert.equal(assetKind('https://x.com/a.M4A'), 'audio');
  assert.equal(assetKind('https://x.com/page'), null);
});

test('repairs links saved with the host twice', () => {
  const bad = 'https://api.ieltsprobd.comhttps://api.ieltsprobd.com/media/test-assets/02fc.png';
  assert.equal(canonicalAssetUrl(bad), 'https://api.ieltsprobd.com/media/test-assets/02fc.png');
});

test('rewrite replaces whole tokens only, including doubled-host variants, and keeps JSON valid', () => {
  const url = 'https://api.ieltsprobd.com/media/test-assets/02fc.png';
  const doc = { parts: [{ audio_url: 'https://cdn.example.com/a.mp3', image_url: url, question_groups: [{ sourceHtml: '<img src="https://api.ieltsprobd.comhttps://api.ieltsprobd.com/media/test-assets/02fc.png">', other: 'https://api.ieltsprobd.com/media/test-assets/02fc.png.bak' }] }] };
  const out = rewriteAssets(JSON.stringify(doc), new Map([[url, own]]));
  assert.equal(out.count, 2);
  const parsed = JSON.parse(out.text);
  assert.equal(parsed.parts[0].image_url, own);
  assert.equal(parsed.parts[0].question_groups[0].sourceHtml, '<img src="' + own + '">');
  assert.equal(parsed.parts[0].question_groups[0].other, doc.parts[0].question_groups[0].other);
  assert.equal(parsed.parts[0].audio_url, 'https://cdn.example.com/a.mp3');
});

test('reports where each asset sits inside a module', () => {
  const doc = { audioUrl: '', parts: [{ audio_url: 'https://a.com/1.mp3', audio_fallbacks: ['https://b.com/1.mp3'] }, { question_groups: [{}, { referenceImage: 'data:image/png;base64,AAAA' }] }] };
  assert.deepEqual(findAssetsInDocument(doc, origin), [
    { url: 'https://a.com/1.mp3', location: 'Part 1 · audio_url' },
    { url: 'https://b.com/1.mp3', location: 'Part 1 · audio_fallbacks[0]' },
    { url: 'data:image/png;base64,AAAA', location: 'Part 2 · Group 2 · referenceImage' },
  ]);
  assert.equal(describePath(['audioUrl']), 'Full-test audio');
});

test('file type comes from the bytes, so an HTML error page is rejected', () => {
  assert.equal(sniffMediaType(new Uint8Array([0x49, 0x44, 0x33, 4, 0])), 'audio/mpeg');
  assert.equal(sniffMediaType(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])), 'image/png');
  assert.equal(sniffMediaType(new TextEncoder().encode('RIFF\0\0\0\0WAVEfmt ')), 'audio/wav');
  assert.equal(sniffMediaType(new TextEncoder().encode('<!doctype html>')), null);
});

test('migration page and API are admin-only and the page may preview external media', () => {
  const api = fs.readFileSync('src/app/api/admin/asset-migration/route.ts', 'utf8');
  assert.match(api, /hasAdminRole/); assert.match(api, /requireSameOrigin/);
  assert.match(fs.readFileSync('src/proxy.ts', 'utf8'), /\/admin\/asset-migration/);
  const lib = fs.readFileSync('src/lib/admin/asset-migration.ts', 'utf8');
  assert.match(lib, /referenced\(url\)/, 'only URLs that tests actually use may be fetched');
  assert.match(lib, /revision=\$6/, 'module rewrites are guarded by revision');
  assert.match(fs.readFileSync('src/app/api/media/[id]/route.ts', 'utf8'), /signedMedia/);
});

test('engnovate images fall back to the site image CDN; audio has no mirror', () => {
  assert.equal(mirrorUrl('https://engnovate.com/wp-content/uploads/2023/08/a.png'), 'https://i0.wp.com/engnovate.com/wp-content/uploads/2023/08/a.png');
  assert.equal(mirrorUrl('https://engnovate.com/wp-content/uploads/2023/07/a.mp3'), null);
  assert.equal(mirrorUrl('https://api.ieltsprobd.com/x.png'), null);
});

test('an unreachable fallback is removed only where the main audio is already ours', () => {
  const dead = 'https://engnovate.com/wp-content/uploads/a.mp3';
  const doc = { parts: [{ audio_url: own, audio_fallbacks: [dead] }, { audio_url: own, audio_fallbacks: ['https://other.com/b.mp3', dead] }] };
  const r = dropRedundantFallback(doc, dead, origin);
  assert.equal(r.removed, 2); assert.equal(r.stillUsed, false);
  assert.deepEqual(r.value.parts.map(p => p.audio_fallbacks), [[], ['https://other.com/b.mp3']]);
  const notYet = { parts: [{ audio_url: 'https://cdn.example.com/a.mp3', audio_fallbacks: [dead] }] };
  const r2 = dropRedundantFallback(notYet, dead, origin);
  assert.equal(r2.removed, 0); assert.equal(r2.stillUsed, true);
});

test('DB lookup uses the stored text, so non-ASCII paths (en dash) are found', () => {
  const lib = fs.readFileSync('src/lib/admin/asset-migration.ts', 'utf8');
  assert.doesNotMatch(lib, /u\.host \+ u\.pathname/);
  assert.deepEqual(externalAssets('<img src="https://engnovate.com/wp-content/uploads/2024/10/test-1–1.png">', origin), ['https://engnovate.com/wp-content/uploads/2024/10/test-1–1.png']);
});
