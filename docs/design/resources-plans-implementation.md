# Resources and Plans reference implementation

Implemented 31 October 2026 for https://jumptonine.com.

## Production pages

- Resources: https://jumptonine.com/resources
- Plans: https://jumptonine.com/pricing (the existing canonical URL)
- /plans permanently redirects to /pricing.

The supplied references are retained verbatim at `design-reference/resources.html` and `design-reference/plans.html`; the build prompt is retained alongside them. No context-only prototype header was copied. Header files are unchanged.

## Files and implementation

- Resources page: `src/app/(marketing)/resources/page.tsx`, `src/lib/resources-reference.ts`, `src/components/resource-deck.tsx`, `src/styles/resources-reference.css`.
- Plans page: `src/app/(marketing)/pricing/page.tsx`, `/plans/page.tsx`, `src/components/plans-page.tsx`, `src/components/plan-cards.tsx`, `src/lib/plans-page-data.ts`, `src/lib/plan-presentation.ts`, `src/styles/plans-reference.css`.
- Shared footer: reused globally; current Resources/Plans links now receive aria-current and crimson text. The previously requested tightly fitted vector wordmark is preserved.
- Metadata: page-specific titles, descriptions, canonical/OG tags and nonce-protected JSON-LD; shared OG artwork at `public/images/og-jumptonine.png`.
- Subscription handoff: selected plan ID survives the existing sign-in flow via a strictly validated same-origin return path, then highlights that plan in the existing subscription-request UI. No request, payment or subscription is created by following a public plan link.
- Destination fix: `migrations/027_learning_resources_runtime_read.sql` restores only SELECT on the learning_resources table to luma_auth_runtime. It was tested on an isolated Neon branch before production and executed successfully as the runtime role. Existing publication/access filters remain in the server queries. Writing destination title is now exactly “Writing Samples”.

## Data sources

Resources hub copy and readiness flags are static as specified. There are six primary resources; guides appear only in the quiet Also useful row.

Plans use evaluation_plans, the same records edited by the existing admin panel. Published records only; existing price/name ordering is retained when no explicit sort_order is stored. The adapter supports optional features, tagline, recommended, is_free and sort_order fields and permits at most one recommendation. Existing records without custom feature arrays show real product capability labels, based on their Writing/Speaking allowances. No sample plan names/prices are shipped.

The current admin stores Free limits in evaluation_policy, rather than as a paid-plan row: live values are 5 Writing and 2 Speaking per month. There are currently no published paid plans, so production correctly displays the reference empty state. Null quotas retain the product's Unlimited meaning. Access currently lasts 30 days, so cards show / 30 days rather than claiming calendar-month renewal. Prices use en-US thousands separators.

Paid data and Free policy are server-rendered and cached for 60 seconds. Zero credits, empty plans, missing taglines, long names and unlimited allowances are handled without truncation.

## Route mappings

| Reference | Existing route used |
|---|---|
| /resources/speaking-cue-cards | /resources/cue-cards |
| /resources/writing | /resources/writing |
| /resources/vocabulary | /vocabulary |
| /resources/grammar | /grammar |
| /resources/ebooks | /resources/ebooks |
| /resources/journal | /blog |
| /writing/task-2-guide | /ielts-writing-task-2 |
| /plans | /pricing (permanent redirect provided) |
| /checkout?plan=slug | /dashboard/subscription?plan=actual-plan-id |
| /dashboard/allowance | /dashboard/subscription |

Footer route equivalents are unchanged from the homepage implementation: /cambridge, /other-books, /mocks, /practice, /practice?view=questions, /writing-evaluation, /speaking-evaluation, /auth/sign-up, /auth/forgot-password, /pp and /tos. No unmapped navigation target remains.

## Verification

- TypeScript passed; production compilation passed; all 136 unit/security tests passed. CI validate passed on the implementation PR.
- Full-page screenshots collected for both prototypes and implementations at 360, 390, 768, 1024, 1440 and 1920 pixels (24 images). Two large implementation screenshots were captured in contiguous document-coordinate tiles because full-page capture timed out, then joined without changing page content.
- Count fixtures 0–7 use the production PlansPage/PlanCards renderer outside public/ and outside the build. Verified 4 cards in one row at 1440; 4 as 2×2 at 1024; 5 as 3+2; 6 as 3×2; 7 as auto-fit; tablet odd final card spans the row; phone one column; buttons align within rows. The fixture renderer is retained in scripts/design/render-plan-fixtures.cjs.
- At 320 pixels, Resources and a seven-plan fixture showed no content overflow. Desktop/mobile layouts were also inspected at the six requested widths.
- Cue deck rotates on click and Enter. Keyboard focus triggers Writing highlight, vocabulary fan, grammar replacement, ebook lift/stagger and journal highlight. Reduced-motion overrides disable transitions/animations. No application console errors or hydration/CSP warnings observed on the production hubs.
- Public destinations were requested directly. The four previously failing learning-resource pages now return HTTP 200 after restoring the missing runtime read grant. Main resource links, guides, OG image, /resources and /pricing return HTTP 200; /plans resolves to /pricing.
- Preview lacks DATABASE_URL, so live paid-data verification was performed against production; no credentials were copied or displayed.

## Reference differences and verification limits

The prototype wins over conflicting prose: its Writing Samples tile occupies one outer grid cell with an internal two-column layout on desktop. Its width was followed rather than inventing a new full-row layout. Existing header and the user's later footer wordmark request intentionally remain different from the prototype's contextual header and cropped text baseline. Quiet guide links have 44px touch targets for accessibility.

Google PageSpeed/Lighthouse returned HTTP 429 (quota exceeded). Lighthouse Accessibility/SEO scores of 95+, CLS below 0.05 and a measured performance score are therefore **not certified**. Local checks, browser inspection and responsive screenshots do not substitute for those measurements.

The temporary database test branch is qa-resources-runtime-read-20261031 (br-shiny-sky-a11214ad). No production resource content or plan configuration was created or changed.
