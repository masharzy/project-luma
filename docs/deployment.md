# Deployment

GitHub: `masharzy/project-luma`. Vercel: `masharzys-projects/project-luma`, production branch `master`.
Production origin: https://project-luma-masharzys-projects.vercel.app

The `custom-auth` branch replaces managed identity with Luma's own PostgreSQL-backed authentication. Its schema, private configuration, preview and tests are isolated. Production remains on the previous deployment until the owner's Google OAuth client and SMTP are supplied and the existing admin's new sign-in path is tested.

See `custom-auth-migration.md` for the required server variables, exact OAuth callback and cutover/rollback sequence. `.env.example` documents the new variable names. Do not expose any database, Google or SMTP credentials through `NEXT_PUBLIC_*`.

Vercel protection remains enabled. Review links bypass hosting protection only; they do not bypass the app's login/admin checks.
