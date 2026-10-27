# Custom authentication migration

## What this branch changes

JumpToNine owns its authentication handlers, password hashing, session/token lifecycle, email verification, password recovery, rate limits, profile updates and admin authorization. Neon is used only as PostgreSQL. No Neon Auth or Better Auth package/service is used by this branch at runtime. `jose` verifies Google's signed ID tokens; Nodemailer delivers application-authored SMTP messages.

## Existing identity

The inspected owner account is verified, has the `admin` role and signs in through Google. It has no password credential. The import preserves its UUID, email, name, verification, role and stable Google subject; provider tokens and managed sessions are not copied.

The import aborts if any legacy password credential exists. Do not silently import users with unusable passwords. Decide a verified recovery/migration plan first if new password accounts appear before cutover.

## Isolated preparation

- Validation database branch: `br-delicate-base-a1kc3il5` (`custom-auth-validation`), expires 2026-10-30.
- `001_custom_auth.sql` creates application-owned tables.
- `002_import_managed_identity.sql` performs a guarded, non-overwriting identity copy.
- `003_runtime_grants.sql` grants a dedicated non-inheriting runtime role access to the auth tables; it cannot update role/banned/email columns, read `neon_auth`, create tables or edit audit history.
- `scripts/migrate-custom-auth.cjs` records checksums and runs each migration atomically. Pass a private env file containing a direct owner URL (`DATABASE_URL_UNPOOLED`) and `AUTH_MIGRATION_MODE=prepare`.
- Create the normal `luma_auth_runtime` login role separately, using a generated password stored privately. It must not inherit `neon_superuser`; do not use a Neon-created privileged role as the runtime role.

## Required owner configuration

Supply server-only Vercel environment variables; never paste secrets into repository files:

- `DATABASE_URL`: scoped runtime connection string, pooled for deployment.
- `APP_ORIGIN`: the one canonical HTTPS application origin, no trailing slash.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: the owner's Google Cloud Web OAuth client. Register exactly `{APP_ORIGIN}/api/auth/google/callback`.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`: an authenticated SMTP service with a verified sender. Port 465 uses implicit TLS; other production ports require STARTTLS. `SMTP_REQUIRE_TLS=false` is accepted only for localhost test capture.

Google credentials and SMTP are not yet supplied. The former shared Neon Google/email configuration cannot be reused as the application's own credentials.

## Cutover sequence

1. Configure and test the Google client and real SMTP sender on the isolated custom-auth preview. Keep production unchanged until the existing Google-only admin has a tested login path.
2. Recheck legacy accounts, prepare the production `app_auth` schema/import and scoped runtime credentials.
3. Configure production variables and deploy the tested custom-auth commit.
4. Have the owner sign in again; verify their original account UUID and `admin` role, profile, session restoration, recovery mail and logout.
5. Remove obsolete `NEON_AUTH_*` environment variables. Retain the old schema for rollback until the owner confirms the migration; do not delete users or disable services as an automatic side effect of preparing this branch.

The production deployment remains on the previous implementation while the missing credentials are supplied. The custom-auth branch is a concrete, testable migration, not an assertion that the live identity cutover has already happened.
