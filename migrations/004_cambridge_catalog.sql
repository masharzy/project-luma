CREATE TABLE IF NOT EXISTS public.cambridge_tests (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 book_number integer NOT NULL CHECK (book_number > 0),
 test_number integer NOT NULL CHECK (test_number > 0),
 title text NOT NULL DEFAULT '',
 access text NOT NULL DEFAULT 'free' CHECK (access IN ('free','premium')),
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
 sections jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(sections) = 'array'),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (book_number, test_number)
);
CREATE INDEX IF NOT EXISTS cambridge_tests_published_idx ON public.cambridge_tests (book_number, test_number) WHERE status='published';
