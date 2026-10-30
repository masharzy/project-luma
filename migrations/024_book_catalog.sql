-- Dynamic catalog; legacy slugs and existing test records are preserved.
CREATE TABLE IF NOT EXISTS public.book_series (slug TEXT PRIMARY KEY CHECK(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),name TEXT NOT NULL CHECK(char_length(name) BETWEEN 2 AND 120),cover TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft','published')),created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.book_volumes (slug TEXT PRIMARY KEY CHECK(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),series_slug TEXT NOT NULL REFERENCES public.book_series(slug) ON UPDATE CASCADE,title TEXT NOT NULL CHECK(char_length(title) BETWEEN 2 AND 180),volume TEXT NOT NULL CHECK(char_length(volume) BETWEEN 1 AND 80),isbn TEXT NOT NULL DEFAULT '',cover TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft','published')),created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
INSERT INTO public.book_series(slug,name,cover) VALUES ('collins','Collins','/images/books/collins-1.jpg'),
('barrons','Barron''s','/images/books/barrons.jpg'),
('practice-tests-plus','Practice Tests Plus','/images/books/plus-1.jpg'),
('achieve-ielts','Achieve IELTS','/images/books/achieve-ielts.webp'),
('ielts-trainer','IELTS Trainer','/images/books/trainer-1.jpg'),
('official-guide','Official Cambridge Guide','/images/books/official-guide.jpg'),
('official-materials','Official IELTS Practice Materials','/images/books/official-materials.jpg'),
('oxford-ielts','Oxford IELTS','/images/books/oxford-ielts.jpg'),
('succeed-ielts','Succeed in IELTS','/images/books/succeed-ielts.jpg'),
('ielts-simulation','IELTS Simulation Tests','/images/books/ielts-simulation.jpg') ON CONFLICT(slug) DO NOTHING;
INSERT INTO public.book_volumes(slug,series_slug,title,volume,isbn,cover) VALUES ('collins-1','collins','IELTS Practice Tests','Volume 1','9780007499694','/images/books/collins-1.jpg'),
('collins-2','collins','IELTS Practice Tests','Volume 2','9780007598137','/images/books/collins-2.jpg'),
('collins-3','collins','IELTS Practice Tests','Volume 3','9780008453220','/images/books/collins-3.jpg'),
('barrons','barrons','IELTS Practice Exams','Academic','9781506268156','/images/books/barrons.jpg'),
('plus-1','practice-tests-plus','IELTS Practice Tests Plus','Book 1','9780582471696','/images/books/plus-1.jpg'),
('plus-2','practice-tests-plus','IELTS Practice Tests Plus','Book 2','9781405833127','/images/books/plus-2.jpg'),
('plus-3','practice-tests-plus','IELTS Practice Tests Plus','Book 3','9781408262535','/images/books/plus-3.jpg'),
('achieve-ielts','achieve-ielts','Practice Test Book','Academic','','/images/books/achieve-ielts.webp'),
('trainer-1','ielts-trainer','Six Practice Tests','Book 1','','/images/books/trainer-1.jpg'),
('trainer-2','ielts-trainer','Six Practice Tests','Book 2','','/images/books/trainer-2.jpg'),
('official-guide','official-guide','The Official Cambridge Guide to IELTS','Academic','','/images/books/official-guide.jpg'),
('official-materials','official-materials','Official IELTS Practice Materials','Academic','','/images/books/official-materials.jpg'),
('oxford-ielts','oxford-ielts','IELTS Practice Tests','Academic','','/images/books/oxford-ielts.jpg'),
('succeed-ielts','succeed-ielts','9 Practice Tests','Academic','','/images/books/succeed-ielts.jpg'),
('ielts-simulation','ielts-simulation','IELTS Simulation Tests','Academic','','/images/books/ielts-simulation.jpg') ON CONFLICT(slug) DO NOTHING;
