CREATE TABLE IF NOT EXISTS public.cambridge_books (
 book_number integer PRIMARY KEY CHECK(book_number BETWEEN 1 AND 1000),
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 180),
 access text NOT NULL DEFAULT 'free' CHECK(access IN ('free','premium')),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.cambridge_books(book_number,title,access,status)
 SELECT book_number,'Cambridge '||book_number,
 CASE WHEN bool_and(access='premium') THEN 'premium' ELSE 'free' END,
 CASE WHEN bool_or(status='published') THEN 'published' WHEN bool_and(status='archived') THEN 'archived' ELSE 'draft' END
 FROM public.cambridge_tests GROUP BY book_number ON CONFLICT DO NOTHING;
ALTER TABLE public.cambridge_tests ADD COLUMN IF NOT EXISTS durations jsonb NOT NULL DEFAULT '{"listening":30,"reading":60,"writing":60}'::jsonb;
UPDATE public.cambridge_tests t SET durations=t.durations || COALESCE((SELECT jsonb_object_agg(e.module,(e.document->>'durationMinutes')::integer) FROM public.exam_modules e WHERE e.kind='cambridge' AND e.parent_id=t.id),'{}'::jsonb);
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='cambridge_tests_book_fk') THEN ALTER TABLE public.cambridge_tests ADD CONSTRAINT cambridge_tests_book_fk FOREIGN KEY(book_number) REFERENCES public.cambridge_books(book_number); END IF; END $$;
CREATE TABLE IF NOT EXISTS public.exam_attempts (
 id uuid PRIMARY KEY, owner_hash text NOT NULL, kind text NOT NULL CHECK(kind IN ('cambridge','practice')),
 parent_id bigint NOT NULL, title text NOT NULL, snapshot jsonb NOT NULL,
 current_index integer NOT NULL DEFAULT 0, deadline timestamptz,
 results jsonb NOT NULL DEFAULT '[]'::jsonb, answers jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours'
);
CREATE INDEX IF NOT EXISTS exam_attempts_expiry_idx ON public.exam_attempts(expires_at);
GRANT SELECT,INSERT,UPDATE ON public.cambridge_books,public.exam_attempts TO luma_auth_runtime;
