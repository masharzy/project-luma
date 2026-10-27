-- Link book Speaking sets to the same practice test as Listening/Reading/Writing.
ALTER TABLE public.admin_content DROP CONSTRAINT IF EXISTS admin_content_book_slug_check;
ALTER TABLE public.admin_content ADD CONSTRAINT admin_content_book_slug_check CHECK (
 book_slug IS NULL OR (kind='practice' AND book_slug IN (
 'collins-1','collins-2','collins-3','barrons','plus-1','plus-2','plus-3',
 'achieve-ielts','trainer-1','trainer-2','official-guide','official-materials','oxford-ielts','succeed-ielts','ielts-simulation'))
);
ALTER TABLE public.speaking_sets ADD COLUMN IF NOT EXISTS practice_content_id bigint REFERENCES public.admin_content(id);
CREATE UNIQUE INDEX IF NOT EXISTS speaking_sets_practice_content_unique ON public.speaking_sets(practice_content_id) WHERE practice_content_id IS NOT NULL;
