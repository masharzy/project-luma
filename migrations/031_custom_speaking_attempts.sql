-- Custom Speaking uses an owner-bound snapshot without adding user questions to the public bank.
ALTER TABLE public.speaking_attempts ALTER COLUMN set_id DROP NOT NULL;
