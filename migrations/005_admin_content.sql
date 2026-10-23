CREATE TABLE IF NOT EXISTS public.admin_content (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 kind text NOT NULL CHECK (kind IN ('practice','mock','vocabulary')),
 title text NOT NULL CHECK (length(trim(title)) > 0),
 description text NOT NULL DEFAULT '',
 sections jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(sections)='array'),
 access text NOT NULL DEFAULT 'free' CHECK (access IN ('free','premium')),
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
 scheduled_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_content_kind_idx ON public.admin_content(kind,status,created_at DESC);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.admin_content TO luma_auth_runtime;
GRANT USAGE,SELECT ON SEQUENCE public.admin_content_id_seq TO luma_auth_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.cambridge_tests TO luma_auth_runtime;
GRANT USAGE,SELECT ON SEQUENCE public.cambridge_tests_id_seq TO luma_auth_runtime;
