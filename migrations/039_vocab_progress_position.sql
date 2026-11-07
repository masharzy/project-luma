BEGIN;
-- Positions can be swapped and shifted inside one statement; the check happens at the end.
DROP INDEX IF EXISTS public.vocab_words_position_key;
ALTER TABLE public.vocab_words ADD CONSTRAINT vocab_words_position_key UNIQUE(position) DEFERRABLE INITIALLY DEFERRED;
-- Learner progress: box 0 = new/not known, 1-5 = Leitner boxes. Guests keep progress in the browser.
CREATE TABLE IF NOT EXISTS public.vocab_progress (
 user_id uuid NOT NULL REFERENCES app_auth.users(id) ON DELETE CASCADE,
 word_id integer NOT NULL REFERENCES public.vocab_words(id) ON DELETE CASCADE,
 box smallint NOT NULL DEFAULT 1 CHECK(box BETWEEN 0 AND 5),
 seen integer NOT NULL DEFAULT 0,
 due_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,word_id)
);
CREATE INDEX IF NOT EXISTS vocab_progress_user_idx ON public.vocab_progress(user_id,due_at);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.vocab_progress TO luma_auth_runtime;
COMMIT;
