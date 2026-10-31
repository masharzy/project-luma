-- Public resource pages read only published, free rows through server-side queries.
-- Restore the runtime table privilege omitted by migration 023; no write grants.
GRANT SELECT ON public.learning_resources TO luma_auth_runtime;
