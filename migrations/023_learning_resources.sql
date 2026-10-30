-- Admin-managed editorial resources. Body is plain text; URLs must be HTTPS.
CREATE TABLE IF NOT EXISTS public.learning_resources (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 180),
 category TEXT NOT NULL CHECK (category IN ('writing','ebook','journal','grammar')),
 body TEXT NOT NULL DEFAULT '' CHECK (char_length(body)<=50000),
 source_url TEXT CHECK (source_url IS NULL OR (char_length(source_url)<=2000 AND source_url ~ '^https://[^[:space:]]+$')),
 access TEXT NOT NULL DEFAULT 'free' CHECK (access IN ('free','premium')),
 status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS learning_resources_category_status_idx ON public.learning_resources(category,status,created_at DESC);
