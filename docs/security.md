# Security controls and verification boundary

## Implemented

- Official Neon Auth handles passwords, CSRF/origin validation, sessions and OAuth. No custom token, password or browser role implementation.
- `/dashboard`, `/settings`, `/account` and `/admin` are protected by the Next.js proxy. Server layouts perform independent session checks.
- Admin access requires the explicit `admin` role from Neon Auth. Role checks bypass the SDK cookie cache and fail closed on provider errors. Email strings, query params, profile fields and browser storage do not confer permissions.
- Direct `/api/admin/access` checks authentication and role itself (401/403). No admin mutation endpoints have been introduced.
- Private workspace responses and account/admin API responses use no-store. Private routes have noindex metadata and are excluded from robots discovery.
- HTML responses use a cryptographically generated per-request CSP nonce. Scripts require the nonce; production script/style policies do not allow unsafe-inline or unsafe-eval. Root HTML is rendered per request so a nonce is never shared through static HTML caching.
- Clickjacking, MIME sniffing and unnecessary camera/microphone/geolocation access are blocked. Auth secrets remain server-only and Git-ignored.
- Draft authoring accepts bounded plain-text fields, exports JSON only and does not render raw HTML. Exported drafts never publish, submit marks, create jobs or send emails.
- Cambridge 11–21 pages expose book metadata only. No premium question content, answers or exercise payloads are included in browser assets.

## Owner setup

No account is automatically elevated to admin. An owner must first identify their account and have its managed Neon Auth role set through a trusted provider administration flow. Do not add a public bootstrap endpoint, hard-coded password, client-side role override or email-only allowlist.

## Still required before public production launch

- Owner-controlled Google OAuth credentials and custom SMTP (previous foundation requirement).
- Verified real-user signup, session restoration, sign-out, recovery-email receipt and Google consent.
- Full end-to-end role-revocation testing with controlled learner/admin identities.
- When content APIs are introduced: authorization at every read/write boundary, strict schemas and input limits, persistent audit logs, rate limits, private media policy, entitlement enforcement and transactional admin-only mock publication. UI gates are not substitutes for those controls.
- Scheduler, queues, evaluation, payments and content storage are not implemented in this page-building milestone. They must not be described as operational or independently security-audited.

The implemented controls reduce specific risks. This document is not a claim of an external penetration test or absolute security.
