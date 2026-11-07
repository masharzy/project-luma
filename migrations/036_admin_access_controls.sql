BEGIN;
-- Device details for the admin user profile. Only the browser string is stored, no IP address.
ALTER TABLE app_auth.sessions ADD COLUMN IF NOT EXISTS user_agent text CHECK(user_agent IS NULL OR length(user_agent)<=300);
-- NULL keeps the platform default; a number caps signed-in devices for this account.
ALTER TABLE app_auth.users ADD COLUMN IF NOT EXISTS device_limit integer CHECK(device_limit IS NULL OR device_limit BETWEEN 1 AND 20);
-- Platform default for accounts without their own limit. NULL means unlimited (current behaviour).
ALTER TABLE public.evaluation_policy ADD COLUMN IF NOT EXISTS default_device_limit integer CHECK(default_device_limit IS NULL OR default_device_limit BETWEEN 1 AND 20);

-- Per-account access to specific content, independent of the subscription plan.
CREATE TABLE IF NOT EXISTS public.user_content_grants (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES app_auth.users(id) ON DELETE CASCADE,
 scope text NOT NULL CHECK(scope IN('all_premium','cambridge_book','cambridge_test','recent_all','recent_test','more_books_all','more_books_volume','more_books_test')),
 ref text CHECK(ref IS NULL OR length(ref)<=120),
 note text CHECK(note IS NULL OR length(note)<=200),
 expires_at timestamptz,
 created_by uuid REFERENCES app_auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK((scope IN('all_premium','recent_all','more_books_all') AND ref IS NULL) OR (scope NOT IN('all_premium','recent_all','more_books_all') AND ref IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS user_content_grants_unique ON public.user_content_grants(user_id,scope,coalesce(ref,''));
CREATE INDEX IF NOT EXISTS user_content_grants_user ON public.user_content_grants(user_id);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.user_content_grants TO luma_auth_runtime;
COMMIT;
