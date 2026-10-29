BEGIN;
ALTER TABLE public.exam_attempts DROP CONSTRAINT IF EXISTS exam_attempts_kind_check;
ALTER TABLE public.exam_attempts ADD CONSTRAINT exam_attempts_kind_check CHECK(kind IN ('cambridge','practice','mock'));
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS scheduled_start timestamptz;
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS locked_index integer;
CREATE TABLE IF NOT EXISTS public.mock_events (
 id bigint PRIMARY KEY REFERENCES public.admin_content(id) ON DELETE RESTRICT,
 title text NOT NULL, description text NOT NULL DEFAULT '', access text NOT NULL CHECK(access IN ('free','premium')),
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, snapshot jsonb NOT NULL,
 results_published_at timestamptz, prepared_by uuid REFERENCES app_auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(ends_at>starts_at)
);
CREATE TABLE IF NOT EXISTS public.mock_registrations (
 mock_id bigint NOT NULL REFERENCES public.mock_events(id), user_id uuid NOT NULL REFERENCES app_auth.users(id),
 attempt_id uuid UNIQUE REFERENCES public.exam_attempts(id), registered_at timestamptz NOT NULL DEFAULT now(),
 reminder_sent_at timestamptz, reminder_lease_until timestamptz,
 PRIMARY KEY(mock_id,user_id)
);
CREATE INDEX IF NOT EXISTS mock_registration_user_idx ON public.mock_registrations(user_id,mock_id);
GRANT SELECT,INSERT,UPDATE ON public.mock_events,public.mock_registrations TO luma_auth_runtime;
ALTER TABLE app_auth.oauth_flows ADD COLUMN IF NOT EXISTS return_path text NOT NULL DEFAULT '/dashboard';
COMMIT;
