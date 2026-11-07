import 'server-only';
import { intentKey, isUuid, toPaisa } from './briofold-core';
type Cfg = { api: URL; key: string; secret: string; environment: 'sandbox' | 'live' };
// Gateway is on only when every setting is present; otherwise checkout keeps the manual flow.
export function briofoldConfig(): Cfg | null {
  const { BRIOFOLD_API_URL: api, BRIOFOLD_API_KEY: key, BRIOFOLD_WEBHOOK_SECRET: secret, BRIOFOLD_ENV: env } = process.env;
  if (!api || !key || !secret || (env !== 'sandbox' && env !== 'live')) return null;
  const url = new URL(api);
  if (url.protocol !== 'https:' || url.pathname !== '/' || url.username || url.password) throw new Error('BRIOFOLD_API_URL must be an HTTPS origin');
  return { api: url, key, secret, environment: env };
}
async function call(cfg: Cfg, path: string, init: { method: string; body?: unknown; idempotencyKey?: string }) {
  const headers: Record<string, string> = { Authorization: 'Bearer ' + cfg.key, 'Content-Type': 'application/json' };
  if (init.idempotencyKey) headers['Idempotency-Key'] = init.idempotencyKey;
  const res = await fetch(new URL(path, cfg.api), { method: init.method, headers, body: init.body === undefined ? undefined : JSON.stringify(init.body), signal: AbortSignal.timeout(15000), redirect: 'error' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = (data as { error?: { code?: unknown; message?: unknown } }).error; throw new Error('Briofold ' + res.status + ' ' + String(e?.code ?? '').slice(0, 60) + ' ' + String(e?.message ?? '').slice(0, 160)); }
  return data as Record<string, unknown>;
}
export const gatewayIntentTtlMinutes = 60;
export async function createIntent(cfg: Cfg, o: { subscriptionId: string; amountBdt: number; email: string; returnUrl: string; webhookUrl: string; planName: string }) {
  const r = await call(cfg, '/v1/payment-intents', { method: 'POST', idempotencyKey: intentKey(o.subscriptionId), body: {
    amount: toPaisa(o.amountBdt) / 100, reference: o.subscriptionId, currency: 'BDT', expires_in_minutes: gatewayIntentTtlMinutes,
    redirect_url: o.returnUrl, cancel_url: o.returnUrl, webhook_url: o.webhookUrl, customer_email: o.email, metadata: { plan: o.planName } } });
  const url = typeof r.checkout_url === 'string' ? r.checkout_url : '';
  if (!isUuid(r.id) || !url.startsWith('https://')) throw new Error('Briofold returned an unconfirmed checkout');
  return { intentId: r.id as string, checkoutUrl: url };
}
// The webhook is only a hint. Payment is accepted after this server-side query agrees.
export async function queryIntent(cfg: Cfg, intentId: string) {
  const r = await call(cfg, '/v1/payment-intents/' + encodeURIComponent(intentId), { method: 'GET' });
  const d = (r.data ?? r) as Record<string, unknown>;
  return { id: d.id, reference: d.merchant_reference, amountMinor: d.amount_minor, currency: d.currency, state: d.state };
}
