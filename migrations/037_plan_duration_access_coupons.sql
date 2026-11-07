BEGIN;
-- A plan lasts as long as the admin sets; the price covers that whole period.
ALTER TABLE public.evaluation_plans ADD COLUMN IF NOT EXISTS duration_days integer NOT NULL DEFAULT 30 CHECK(duration_days BETWEEN 1 AND 3660);
ALTER TABLE public.evaluation_plans ADD COLUMN IF NOT EXISTS recommended boolean NOT NULL DEFAULT false;
-- What the plan unlocks. NULL = everything premium (how plans worked before this migration).
ALTER TABLE public.evaluation_plans ADD COLUMN IF NOT EXISTS access jsonb CHECK(access IS NULL OR jsonb_typeof(access)='object');
-- Subscriptions keep a copy, so editing a plan never changes what a member already bought.
ALTER TABLE public.evaluation_subscriptions ADD COLUMN IF NOT EXISTS duration_days integer CHECK(duration_days IS NULL OR duration_days BETWEEN 1 AND 3660);
ALTER TABLE public.evaluation_subscriptions ADD COLUMN IF NOT EXISTS access jsonb CHECK(access IS NULL OR jsonb_typeof(access)='object');
ALTER TABLE public.evaluation_subscriptions ADD COLUMN IF NOT EXISTS list_price_bdt integer CHECK(list_price_bdt IS NULL OR list_price_bdt>=0);
ALTER TABLE public.evaluation_subscriptions ADD COLUMN IF NOT EXISTS coupon_code text CHECK(coupon_code IS NULL OR length(coupon_code)<=40);
ALTER TABLE public.evaluation_subscriptions ADD COLUMN IF NOT EXISTS payment_method text CHECK(payment_method IS NULL OR length(payment_method)<=40);
ALTER TABLE public.evaluation_subscriptions ADD COLUMN IF NOT EXISTS payment_ref text CHECK(payment_ref IS NULL OR length(payment_ref)<=80);

CREATE TABLE IF NOT EXISTS public.coupons (
 id uuid PRIMARY KEY,
 code text NOT NULL CHECK(code ~ '^[A-Z0-9_-]{3,40}$'),
 kind text NOT NULL CHECK(kind IN('percent','fixed')),
 value integer NOT NULL CHECK(value>0),
 plan_id uuid REFERENCES public.evaluation_plans(id) ON DELETE CASCADE,
 max_uses integer CHECK(max_uses IS NULL OR max_uses>0),
 expires_at timestamptz,
 active boolean NOT NULL DEFAULT true,
 note text CHECK(note IS NULL OR length(note)<=200),
 created_by uuid REFERENCES app_auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(kind<>'percent' OR value BETWEEN 1 AND 100)
);
CREATE UNIQUE INDEX IF NOT EXISTS coupons_code_unique ON public.coupons(code);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.coupons TO luma_auth_runtime;
COMMIT;
