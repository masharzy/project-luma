# Project Luma

IELTS platform foundation: approved Bangla/English landing page, account creation, email/password and Google sign-in, password recovery, and Vercel deployment.

## Stack

Next.js 16 App Router, React 19, TypeScript, Neon Auth (Managed Better Auth), Neon Postgres and Vercel. No Render service is required for this milestone.

## Local development

1. Use Node 24 and run `npm ci`.
2. Copy `.env.example` to `.env.local`. Set the branch's `NEON_AUTH_BASE_URL` and generate a cookie secret with `openssl rand -base64 48`. Never commit that file.
3. Run `npm run dev`.
4. Run `npm run build` and `npm run typecheck` before pushing.
5. With the app running, run `npm test`. Set `TEST_BASE_URL` to check a deployed environment.

## Documents

- [Site map and approved scope](docs/site-map.md)
- [Architecture and folder ownership](docs/architecture.md)
- [Deployment and provider setup](docs/deployment.md)
- [Verification](docs/verification.md)

## Scope

This is the foundation milestone. The account page confirms the authenticated session; it is not a learner dashboard. Practice engines, scheduled mocks, questions, AI scoring, payments, dashboard and admin are planned only. Landing service links explicitly show coming-soon status. No demo users or test questions are seeded.
