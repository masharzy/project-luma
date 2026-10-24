BEGIN;
ALTER TABLE public.admin_content ADD COLUMN IF NOT EXISTS durations jsonb NOT NULL DEFAULT '{"listening":30,"reading":60,"writing":60,"speaking":15}'::jsonb CHECK(jsonb_typeof(durations)='object');
UPDATE public.cambridge_tests SET durations='{"speaking":15}'::jsonb||durations WHERE NOT durations ? 'speaking';
COMMIT;
