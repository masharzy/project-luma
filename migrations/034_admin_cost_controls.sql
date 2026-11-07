-- Admin cost controls. Prices and exchange rate are entered by an admin from provider pricing pages;
-- nothing here ships with assumed prices. Cost is derived at read time from evaluation usage.
BEGIN;
CREATE TABLE IF NOT EXISTS public.ai_model_prices (
 model text PRIMARY KEY CHECK(length(model) BETWEEN 1 AND 160),
 input_usd_per_m numeric CHECK(input_usd_per_m IS NULL OR input_usd_per_m>=0),
 output_usd_per_m numeric CHECK(output_usd_per_m IS NULL OR output_usd_per_m>=0),
 audio_usd_per_min numeric CHECK(audio_usd_per_min IS NULL OR audio_usd_per_min>=0),
 source_note text NOT NULL DEFAULT '' CHECK(length(source_note)<=300),
 verified_on date,
 updated_by uuid REFERENCES app_auth.users(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ai_budget (
 id boolean PRIMARY KEY DEFAULT true CHECK(id),
 usd_bdt_rate numeric CHECK(usd_bdt_rate IS NULL OR usd_bdt_rate BETWEEN 1 AND 1000),
 monthly_cap_bdt integer CHECK(monthly_cap_bdt IS NULL OR monthly_cap_bdt BETWEEN 0 AND 100000000),
 alert_percent integer NOT NULL DEFAULT 80 CHECK(alert_percent BETWEEN 1 AND 100),
 updated_by uuid REFERENCES app_auth.users(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.ai_budget(id) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS public.feature_flags (
 key text PRIMARY KEY CHECK(key ~ '^[a-z][a-z0-9_]{1,59}$'),
 description text NOT NULL DEFAULT '' CHECK(length(description)<=200),
 enabled boolean NOT NULL DEFAULT false,
 updated_by uuid REFERENCES app_auth.users(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE ON public.ai_model_prices,public.ai_budget,public.feature_flags TO luma_auth_runtime;
GRANT DELETE ON public.ai_model_prices TO luma_auth_runtime;
COMMIT;
