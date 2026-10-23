# Foundation verification

## Completed

- Next.js production build and strict TypeScript check pass.
- Ten HTTP integration checks pass against the local production server: six public pages, protected account redirect, direct account API returning 401 with no-store, managed auth session endpoint, and a real 404.
- App uses the official Neon Auth SDK proxy, server session checks and provider-backed email/password/Google methods. No fake auth or local user data.
- Font assets are self-hosted; font licenses are included.
- Environment files are ignored by Git; cookie secret is stored privately in Vercel and local development configuration.

## Requires owner verification before public launch

- Create a real account; sign in, reload to confirm session restoration, and sign out.
- Complete Google consent with the owner's Google account. Shared provider credentials are for development; configure production credentials first.
- Request a recovery email, receive it in a controlled inbox, and complete a real password reset. Configure production SMTP first.

No test accounts, exam records or seed data were created in the production database. HTTP checks do not establish full Google/inbox end-to-end success. Local automated Chromium visual testing was unavailable because the browser download was blocked/truncated; production visual review remains to be completed.
