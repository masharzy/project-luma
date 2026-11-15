import 'server-only';
import { send } from '@vercel/queue';
import { db } from '@/lib/auth/db';
// One enqueue API for both hosting setups:
//  - on Vercel (VERCEL=1) jobs go to Vercel Queues, consumed by the routes in src/app/api/queues/*;
//  - anywhere else (a VPS) jobs go to the public.app_jobs table and the in-process worker
//    (src/lib/jobs/pg-worker.ts, started from src/instrumentation.ts) runs them.
// JOBS_BACKEND=vercel|postgres overrides the detection.
export type EnqueueOptions = { idempotencyKey?: string; delaySeconds?: number; retentionSeconds?: number };
export function jobsBackend(): 'vercel' | 'postgres' {
  const forced = process.env.JOBS_BACKEND;
  if (forced === 'vercel' || forced === 'postgres') return forced;
  return process.env.VERCEL ? 'vercel' : 'postgres';
}
export async function enqueue(topic: string, payload: Record<string, unknown>, options: EnqueueOptions = {}) {
  if (jobsBackend() === 'vercel') return send(topic, payload, options);
  const delay = Math.max(0, Math.floor(options.delaySeconds || 0)), retention = Math.max(60, Math.floor(options.retentionSeconds || 86400));
  // Like Vercel Queues, a repeated idempotency key is a no-op while the earlier job is kept.
  await db().query(
    `INSERT INTO public.app_jobs(topic,payload,idempotency_key,run_at,expires_at)
     VALUES($1,$2::jsonb,$3,now()+make_interval(secs=>$4),now()+make_interval(secs=>$5))
     ON CONFLICT (idempotency_key) DO NOTHING`,
    [topic, JSON.stringify(payload), options.idempotencyKey || null, delay, retention],
  );
  return { messageId: null };
}
