-- QA cases transition from queued -> running -> completed in this JSON column.
-- Keep identifiers, ownership, timestamps and deletion outside runtime UPDATE rights.
GRANT UPDATE (result) ON public.ai_lab_runs TO luma_auth_runtime;
