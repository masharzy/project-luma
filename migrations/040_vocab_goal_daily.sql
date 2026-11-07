BEGIN;
-- Daily word goal per learner and a count of cards reviewed per day (Asia/Dhaka date) for streaks.
CREATE TABLE IF NOT EXISTS public.vocab_settings (user_id uuid PRIMARY KEY REFERENCES app_auth.users(id) ON DELETE CASCADE, daily_goal integer NOT NULL DEFAULT 10 CHECK(daily_goal BETWEEN 1 AND 200), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.vocab_daily (user_id uuid NOT NULL REFERENCES app_auth.users(id) ON DELETE CASCADE, day date NOT NULL, n integer NOT NULL DEFAULT 0 CHECK(n>=0), PRIMARY KEY(user_id,day));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.vocab_settings,public.vocab_daily TO luma_auth_runtime;
COMMIT;
