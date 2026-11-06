-- Allow Speaking links to book content without exposing Recent Tests.
-- Generated keys keep practice_content_id as the only link callers write.
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.speaking_sets'::regclass
      AND conname = 'speaking_sets_book_content_fk'
  ) THEN
    ALTER TABLE public.admin_content
      ADD COLUMN speaking_book_content boolean
        GENERATED ALWAYS AS (kind = 'practice' AND book_slug IS NOT NULL) STORED,
      ADD CONSTRAINT admin_content_speaking_book_key UNIQUE (id, speaking_book_content),
      DROP CONSTRAINT IF EXISTS practice_no_speaking,
      ADD CONSTRAINT practice_no_speaking CHECK (
        kind <> 'practice' OR book_slug IS NOT NULL OR (
          NOT (sections ? 'speaking')
          AND NOT (coalesce(durations, '{}'::jsonb) ? 'speaking')
        )
      );

    ALTER TABLE public.speaking_sets
      ADD COLUMN requires_book_content boolean
        GENERATED ALWAYS AS (CASE WHEN practice_content_id IS NOT NULL THEN true END) STORED,
      ADD CONSTRAINT speaking_sets_book_content_fk
        FOREIGN KEY (practice_content_id, requires_book_content)
        REFERENCES public.admin_content (id, speaking_book_content),
      DROP CONSTRAINT IF EXISTS speaking_sets_no_practice_link;
  END IF;
END
$migration$;
