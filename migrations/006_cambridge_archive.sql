ALTER TABLE public.cambridge_tests DROP CONSTRAINT IF EXISTS cambridge_tests_status_check;
ALTER TABLE public.cambridge_tests ADD CONSTRAINT cambridge_tests_status_check CHECK (status IN ('draft','published','archived'));
