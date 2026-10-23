# Verification

## Current checks

- Production Next.js build and strict TypeScript pass.
- 46 automated checks pass: public pages and 404 behavior, anonymous dashboard/admin denial, direct API denial, exact admin-role policy, Cambridge bounds, deferred Speaking route rejection and per-request nonce CSP bound to rendered scripts.
- Browser QA covers desktop public landing, Cambridge, resources and sign-in, Cambridge free-book filtering (10 books), Learn dropdown, mobile navigation and horizontal-overflow checks.
- Local provider-mock QA exercises actual Next.js learner/admin layouts and role boundaries without creating production identities. This is integration/UI verification, not proof of the real owner's provider setup.

## Production identity checks still needed

- Owner-controlled signup/sign-in, reload/session restoration and sign-out.
- Google consent with production OAuth credentials.
- Receipt and completion of real recovery emails with custom SMTP.
- Owner admin-role provisioning and revocation with real managed accounts.

No test users, questions or scores were inserted in the production database. Catalogs and dashboards use empty states. No claims are made that content CRUD, exam execution, scheduling, scoring, premium billing or result publishing are operational.
