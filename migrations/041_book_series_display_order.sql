BEGIN;
-- Shared display order for the home bookshelf and /other-books catalog.
-- Home renders Cambridge first; book series then follow this order.
ALTER TABLE public.book_series
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 1000;

UPDATE public.book_series
SET sort_order = CASE slug
  WHEN 'official-guide' THEN 10
  WHEN 'official-materials' THEN 20
  WHEN 'practice-tests-plus' THEN 30
  WHEN 'achieve-ielts' THEN 40
  WHEN 'barrons' THEN 50
  WHEN 'collins' THEN 60
  WHEN 'ielts-simulation' THEN 70
  WHEN 'ielts-trainer' THEN 80
  WHEN 'oxford-ielts' THEN 90
  WHEN 'succeed-ielts' THEN 100
  ELSE sort_order
END
WHERE slug IN (
  'official-guide','official-materials','practice-tests-plus',
  'achieve-ielts','barrons','collins','ielts-simulation',
  'ielts-trainer','oxford-ielts','succeed-ielts'
);
COMMIT;
