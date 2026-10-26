BEGIN;
CREATE TABLE IF NOT EXISTS public.ai_lab_secrets (
 provider text PRIMARY KEY CHECK(provider IN ('google','openrouter')),
 encrypted_key text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ai_lab_runs (
 id uuid PRIMARY KEY, admin_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 result jsonb NOT NULL
);
-- Grant only to the runtime role used by this project.
GRANT SELECT, INSERT, UPDATE ON public.ai_lab_secrets TO luma_auth_runtime;
GRANT SELECT, INSERT ON public.ai_lab_runs TO luma_auth_runtime;
COMMIT;
