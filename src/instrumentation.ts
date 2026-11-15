// Runs once per server start. On a self-hosted server (not Vercel) it starts the background job worker that
// replaces Vercel Queues; on Vercel nothing happens here. JOBS_WORKER=off disables it (e.g. a web-only process).
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.JOBS_WORKER === 'off') return;
  const { jobsBackend } = await import('./lib/jobs/queue');
  if (jobsBackend() !== 'postgres' || !process.env.DATABASE_URL) return;
  const { startPgWorker } = await import('./lib/jobs/pg-worker');
  startPgWorker();
}
