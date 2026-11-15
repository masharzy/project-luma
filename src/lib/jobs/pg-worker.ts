import 'server-only';
import { db } from '@/lib/auth/db';
import { jobHandlers } from './handlers';
// Self-hosted worker for public.app_jobs. Safe with several app processes: a job is claimed with
// FOR UPDATE SKIP LOCKED and a lease (locked_until); a crashed process's lease simply expires and another
// process picks the job up again. A failed job is retried after the topic's retry delay until it expires.
type Row = { id: string; topic: string; payload: Record<string, unknown>; attempts: number };
export async function claimJob(): Promise<Row | null> {
  const rows = await db().query(
    `UPDATE public.app_jobs j SET attempts=j.attempts+1,
       locked_until=now()+make_interval(secs=>CASE j.topic ${Object.entries(jobHandlers).map(([t, h]) => `WHEN '${t}' THEN ${h.visibilityTimeoutSeconds}`).join(' ')} ELSE 300 END)
     WHERE j.id=(SELECT id FROM public.app_jobs WHERE done_at IS NULL AND run_at<=now() AND expires_at>now()
       AND (locked_until IS NULL OR locked_until<now()) ORDER BY run_at, id LIMIT 1 FOR UPDATE SKIP LOCKED)
     RETURNING j.id, j.topic, j.payload, j.attempts`,
  );
  return (rows[0] as Row) || null;
}
export async function runJob(job: Row) {
  const handler = jobHandlers[job.topic];
  try {
    if (!handler) throw Error('No handler for topic ' + job.topic);
    await handler.run(job.payload);
    await db().query('UPDATE public.app_jobs SET done_at=now(), locked_until=NULL, last_error=NULL WHERE id=$1', [job.id]);
    return true;
  } catch (error) {
    // Only the error kind is stored: payloads and messages can carry learner data.
    const kind = String((error as Error)?.message || 'Error').slice(0, 120);
    await db().query('UPDATE public.app_jobs SET locked_until=NULL, run_at=now()+make_interval(secs=>$2), last_error=$3 WHERE id=$1',
      [job.id, handler?.retryAfterSeconds ?? 300, kind]);
    return false;
  }
}
/** Runs due jobs until none is left; returns how many ran. */
export async function drainJobs(limit = 50) {
  let n = 0;
  for (; n < limit; n++) { const job = await claimJob(); if (!job) break; await runJob(job); }
  return n;
}
export async function cleanupJobs() {
  await db().query("DELETE FROM public.app_jobs WHERE (done_at IS NOT NULL AND done_at<now()-interval '7 days') OR expires_at<now()-interval '7 days'");
}
let started = false;
export function startPgWorker({ intervalMs = Number(process.env.JOBS_POLL_MS || 2000), concurrency = Number(process.env.JOBS_CONCURRENCY || 4) } = {}) {
  if (started) return; started = true;
  let lastCleanup = 0;
  const loop = async () => {
    for (;;) {
      try {
        // Several slots: AI evaluations mostly wait on the network, so a few run side by side.
        const ran = await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => drainJobs(10)));
        if (Date.now() - lastCleanup > 3600_000) { lastCleanup = Date.now(); await cleanupJobs(); }
        if (ran.some(n => n > 0)) continue;
      } catch (error) { console.error('Job worker error', { name: (error as Error)?.name }); }
      await new Promise(r => setTimeout(r, intervalMs));
    }
  };
  void loop();
  console.log('Self-hosted job worker started', { concurrency, intervalMs });
}
