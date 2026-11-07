BEGIN;
-- Briofold payment gateway: a pending subscription can carry the gateway payment request that pays for it.
ALTER TABLE public.evaluation_subscriptions ADD COLUMN IF NOT EXISTS gateway_intent_id uuid;
ALTER TABLE public.evaluation_subscriptions ADD COLUMN IF NOT EXISTS gateway_checkout_url text CHECK(gateway_checkout_url IS NULL OR length(gateway_checkout_url)<=600);
CREATE UNIQUE INDEX IF NOT EXISTS evaluation_subscriptions_gateway_intent ON public.evaluation_subscriptions(gateway_intent_id) WHERE gateway_intent_id IS NOT NULL;
-- Every signed webhook event is stored once, so a retry can never activate a plan twice.
CREATE TABLE IF NOT EXISTS public.briofold_webhook_events (
 event_id uuid PRIMARY KEY,
 intent_id uuid NOT NULL,
 subscription_id uuid,
 outcome text NOT NULL CHECK(outcome IN('activated','already_active','needs_review')),
 note text CHECK(note IS NULL OR length(note)<=200),
 received_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT ON public.briofold_webhook_events TO luma_auth_runtime;
COMMIT;
