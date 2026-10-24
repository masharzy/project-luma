BEGIN;
CREATE TABLE IF NOT EXISTS public.evaluation_grants (
 user_id uuid NOT NULL REFERENCES app_auth.users(id) ON DELETE CASCADE,
 product text NOT NULL CHECK(product IN ('cambridge_writing','practice_writing','writing_product','speaking_product')),
 monthly_limit integer CHECK(monthly_limit BETWEEN 0 AND 10000),
 expires_at timestamptz NOT NULL,
 updated_by uuid REFERENCES app_auth.users(id) ON DELETE SET NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,product)
);
CREATE TABLE IF NOT EXISTS public.evaluation_usage (
 user_id uuid NOT NULL REFERENCES app_auth.users(id) ON DELETE CASCADE,
 product text NOT NULL CHECK(product IN ('cambridge_writing','practice_writing','writing_product','speaking_product')),
 period date NOT NULL,
 count integer NOT NULL DEFAULT 0 CHECK(count>=0),
 PRIMARY KEY(user_id,product,period)
);
CREATE TABLE IF NOT EXISTS public.writing_evaluations (
 id uuid PRIMARY KEY,
 attempt_id uuid NOT NULL UNIQUE REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES app_auth.users(id) ON DELETE CASCADE,
 product text NOT NULL CHECK(product IN ('cambridge_writing','practice_writing')),
 period date NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','completed','failed')),
 input jsonb NOT NULL, result jsonb, model text NOT NULL,
 usage jsonb, tries integer NOT NULL DEFAULT 0,
 lease_until timestamptz, error_code text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS writing_evaluation_one_active ON public.writing_evaluations(user_id) WHERE status IN ('pending','running');
CREATE INDEX IF NOT EXISTS writing_evaluation_user_idx ON public.writing_evaluations(user_id,created_at DESC);
GRANT SELECT,INSERT,UPDATE ON public.evaluation_grants,public.evaluation_usage,public.writing_evaluations TO luma_auth_runtime;
COMMIT;
