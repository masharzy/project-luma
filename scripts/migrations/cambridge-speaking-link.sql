ALTER TABLE public.speaking_sets ADD COLUMN IF NOT EXISTS cambridge_test_id bigint REFERENCES public.cambridge_tests(id);
CREATE UNIQUE INDEX IF NOT EXISTS speaking_sets_cambridge_test_unique ON public.speaking_sets(cambridge_test_id) WHERE cambridge_test_id IS NOT NULL;
