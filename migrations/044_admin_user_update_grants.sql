-- Admin panel actions (Make admin / Remove admin, Block / Unblock, device limit) update these columns,
-- but 003_runtime_grants.sql only allowed name, password_hash, email_verified, session_version, updated_at.
-- Without this the runtime role got "permission denied" and the panel showed "Unable to update this account".
-- Applied to production 2026-11-17.
GRANT UPDATE(role, banned, device_limit) ON app_auth.users TO luma_auth_runtime;
