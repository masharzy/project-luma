-- User-requested cleanup: retain complete four-module Practice sets only.
-- A pre-cleanup Neon branch retains the original imported test records.
DO $$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM public.admin_content WHERE kind='practice' AND book_slug IS NULL AND import_source_key LIKE 'archive-practice-source-%';
 IF n NOT IN (15,39) THEN RAISE EXCEPTION 'Unexpected imported Practice test count: %',n; END IF;
 SELECT count(*) INTO n FROM public.admin_content c WHERE c.kind='practice' AND c.book_slug IS NULL AND c.import_source_key LIKE 'archive-practice-source-%' AND c.sections @> '["listening","reading","writing","speaking"]'::jsonb
 AND (SELECT count(*) FROM public.exam_modules e WHERE e.kind='practice' AND e.parent_id=c.id AND e.module IN ('listening','reading','writing') AND e.revision>0 AND jsonb_array_length(e.document->'parts')>0)=3
 AND EXISTS(SELECT 1 FROM public.speaking_sets s WHERE s.practice_content_id=c.id AND s.published AND s.document IS NOT NULL);
 IF n<>15 THEN RAISE EXCEPTION 'Expected 15 complete sets, got %',n; END IF;
 IF EXISTS(SELECT 1 FROM public.exam_attempts a JOIN public.admin_content c ON a.kind=c.kind AND a.parent_id=c.id WHERE c.kind='practice' AND c.book_slug IS NULL AND c.import_source_key LIKE 'archive-practice-source-%' AND NOT c.sections @> '["listening","reading","writing","speaking"]'::jsonb)
 OR EXISTS(SELECT 1 FROM public.speaking_attempts a JOIN public.speaking_sets s ON s.id=a.set_id JOIN public.admin_content c ON c.id=s.practice_content_id WHERE c.kind='practice' AND c.book_slug IS NULL AND c.import_source_key LIKE 'archive-practice-source-%' AND NOT c.sections @> '["listening","reading","writing","speaking"]'::jsonb) THEN RAISE EXCEPTION 'Partial tests have attempts; preserve history before cleanup'; END IF;
 DELETE FROM public.speaking_sets s USING public.admin_content c WHERE s.practice_content_id=c.id AND c.kind='practice' AND c.book_slug IS NULL AND c.import_source_key LIKE 'archive-practice-source-%' AND NOT c.sections @> '["listening","reading","writing","speaking"]'::jsonb;
 DELETE FROM public.admin_content c WHERE c.kind='practice' AND c.book_slug IS NULL AND c.import_source_key LIKE 'archive-practice-source-%' AND NOT c.sections @> '["listening","reading","writing","speaking"]'::jsonb;
 WITH ranked AS(SELECT id,row_number() OVER(ORDER BY id) num FROM public.admin_content WHERE kind='practice' AND book_slug IS NULL AND import_source_key LIKE 'archive-practice-source-%') UPDATE public.admin_content c SET title='Test - '||ranked.num,updated_at=now() FROM ranked WHERE c.id=ranked.id;
 UPDATE public.speaking_sets s SET title=c.title||' · Speaking',updated_at=now() FROM public.admin_content c WHERE s.practice_content_id=c.id AND c.kind='practice' AND c.book_slug IS NULL AND c.import_source_key LIKE 'archive-practice-source-%';
END $$;
