ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE INDEX IF NOT EXISTS exam_attempts_user_idx ON public.exam_attempts(user_id,created_at DESC) WHERE user_id IS NOT NULL;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='exam_attempts_user_fk') THEN ALTER TABLE public.exam_attempts ADD CONSTRAINT exam_attempts_user_fk FOREIGN KEY(user_id) REFERENCES app_auth.users(id) ON DELETE SET NULL; END IF; END $$;
