BEGIN;
CREATE TABLE IF NOT EXISTS public.writing_submissions (
 id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES app_auth.users(id) ON DELETE CASCADE,
 input jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.writing_evaluations ALTER COLUMN attempt_id DROP NOT NULL;
ALTER TABLE public.writing_evaluations ADD COLUMN IF NOT EXISTS submission_id uuid UNIQUE REFERENCES public.writing_submissions(id) ON DELETE CASCADE;
ALTER TABLE public.writing_evaluations DROP CONSTRAINT IF EXISTS writing_evaluations_product_check;
ALTER TABLE public.writing_evaluations ADD CONSTRAINT writing_evaluations_product_check CHECK(product IN ('cambridge_writing','practice_writing','writing_product'));
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='writing_evaluations_source_check') THEN ALTER TABLE public.writing_evaluations ADD CONSTRAINT writing_evaluations_source_check CHECK(num_nonnulls(attempt_id,submission_id)=1); END IF; END $$;
CREATE TABLE IF NOT EXISTS public.speaking_sets (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,title text NOT NULL CHECK(length(title) BETWEEN 1 AND 180),
 minutes integer NOT NULL DEFAULT 15 CHECK(minutes BETWEEN 5 AND 60),document jsonb,published boolean NOT NULL DEFAULT false,
 updated_by uuid REFERENCES app_auth.users(id),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.speaking_attempts (
 id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES app_auth.users(id) ON DELETE CASCADE,
 set_id bigint NOT NULL REFERENCES public.speaking_sets(id),title text NOT NULL,snapshot jsonb NOT NULL,
 minutes integer NOT NULL,status text NOT NULL DEFAULT 'recording' CHECK(status IN ('recording','submitted')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.speaking_recordings (
 attempt_id uuid NOT NULL REFERENCES public.speaking_attempts(id) ON DELETE CASCADE,step integer NOT NULL,
 object_key text NOT NULL,seconds numeric NOT NULL CHECK(seconds>0 AND seconds<=183),bytes integer NOT NULL CHECK(bytes>44 AND bytes<=3900000),
 PRIMARY KEY(attempt_id,step)
);
CREATE TABLE IF NOT EXISTS public.speaking_evaluations (
 id uuid PRIMARY KEY,attempt_id uuid NOT NULL UNIQUE REFERENCES public.speaking_attempts(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES app_auth.users(id) ON DELETE CASCADE,
 product text NOT NULL DEFAULT 'speaking_product' CHECK(product='speaking_product'),period date NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','completed','failed')),
 input jsonb NOT NULL,result jsonb,model text NOT NULL DEFAULT 'qwen3.8-omni-flash',usage jsonb,
 tries integer NOT NULL DEFAULT 0,lease_until timestamptz,error_code text,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS speaking_one_active ON public.speaking_evaluations(user_id) WHERE status IN ('pending','running');
CREATE INDEX IF NOT EXISTS speaking_attempt_owner ON public.speaking_attempts(user_id,created_at DESC);
GRANT SELECT,INSERT,UPDATE ON public.writing_submissions,public.speaking_sets,public.speaking_attempts,public.speaking_recordings,public.speaking_evaluations TO luma_auth_runtime;
GRANT USAGE,SELECT ON SEQUENCE public.speaking_sets_id_seq TO luma_auth_runtime;
COMMIT;
