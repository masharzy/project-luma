# Self-hosting JumpToNine on a VPS

The app runs on Vercel today. The same code runs on a plain Node.js server; the only Vercel-specific
service, Vercel Queues, is replaced automatically by a Postgres job queue when the app is not on Vercel.

## Background jobs
- `src/lib/jobs/queue.ts` picks the backend: on Vercel (`VERCEL=1`) jobs go to Vercel Queues; anywhere else
  they go to `public.app_jobs` (migration `042_app_jobs.sql`). Override with `JOBS_BACKEND=vercel|postgres`.
- `src/instrumentation.ts` starts the worker (`src/lib/jobs/pg-worker.ts`) once per server process when the
  backend is Postgres. Jobs: mock settle / Writing / Speaking evaluation, mock reminders, standalone Writing and
  Speaking evaluation. Claims use `FOR UPDATE SKIP LOCKED` + a lease, so several processes are safe and a crashed
  process's job is picked up again after its lease.
- Settings: `JOBS_WORKER=off` (web-only process), `JOBS_POLL_MS` (default 2000), `JOBS_CONCURRENCY` (default 4).
- Tested by `tests/e2e/jobs-e2e.mjs` (also in the `mock-e2e` GitHub workflow).

## Server (suggested: Singapore, 2 vCPU / 4 GB, Ubuntu 24.04)
1. Node 22, `git clone`, `npm ci`, copy the production env vars (same as Vercel: `DATABASE_URL`, `APP_ORIGIN`,
   `R2_*`, `OPENROUTER_API_KEY`, `DASHSCOPE_API_KEY`, `RESEND_*`, `GOOGLE_*`, `BRIOFOLD_*`, `NEON_AUTH_*`).
   Keep a copy of the env file outside the server (password manager / private R2).
2. Apply migration `042_app_jobs.sql` once (already applied in production on 15 Nov 2026).
3. Zero-downtime deploys: build into a new release folder (or in GitHub Actions) while the old release keeps
   serving, then switch the symlink and `pm2 reload` (or swap Docker containers). Users never see the build.
4. Caddy (or Nginx) in front for HTTPS; Cloudflare in front of that (proxied DNS) for caching and DDoS protection.
5. Uptime alert (e.g. UptimeRobot) on `/` and a daily reboot-safe `pm2 save` / systemd unit.
6. DNS: point `jumptonine.com` (A record) to the VPS only after the robot tests pass against a test subdomain.
   Keep the Vercel project for a while so switching back is one DNS change.

## Data
Nothing durable lives on the server: the database is Neon, recordings are in Cloudflare R2. If the VPS expires
or breaks, only the running copy is lost; redeploy from GitHub on a new server (or point DNS back to Vercel).
