BEGIN;
CREATE TABLE IF NOT EXISTS public.speaking_tests (
 kind text NOT NULL CHECK(kind IN ('practice','cambridge','mock')),
 parent_id bigint NOT NULL,
 document jsonb NOT NULL CHECK(jsonb_typeof(document)='object'),
 published boolean NOT NULL DEFAULT false,
 updated_by uuid REFERENCES app_auth.users(id),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(kind,parent_id)
);
CREATE TABLE IF NOT EXISTS public.speaking_live_calls (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES app_auth.users(id),
 call_id text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 ended_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS speaking_one_live_call_per_account ON public.speaking_live_calls(user_id) WHERE ended_at IS NULL;
COMMIT;
