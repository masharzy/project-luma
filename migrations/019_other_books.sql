-- Book collections reuse the practice engine and its existing access controls.
ALTER TABLE public.admin_content ADD COLUMN IF NOT EXISTS book_slug text;
ALTER TABLE public.admin_content ADD CONSTRAINT admin_content_book_slug_check CHECK (
 book_slug IS NULL OR (kind='practice' AND book_slug IN ('collins-1','collins-2','collins-3','barrons','plus-1','plus-2','plus-3'))
);
CREATE INDEX IF NOT EXISTS admin_content_book_catalog_idx ON public.admin_content(book_slug,status) WHERE book_slug IS NOT NULL;
