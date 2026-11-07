// Pure helpers for the Briofold gateway. No server-only imports so they can be unit tested.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === 'string' && uuidRe.test(v);
export const toPaisa = (bdt: number) => Math.round(bdt * 100);
export const intentKey = (subscriptionId: string) => createHash('sha256').update('jumptonine-subscription|' + subscriptionId).digest('hex');
const same = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
export type PaymentVerified = { eventId: string; intentId: string; reference: string; amountMinor: number };
// Signature = v1=hex(HMAC-SHA256(secret, timestamp + "." + raw body)); timestamp within 5 minutes.
export function verifyWebhook(raw: Buffer, h: { timestamp: string | null; signature: string | null; eventId: string | null; keyId: string | null }, secret: string, now = Math.floor(Date.now() / 1000)): PaymentVerified | 'ignored' {
  if (secret.length < 32 || raw.length > 16384) throw new Error('bounds');
  const ts = h.timestamp || '';
  if (!/^\d+$/.test(ts) || Math.abs(now - Number(ts)) > 300) throw new Error('timestamp');
  const expected = 'v1=' + createHmac('sha256', secret).update(ts + '.').update(raw).digest('hex');
  if (!same(expected, h.signature || '')) throw new Error('signature');
  if (h.keyId && !same(createHash('sha256').update(secret).digest('hex').slice(0, 16), h.keyId)) throw new Error('key');
  const event = JSON.parse(raw.toString('utf8'));
  if (!isUuid(event.id) || event.id !== h.eventId || event.schema_version !== 1) throw new Error('envelope');
  if (event.type !== 'payment.verified') return 'ignored';
  const d = event.data || {};
  const intentId = d.payment_intent_id ?? event.invoice_id;
  if (!isUuid(intentId) || typeof d.merchant_reference !== 'string' || !Number.isSafeInteger(d.amount_minor) || d.amount_minor <= 0 || d.currency !== 'BDT') throw new Error('fields');
  return { eventId: event.id, intentId, reference: d.merchant_reference, amountMinor: d.amount_minor };
}
