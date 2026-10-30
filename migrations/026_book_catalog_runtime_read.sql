-- Public catalog pages execute through the existing application runtime role.
-- Migration 024 creates these tables as owner; grant only the reads needed by
-- More Books, series/volume pages and catalog joins in published test queries.
-- Idempotent; does not grant writes, ownership or access to other tables.
GRANT SELECT ON TABLE public.book_series, public.book_volumes TO luma_auth_runtime;
