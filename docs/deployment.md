# Deployment and provider setup

## Infrastructure

- GitHub: `masharzy/project-luma`, production branch `master`.
- Vercel project: `project-luma`, team `masharzys-projects`.
- Neon: project `holy-bird-58277611`, branch `br-ancient-salad-a1pk9zgd`, AWS Singapore.
- Production app: https://project-luma-masharzys-projects.vercel.app

Vercel automatically builds changes pushed to the repository. `vercel.json` sets Next.js and Singapore Functions.

## Environment

`NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET` are server-only variables configured in Vercel. Never prefix them with `NEXT_PUBLIC_`. Rotate the cookie secret if exposed; rotation invalidates cached session cookies.

Register every app origin used for auth callbacks in the branch's Neon Auth trusted domains. Production origin above is registered. Preview origins must be registered individually before testing OAuth or reset callbacks there. Localhost is enabled on this branch.

## Google sign-in

The Google provider currently uses Neon's shared development OAuth credentials. The app integrates the real Google flow. Before public production use, configure the owner's Google OAuth app in Neon Auth; its authorized callback URL is `{NEON_AUTH_BASE_URL}/callback/google`. Keep the Google client secret in the provider console, never in source code.

## Recovery email

Managed Auth sends password reset messages through Neon's shared SMTP while getting started. Production launch requires custom SMTP and verified sender branding in Neon. No separate email-service API keys are needed in this application.

## Release checks

Build and HTTP checks run before release. Browser Google consent and actual recovery email receipt require the owner's Google account and inbox and must be checked before launch. Do not advertise these as verified solely because routes build.
