-- Run as migration owner after separately creating the non-inheriting login role.
GRANT USAGE ON SCHEMA app_auth TO luma_auth_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA app_auth TO luma_auth_runtime;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA app_auth TO luma_auth_runtime;
REVOKE ALL ON app_auth.users FROM luma_auth_runtime;
GRANT SELECT ON app_auth.users TO luma_auth_runtime;
GRANT INSERT(email,name,password_hash,email_verified) ON app_auth.users TO luma_auth_runtime;
GRANT UPDATE(name,password_hash,email_verified,session_version,updated_at) ON app_auth.users TO luma_auth_runtime;
REVOKE UPDATE,DELETE ON app_auth.audit_events FROM luma_auth_runtime;
