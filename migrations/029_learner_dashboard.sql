BEGIN;
CREATE TABLE IF NOT EXISTS public.learner_goals (
 user_id uuid PRIMARY KEY REFERENCES app_auth.users(id) ON DELETE CASCADE,
 target_band numeric(2,1) NOT NULL DEFAULT 7 CHECK(target_band BETWEEN 1 AND 9 AND mod(target_band,0.5)=0),
 exam_date date,
 weekly_target integer NOT NULL DEFAULT 3 CHECK(weekly_target BETWEEN 1 AND 30),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.learner_saved_resources (
 user_id uuid NOT NULL REFERENCES app_auth.users(id) ON DELETE CASCADE,
 path text NOT NULL CHECK(length(path)<=200), title text NOT NULL CHECK(length(title)<=180),
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,path)
);
REVOKE ALL ON public.learner_goals,public.learner_saved_resources FROM PUBLIC;
GRANT SELECT,INSERT,UPDATE ON public.learner_goals TO luma_auth_runtime;
GRANT SELECT,INSERT,DELETE ON public.learner_saved_resources TO luma_auth_runtime;
COMMIT;
