-- Internal provenance key makes archive imports repeatable without changing learner titles.
ALTER TABLE public.admin_content ADD COLUMN IF NOT EXISTS import_source_key text;
CREATE UNIQUE INDEX IF NOT EXISTS admin_content_import_source_key_unique ON public.admin_content(import_source_key) WHERE import_source_key IS NOT NULL;
