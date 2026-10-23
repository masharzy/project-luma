# Deployment

GitHub: `masharzy/project-luma`. Vercel: `masharzys-projects/project-luma`, production branch `master`.
Production origin: https://project-luma-masharzys-projects.vercel.app

The `custom-auth` branch replaces managed identity with Luma's own PostgreSQL-backed authentication. Its schema, private configuration, preview and tests are isolated. Production remains on the previous deployment until the owner's Google OAuth client and SMTP are supplied and the existing admin's new sign-in path is tested.

See `custom-auth-migration.md` for the required server variables, exact OAuth callback and cutover/rollback sequence. `.env.example` documents the new variable names. Do not expose any database, Google or SMTP credentials through `NEXT_PUBLIC_*`.

Vercel protection remains enabled. Review links bypass hosting protection only; they do not bypass the app's login/admin checks.

## Resend email and Google login

Set these in Vercel Production, then redeploy:

- `RESEND_API_KEY`: a Resend sending API key; never use a NEXT_PUBLIC prefix.
- `RESEND_FROM_EMAIL`: `Luma <auth@your-verified-domain>` using a verified Resend domain.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: your Google Cloud web OAuth client.
- `APP_ORIGIN`: `https://project-luma-masharzys-projects.vercel.app` (already configured).

Google authorized JavaScript origin: `https://project-luma-masharzys-projects.vercel.app`
Google authorized redirect URI: `https://project-luma-masharzys-projects.vercel.app/api/auth/google/callback`

Resend takes precedence over optional SMTP. A configured Resend key with a missing sender fails closed. Provider errors are sanitized; token-bearing email content and keys are never logged. No email is sent merely by deploying. Domain verification and Google client creation must be completed in the provider accounts.
