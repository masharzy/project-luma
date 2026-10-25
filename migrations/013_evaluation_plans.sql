CREATE TABLE IF NOT EXISTS public.evaluation_policy (
 id boolean PRIMARY KEY DEFAULT true CHECK(id),
 free_writing integer NOT NULL DEFAULT 0 CHECK(free_writing BETWEEN 0 AND 10000),
 free_speaking integer NOT NULL DEFAULT 0 CHECK(free_speaking BETWEEN 0 AND 10000),
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.evaluation_policy(id) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS public.evaluation_plans (
 id uuid PRIMARY KEY, name text NOT NULL CHECK(length(name) BETWEEN 2 AND 80),
 description text NOT NULL DEFAULT '' CHECK(length(description)<=400),
 price_bdt integer NOT NULL CHECK(price_bdt BETWEEN 0 AND 100000),
 writing_limit integer CHECK(writing_limit BETWEEN 0 AND 10000),
 speaking_limit integer CHECK(speaking_limit BETWEEN 0 AND 10000),
 published boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.evaluation_subscriptions (
 id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES app_auth.users(id),
 plan_id uuid NOT NULL REFERENCES public.evaluation_plans(id),
 plan_name text NOT NULL, price_bdt integer NOT NULL CHECK(price_bdt>=0),
 writing_limit integer CHECK(writing_limit BETWEEN 0 AND 10000),
 speaking_limit integer CHECK(speaking_limit BETWEEN 0 AND 10000),
 status text NOT NULL CHECK(status IN('pending','active','cancelled','rejected')),
 starts_at timestamptz,expires_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by uuid REFERENCES app_auth.users(id),
 CHECK(status<>'active' OR (starts_at IS NOT NULL AND expires_at>starts_at))
);
CREATE UNIQUE INDEX IF NOT EXISTS evaluation_subscription_pending ON public.evaluation_subscriptions(user_id) WHERE status='pending';
CREATE UNIQUE INDEX IF NOT EXISTS evaluation_subscription_active ON public.evaluation_subscriptions(user_id) WHERE status='active';
CREATE INDEX IF NOT EXISTS evaluation_subscription_user ON public.evaluation_subscriptions(user_id,created_at DESC);
CREATE OR REPLACE FUNCTION public.evaluation_allowance(uid uuid,prod text)
RETURNS TABLE(monthly_limit integer,source text) LANGUAGE sql STABLE AS $$
 SELECT q.monthly_limit,q.source FROM (
 SELECT g.monthly_limit,'override'::text source,1 priority FROM public.evaluation_grants g WHERE g.user_id=uid AND g.product=prod AND g.expires_at>now()
 UNION ALL
 SELECT CASE WHEN prod='writing_product' THEN s.writing_limit ELSE s.speaking_limit END,'subscription',2 FROM public.evaluation_subscriptions s WHERE s.user_id=uid AND s.status='active' AND s.starts_at<=now() AND s.expires_at>now() AND prod IN('writing_product','speaking_product')
 UNION ALL
 SELECT CASE WHEN prod='writing_product' THEN p.free_writing ELSE p.free_speaking END,'free',3 FROM public.evaluation_policy p WHERE p.id=true AND prod IN('writing_product','speaking_product')
 ) q ORDER BY q.priority LIMIT 1
$$;
GRANT SELECT,INSERT,UPDATE ON public.evaluation_policy,public.evaluation_plans,public.evaluation_subscriptions TO luma_auth_runtime;
GRANT EXECUTE ON FUNCTION public.evaluation_allowance(uuid,text) TO luma_auth_runtime;
