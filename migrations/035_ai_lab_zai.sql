BEGIN;
-- Allow a stored Z.ai key for the AI lab (additive; existing rows unchanged).
ALTER TABLE public.ai_lab_secrets DROP CONSTRAINT IF EXISTS ai_lab_secrets_provider_check;
ALTER TABLE public.ai_lab_secrets ADD CONSTRAINT ai_lab_secrets_provider_check CHECK (provider IN ('google','openrouter','zai'));
COMMIT;
