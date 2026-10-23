# Application architecture

Next.js App Router + strict TypeScript, deployed on Vercel from `master`. A single application serves public marketing, feature collections, learner pages and administration. No Render service is currently required.

## Directory ownership

- `src/app/(marketing)` — landing, public feature catalogs, resource collections and pricing.
- `src/app/(auth)/auth` — sign-in, sign-up and password recovery.
- `src/app/(learner)` — session-protected learner dashboard and profile settings.
- `src/app/(management)/admin` — admin-role-protected workspace and authoring pages.
- `src/app/api/auth` — application-owned auth HTTP handlers.
- `src/app/api/account`, `src/app/api/admin/access` — independently authorized identity/access endpoints.
- `src/components` — public/workspace shells, navigation, catalog filters and authoring forms.
- `src/lib/auth` — server-only provider configuration, guards, pure role policy and browser client.
- `src/config` — brand and structural feature metadata; no question content.
- `src/styles` — approved marketing design, foundation additions and scoped product styles.
- `public/fonts` — self-hosted Hind Siliguri and Manrope plus licenses.
- `docs`, `tests` — product boundaries, security and verification.

## Data and identity

This branch stores identity in `app_auth` on PostgreSQL. Luma owns credential handling, opaque sessions and OAuth orchestration. Profile updates write the application users table. The old `neon_auth` schema is used only by the one-time import. No application content/history schema or seed data is introduced by this page milestone.

All HTML opts into per-request rendering for nonce CSP. Private route responses are no-store. Learner guards check sessions; admin guards additionally validate the current database role. API authorization is enforced independently of page navigation.

## Authoring boundary

Admin question/test/mock/resource forms support bounded plain-text draft input and JSON download. They do not silently persist to browser storage, write records, publish content, create evaluation jobs or send emails. Question/test engines and content APIs will be integrated after the data model and migration approach are agreed.

## Future services

Content storage, user-specific history, bookmarks, secure paid entitlements, server-timed mocks, reminders, durable evaluation and transactional bulk result release require independent server operations with resource-level authorization. Their page entry points are now present; the services are not represented as running.
