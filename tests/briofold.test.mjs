import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHmac, createHash } from 'node:crypto';
import ts from 'typescript';
const src = fs.readFileSync(new URL('../src/lib/briofold-core.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { verifyWebhook, toPaisa, intentKey } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const secret = 's'.repeat(40), now = 1_800_000_000;
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
function signed(over = {}, body = {}) {
  const event = { id: uuid(1), type: 'payment.verified', schema_version: 1, data: { payment_intent_id: uuid(2), merchant_reference: uuid(3), amount_minor: 99900, currency: 'BDT', ...body }, ...over };
  const raw = Buffer.from(JSON.stringify(event)), ts = String(now);
  return { raw, h: { timestamp: ts, signature: 'v1=' + createHmac('sha256', secret).update(ts + '.').update(raw).digest('hex'), eventId: event.id, keyId: createHash('sha256').update(secret).digest('hex').slice(0, 16) } };
}
test('valid signed payment.verified is accepted', () => {
  const { raw, h } = signed();
  assert.deepEqual(verifyWebhook(raw, h, secret, now), { eventId: uuid(1), intentId: uuid(2), reference: uuid(3), amountMinor: 99900 });
});
test('tampered body, wrong secret, stale timestamp and wrong key are rejected', () => {
  const { raw, h } = signed();
  assert.throws(() => verifyWebhook(Buffer.from(raw.toString().replace('99900', '10')), h, secret, now), /signature/);
  assert.throws(() => verifyWebhook(raw, h, 'x'.repeat(40), now), /signature/);
  assert.throws(() => verifyWebhook(raw, h, secret, now + 301), /timestamp/);
  assert.throws(() => verifyWebhook(raw, { ...h, keyId: 'deadbeefdeadbeef' }, secret, now), /key/);
});
test('event id header must match the signed body, other event types are ignored', () => {
  const { raw, h } = signed();
  assert.throws(() => verifyWebhook(raw, { ...h, eventId: uuid(9) }, secret, now), /envelope/);
  const other = signed({ type: 'payment.expired' });
  assert.equal(verifyWebhook(other.raw, other.h, secret, now), 'ignored');
});
test('bad money fields are rejected', () => {
  for (const bad of [{ amount_minor: 1.5 }, { amount_minor: 0 }, { currency: 'USD' }]) {
    const { raw, h } = signed({}, bad);
    assert.throws(() => verifyWebhook(raw, h, secret, now), /fields/);
  }
});
test('paisa conversion and stable idempotency key', () => {
  assert.equal(toPaisa(999), 99900); assert.equal(toPaisa(499.5), 49950);
  assert.equal(intentKey(uuid(3)), intentKey(uuid(3))); assert.notEqual(intentKey(uuid(3)), intentKey(uuid(4)));
  assert.ok(intentKey(uuid(3)).length >= 16);
});
