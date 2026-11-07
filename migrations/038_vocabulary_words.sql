BEGIN;
-- IELTS vocabulary: original content, ordered. Words at position <= 100 are free for everyone;
-- later words open by plan (plan access "vocabulary" = how many extra words, oldest position first).
CREATE TABLE IF NOT EXISTS public.vocab_words (
 id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 position integer NOT NULL CHECK(position>0),
 word text NOT NULL CHECK(word ~ '^[a-z][a-z -]*$'),
 pos text[] NOT NULL DEFAULT '{}',
 tier text NOT NULL CHECK(tier IN('core','advanced','niche')),
 band smallint NOT NULL CHECK(band IN(6,7,8)),
 topics text[] NOT NULL DEFAULT '{}',
 use_in text[] NOT NULL DEFAULT '{}',
 meaning_en text NOT NULL CHECK(length(trim(meaning_en))>0),
 meaning_bn text NOT NULL CHECK(length(trim(meaning_bn))>0),
 examples jsonb NOT NULL CHECK(jsonb_typeof(examples)='array'),
 collocations text[] NOT NULL DEFAULT '{}',
 word_family text[] NOT NULL DEFAULT '{}',
 synonyms text[] NOT NULL DEFAULT '{}',
 antonyms text[] NOT NULL DEFAULT '{}',
 test jsonb NOT NULL CHECK(jsonb_typeof(test)='object'),
 published boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS vocab_words_word_key ON public.vocab_words(word);
CREATE UNIQUE INDEX IF NOT EXISTS vocab_words_position_key ON public.vocab_words(position);
CREATE INDEX IF NOT EXISTS vocab_words_topics_idx ON public.vocab_words USING gin(topics);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.vocab_words TO luma_auth_runtime;
GRANT USAGE,SELECT ON SEQUENCE public.vocab_words_id_seq TO luma_auth_runtime;
COMMIT;
