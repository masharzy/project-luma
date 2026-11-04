# Speaking-only worker (Render or VPS)

Runs the Gemini 3.1 Pro Speaking pipeline without Vercel's request duration limit. The website, uploads, authentication, Writing and results UI remain on Vercel. Audio remains in R2 and job/results remain in Neon. Only the Speaking processor runs here; this image does not build or serve Next.js.

Render: create a Docker web service from this repository, Dockerfile `services/speaking-worker/Dockerfile`, build context repository root, health path `/health`. The blueprint is `services/speaking-worker/render.yaml`. Set the private variables from `.env.example`; use the existing database URL and application origin, and generate a fresh shared worker token (at least 32 random characters). The authenticated context endpoint supplies the provider key in memory and short-lived signed recording URLs for each pending job; the R2 credentials and vault master key stay on Vercel. Never commit values.

After `/health` succeeds, add production Vercel variables `SPEAKING_WORKER_URL=https://<service>.onrender.com` and the same `SPEAKING_WORKER_TOKEN`, then redeploy the site. The existing Vercel Queue callback authenticates and hands off the job, returning as soon as Render accepts it. The worker claims pending jobs atomically in Neon, serially. Repeated deliveries do not repeat paid model calls. Failed jobs refund their original reserved allowance.

The worker renews a processing lease every 30 seconds. After a worker restart, expired running leases are failed/refunded; an interrupted paid request is never retried automatically. Stored partial provider responses remain available. Jobs are polled every five seconds while running. The service must reach Neon, R2 and OpenRouter over HTTPS.

Free Render web instances may sleep after 15 minutes without inbound traffic, can restart, and consume shared free instance hours. A new job's authenticated HTTP handoff wakes the service. This is a temporary deployment, not a claim of always-on reliability. Use an always-on instance or the existing VPS for dependable continuous service. No Render database or disk is needed.

VPS migration uses the same Dockerfile/image and environment, with restart policy `unless-stopped`. Point `SPEAKING_WORKER_URL` to the VPS HTTPS endpoint and redeploy Vercel. Run only one deployment during migration; atomic database claims still protect against duplicate payment if they overlap. Keep the shared token server-side and terminate HTTPS at a reverse proxy.

Build locally: `npm ci --prefix services/speaking-worker` then `npm run build --prefix services/speaking-worker`. Start with private environment variables: `npm start --prefix services/speaking-worker`.
