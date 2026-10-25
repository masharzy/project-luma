# Evaluation membership release — 2026-10-25

Writing loading warning: imported Writing stores its prompt on the Part and its answers as `writing_draft_<partId>`, without separate question rows. The exam now shows a missing-prompt warning only when the Part prompt is actually absent. Existing draft keys, task layout and submission are preserved.

## Configuration and access

- `/admin/subscriptions`: global free Writing/Speaking monthly quotas, create/edit/publish/hide evaluation plans, BDT price per 30 days, independently finite/zero/unlimited Writing and Speaking allowances, subscriber email search, approve/reject pending requests, manual activation and cancellation.
- `/dashboard/subscription`: remaining allowances, usage, subscription history/expiry, published plan requests and immediate cancellation.
- `/pricing`: reads the same published plans/free limits. Writing/Speaking product pages show current remaining allowance and a link to membership management.
- `/admin/evaluations`: per-account overrides retain precedence over subscriptions and free defaults. Zero denies new evaluations. Existing override expiry remains enforced.
- Cambridge Writing now uses `writing_product`, shared with standalone Writing Evaluation. Speaking uses `speaking_product`. Legacy Cambridge usage is included when checking and displaying Writing consumption; old job/refund records remain unchanged. Practice Writing retains its existing explicit `practice_writing` override policy.
- Initial free quotas are **0 / 0** and no Premium plan is invented or published. The admin sets the commercial values. No existing grants/subscriptions are modified by schema migration.
- Monthly limits reset on the first day of each UTC calendar month, independently of the subscription's 30-day expiry. Changing/renewing/cancelling a plan does not reset used credits. One Writing submission (one or both tasks) consumes one credit; Speaking evaluation consumes its own credit. Existing hourly/daily abuse limits still apply to unlimited plans.
- Plans are evaluation access only, not a new entitlement to premium Cambridge books. Existing library restrictions remain enforced.

## Subscription lifecycle and security

Requests remain pending until an administrator approves payment/complimentary access. Approval/manual activation starts 30 days, snapshots the agreed price and quotas, and replaces current active access. Editing/unpublishing a plan affects future requests, not active snapshots. One pending and one active subscription per account are enforced by partial unique indexes. Expired/cancelled subscriptions fall back to free policy; explicit account overrides still take precedence. Cancel is immediate, with no automated refund. There is no payment gateway or auto-renewal in this release.

API mutations require a verified session, same-origin JSON, bounded validation and rate limits. Admin mutations additionally check the database-backed admin role. User cancellation is constrained by both subscription ID and session user ID. Audit events are stored. Conditional quota reservations remain atomic with job creation and idempotent retries/refunds.

Migration: `migrations/013_evaluation_plans.sql`, additive tables/function/indexes/runtime grants. Tested on validation branch before production. `scripts/test-membership-policy.sql` verifies free/paid/override/zero/unlimited/expiry/cancellation and actual approve/assign SQL inside a rollback-only fixture block.

## Verification

Focused model/input/source/quota/security tests pass. Production build and TypeScript pass. Browser fixtures verify imported Writing prompt/reference image, no false loading warning, Task 1/2 draft preservation; desktop/mobile membership policy edit, plan creation, approval confirmation, independent remaining balances, no page overflow or JS errors. These UI fixtures mock APIs; the policy/activation SQL is separately executed on the validation database. No payment is collected and no paid AI evaluation/TTS is invoked for these tests.
