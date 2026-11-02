BEGIN;
CREATE TABLE IF NOT EXISTS public.test_catalog_labels (
 key text PRIMARY KEY,
 display_name text NOT NULL,
 public_path text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.test_catalog_labels(key,display_name,public_path) VALUES
 ('recent_tests','Recent Tests','/recent-tests'),
 ('type_wise_question_practice','Type Wise Question Practice','/type-wise-question-practice')
 ON CONFLICT(key) DO UPDATE SET display_name=excluded.display_name,public_path=excluded.public_path,updated_at=now();
CREATE OR REPLACE VIEW public.recent_tests AS
 SELECT * FROM public.admin_content WHERE kind='practice' AND book_slug IS NULL
 WITH CASCADED CHECK OPTION;
COMMENT ON VIEW public.recent_tests IS 'Canonical Recent Tests catalog. Stable underlying engine identifiers preserve More Books, saved attempts, results and evaluation usage.';
GRANT SELECT ON public.test_catalog_labels TO luma_auth_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.recent_tests TO luma_auth_runtime;
UPDATE public.admin_content SET title=regexp_replace(title,'practice tests?','Recent Tests','gi'),
 description=regexp_replace(description,'practice tests?','Recent Tests','gi')
 WHERE kind='practice' AND book_slug IS NULL AND (title ~* 'practice tests?' OR description ~* 'practice tests?');
UPDATE public.exam_attempts a SET title=regexp_replace(a.title,'practice tests?','Recent Tests','gi')
 WHERE a.kind='practice' AND a.title ~* 'practice tests?'
 AND EXISTS(SELECT 1 FROM public.recent_tests r WHERE r.id=a.parent_id);
UPDATE public.exam_attempts SET title=regexp_replace(title,'(?:Cambridge )?Question Type Practice','Type Wise Question Practice','gi')
 WHERE title ~* '^(Cambridge )?Question Type Practice';
COMMIT;
