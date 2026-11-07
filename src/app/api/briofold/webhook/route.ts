import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/auth/db';
import { briofoldConfig, queryIntent } from '@/lib/briofold';
import { verifyWebhook } from '@/lib/briofold-core';
export const dynamic = 'force-dynamic';
const reply = (status: number, body: Record<string, unknown> = {}) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
// Briofold calls this when a payment is verified. Signature, then a server-side query, then one atomic activation.
export async function POST(req: NextRequest) {
  const cfg = briofoldConfig();
  if (!cfg) return reply(404);
  const raw = Buffer.from(await req.arrayBuffer());
  let event;
  try {
    event = verifyWebhook(raw, { timestamp: req.headers.get('x-briofold-timestamp'), signature: req.headers.get('x-briofold-signature'), eventId: req.headers.get('x-briofold-event-id'), keyId: req.headers.get('x-briofold-key-id') }, cfg.secret);
  } catch { return reply(401); }
  if (event === 'ignored') return reply(200);
  try {
    const sub = (await db().query('SELECT id,user_id,price_bdt,status,gateway_intent_id::text AS intent FROM public.evaluation_subscriptions WHERE id::text=$1 OR gateway_intent_id=$2::uuid LIMIT 1', [event.reference, event.intentId]))[0];
    const live = await queryIntent(cfg, event.intentId);
    const paid = live.state === 'completed' && live.id === event.intentId && live.reference === event.reference && live.amountMinor === event.amountMinor && live.currency === 'BDT';
    if (!paid) return reply(503, { retry: true });
    // Wrong subscription, wrong amount or a request we no longer hold: keep the evidence for a person to review.
    const matches = sub && sub.intent === event.intentId && String(sub.id) === event.reference && Number(sub.price_bdt) * 100 === event.amountMinor;
    const outcome = await db().query(`WITH seen AS (SELECT 1 FROM public.briofold_webhook_events WHERE event_id=$1),
      candidate AS (SELECT s.id,s.user_id FROM public.evaluation_subscriptions s JOIN app_auth.users u ON u.id=s.user_id WHERE $5::boolean AND s.id=$3 AND s.status='pending' AND u.banned=false AND NOT EXISTS(SELECT 1 FROM seen) FOR UPDATE OF s),
      closed AS (UPDATE public.evaluation_subscriptions SET status='cancelled',updated_at=now() WHERE status='active' AND user_id IN(SELECT user_id FROM candidate) RETURNING id),
      activated AS (UPDATE public.evaluation_subscriptions SET status='active',starts_at=now(),expires_at=now()+make_interval(days=>coalesce(duration_days,30)),updated_at=now(),payment_method='Briofold',payment_ref=$2 WHERE id IN(SELECT id FROM candidate) AND (SELECT count(*) FROM closed)>=0 RETURNING id),
      logged AS (INSERT INTO public.briofold_webhook_events(event_id,intent_id,subscription_id,outcome,note) SELECT $1,$2::uuid,$3,CASE WHEN EXISTS(SELECT 1 FROM activated) THEN 'activated' WHEN $5::boolean AND $4='active' THEN 'already_active' ELSE 'needs_review' END,CASE WHEN $5::boolean THEN NULL ELSE 'reference, intent or amount did not match' END WHERE NOT EXISTS(SELECT 1 FROM seen) ON CONFLICT DO NOTHING RETURNING outcome)
      SELECT (SELECT outcome FROM logged) AS outcome`, [event.eventId, event.intentId, sub ? sub.id : null, sub ? sub.status : null, Boolean(matches)]);
    return reply(200, { outcome: outcome[0]?.outcome ?? 'duplicate' });
  } catch { return reply(503, { retry: true }); }
}
