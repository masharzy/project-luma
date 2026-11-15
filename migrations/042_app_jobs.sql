-- Self-hosted job queue (used only when the app does not run on Vercel; on Vercel, Vercel Queues are used).
-- Same contract as Vercel Queues: topic + JSON payload, optional delay, idempotency key, retries, retention.
CREATE TABLE IF NOT EXISTS public.app_jobs (
  id bigserial PRIMARY KEY,
  topic text NOT NULL,
  payload jsonb NOT NULL,
  idempotency_key text UNIQUE,
  run_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  done_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_jobs_due_idx ON public.app_jobs (run_at) WHERE done_at IS NULL;
