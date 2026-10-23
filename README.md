# Project Luma

A bilingual IELTS platform built with Next.js, React, TypeScript and Neon Auth, deployed from GitHub to Vercel.

## Implemented pages

- Approved landing page and responsive navigation with a red sign-in button.
- Free practice, Listening/Reading/Writing collections, searchable Cambridge 1–21 shelf, book pages, scheduled mocks, learning resources, Writing samples, ebooks, vocabulary, grammar, journal and Free/Premium comparison.
- Authenticated learner workspace: overview, practice history, mocks, published results, saved resources and profile settings.
- Role-protected admin workspace: overview, question bank, test collection, mock planning, resources, results release, users and settings. Authoring forms export draft JSON; publishing is not simulated.
- Connected email/password and Google authentication, password recovery, session checks and real profile-name updates.

## Current integration boundary

No demo users, questions, attempts, articles or scores are seeded. Catalogs have honest empty states. Question engines, content CRUD, persistent history/saves, scheduling, reminders, AI evaluation, transactions for publishing and payments remain later integrations. No Speaking or chatbot implementation.

## Local development

1. Use Node 24; run `npm ci`.
2. Copy `.env.example` to `.env.local`. Supply the branch's `NEON_AUTH_BASE_URL` and generate `NEON_AUTH_COOKIE_SECRET` using `openssl rand -base64 48`. Never commit secrets.
3. Run `npm run dev`.
4. Run `npm run build` and `npm run typecheck`.
5. With the app running, run `npm test`; set `TEST_BASE_URL` to test a deployed environment. HTTP tests assume an anonymous session and no Vercel protection wall.

Admin access requires the explicit managed `admin` role, verified server-side. No user is automatically elevated. Production OAuth credentials, SMTP and full owner-account verification remain launch requirements.

## Documentation

- [Site map and feature boundaries](docs/site-map.md)
- [Architecture](docs/architecture.md)
- [Deployment](docs/deployment.md)
- [Security](docs/security.md)
- [Verification](docs/verification.md)
