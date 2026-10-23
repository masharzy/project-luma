CREATE TABLE IF NOT EXISTS public.exam_modules (
 kind text NOT NULL CHECK(kind IN ('cambridge','practice','mock')),
 parent_id bigint NOT NULL,
 module text NOT NULL CHECK(module IN ('listening','reading','writing')),
 cambridge_id bigint REFERENCES public.cambridge_tests(id) ON DELETE CASCADE,
 content_id bigint REFERENCES public.admin_content(id) ON DELETE CASCADE,
 document jsonb NOT NULL CHECK(jsonb_typeof(document)='object'),
 revision integer NOT NULL DEFAULT 1,
 updated_by uuid REFERENCES app_auth.users(id) ON DELETE SET NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(kind,parent_id,module),
 CHECK ((kind='cambridge' AND cambridge_id=parent_id AND content_id IS NULL) OR (kind IN ('practice','mock') AND content_id=parent_id AND cambridge_id IS NULL))
);
GRANT SELECT,INSERT,UPDATE ON public.exam_modules TO luma_auth_runtime;
