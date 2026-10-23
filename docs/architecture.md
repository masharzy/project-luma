# Foundation architecture

Next.js App Router + strict TypeScript, deployed on Vercel from `master`. One application keeps this milestone small; no separate Render service is needed.

## Directory ownership

- `src/app/(marketing)` — landing and service availability page.
- `src/app/(auth)/auth` — sign-in, sign-up and password recovery routes.
- `src/app/(account)` — minimal protected account confirmation.
- `src/app/api/auth` — official SDK handler; no custom password/session implementation.
- `src/app/api/account` — server session authorization example for later API routes.
- `src/components` — shared header/footer and auth UI.
- `src/lib/auth` — server-only provider configuration and client wrapper.
- `src/config` — central brand settings.
- `src/styles` — approved landing stylesheet and scoped foundation additions.
- `public/fonts` — self-hosted Hind Siliguri and Manrope.
- `docs` — scope, architecture, site map, deployment and verification notes.
- `tests` — HTTP integration checks; never seed real users or exam content.

## Identity and data

New Neon project `project-luma`, Singapore region, holds managed identity in `neon_auth`. The application uses `@neondatabase/auth`'s official same-origin Next.js handler, Google OAuth integration and cached session cookies. Passwords never enter application storage. No application database schema, demo content, exam records or migrated legacy data are included.

`proxy.ts` redirects unauthenticated `/account` traffic. `/account` and `/api/account` also check sessions on the server; future protected operations must do the same. API responses use no-store.

## Future extension points

Add feature code only with the next approved milestone. Practice engine migration, dashboard, admin, question import, scoring workers, SMTP branding, payments and mock synchronization remain separate work. See `site-map.md` for route intent. Domain logic can later move under `src/features/<feature>` when a feature actually exists; empty framework layers and unused APIs are intentionally absent.
