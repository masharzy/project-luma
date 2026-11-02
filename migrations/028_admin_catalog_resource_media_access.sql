-- Permissions required by existing server-validated admin management endpoints.
-- Do not grant unrelated table/role privileges or expose database credentials.
GRANT INSERT, UPDATE ON public.book_series, public.book_volumes TO luma_auth_runtime;
GRANT INSERT, UPDATE, DELETE ON public.learning_resources TO luma_auth_runtime;
GRANT USAGE, SELECT ON SEQUENCE public.learning_resources_id_seq TO luma_auth_runtime;
GRANT SELECT, INSERT ON public.media_assets TO luma_auth_runtime;
