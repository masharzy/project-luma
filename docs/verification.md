# Verification

## Current checks

- Production Next.js build and strict TypeScript pass.
- 50 automated checks pass: public pages and 404 behavior, anonymous dashboard/admin denial, direct API denial, exact admin-role policy, Cambridge bounds, deferred Speaking route rejection and per-request nonce CSP bound to rendered scripts.
- Browser QA covers desktop public landing, Cambridge, resources and sign-in, Cambridge free-book filtering (10 books), Learn dropdown, mobile navigation and horizontal-overflow checks.
- Local provider-mock QA exercises actual Next.js learner/admin layouts and role boundaries without creating production identities. This is integration/UI verification, not proof of the real owner's provider setup.

## Production identity checks still needed

- Owner-controlled signup/sign-in, reload/session restoration and sign-out.
- Google consent with production OAuth credentials.
- Receipt and completion of real recovery emails with custom SMTP.
- Owner admin-role provisioning and revocation with real managed accounts.

No test users, questions or scores were inserted in the production database. Catalogs and dashboards use empty states. No claims are made that content CRUD, exam execution, scheduling, scoring, premium billing or result publishing are operational.

## Custom authentication branch

- The application no longer depends on Neon Auth or Better Auth. Neon is PostgreSQL only.
- 23 real database/HTTP/SMTP integration checks passed against the disposable validation branch and a local SMTP capture server: signup, verification, login, profile, denial of role injection, DB column permissions, role grant/revocation, password reset, token replay/expiry, session hashing/revocation, OAuth start/callback binding and persistent rate limiting.
- Password/token/secure-cookie unit checks and the existing route/CSP checks are also run for this branch. Google consent with the owner's real client and real inbox delivery remain unverified until credentials are supplied.
- Production identity and existing login remain unchanged. Preview runtime database configuration and owner-controlled Google/SMTP credentials are pending.
