# Listening/Reading tests and separate Writing evaluation

## Scope
- Admin Practice/Cambridge test creation accepts Listening, Reading, Writing and Speaking with module minutes. New tests default to L/R; books remain metadata-only.
- Every newly started Full Test runs selected Listening/Reading modules only. The public Cambridge action says `Start Full Test (LR only)` and counts only those minutes. A Writing-only test has no full-test action. Existing attempt snapshots remain intact.
- Writing opens separately in the shared timed exam interface. Submit saves the original responses; the result page automatically requests feedback for verified account-owned attempts. Guests can practise and review, but cannot request AI feedback.
- Speaking is a reserved creation capability, not an activated public module. This PR does not merge the older speaking-room branch or implement live Mock Speaking.
- Standalone Writing/Speaking products remain deferred. Their allowance namespaces are reserved, never charged by Cambridge/Practice.

## Provider
`qwen3.8-flash` is used for text and reference chart/image input. No Omni, transcription or audio call is made. The provider is replaceable in `src/lib/evaluation/provider.ts`.
- Set server-only `DASHSCOPE_API_KEY` to a Singapore pay-as-you-go Model Studio API key.
- Set `QWEN_BASE_URL` to the matching endpoint; default deployment config uses `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`. Workspace endpoints under `aliyuncs.com` are also accepted.
- Do not use a Coding Plan key for backend evaluation.
- Structured output is validated server-side. Reasoning is disabled; output capped at 4000 tokens and a 90-second timeout. Original answer excerpts used for corrections must match the actual submission. Task 2 receives twice the weight; the server calculates the combined estimate. Unscorable submissions return no combined band.
- Images are passed to the provider; our server does not download arbitrary image URLs. Learners cannot supply a new question, image, model or prompt through the evaluation API.
- The model has not been calibrated against IELTS teachers. Scores are practice estimates, not official results or a proven accuracy claim.

## Database and access
Apply migrations 010 then 011 after existing migration 009. They are additive and preserve existing attempts. On 2026-10-24 both migrations were validated on a child Neon branch, then applied to main. No sample content or user allowance was added to production.
`/admin/evaluations` manages source-specific grants with an expiry and a monthly allowance (null = unlimited; 0 = disabled).
- `cambridge_writing`
- `practice_writing`
- `writing_product` (reserved)
- `speaking_product` (reserved)
No grant means no evaluation access; there is no invented premium/payment status or automatic grant. This page does not implement billing or unlock premium test content, which retains the existing access policy. Monthly counters reset by UTC calendar month. Unlimited allowances retain per-account/network hourly anti-spam limits. Device/session restrictions and IP-based monthly cross-account quotas are not part of this change.

A job's unique attempt ID prevents duplicate reservations. The counter reservation and job insertion are one PostgreSQL statement. One active job is allowed per account. Permanent failure returns its reservation in one atomic, idempotent update. Original responses are retained in the existing attempt. Account-owned evaluations are also accessible from Dashboard Results after the attempt expiry; access is checked by user ID on every API read. Mock publication remains unchanged.

## Background processing
`@vercel/queue` publishes only the job UUID to `luma-writing-evaluation`. `vercel.json` registers the callback. The worker loads the immutable snapshot from PostgreSQL, leases the job and persists the assessment, model and usage. Three processing attempts maximum. The SDK retries delivery; completed jobs are idempotent. Browser closure after successful queue acceptance does not cancel processing.

The initial DB insert and queue publish are separate services. If publishing fails, the job remains pending and the learner can press **Resume evaluation** to republish using the same idempotency key. There is currently no scheduled outbox reconciler; never claim exactly-once provider billing. A crash after a provider response but before database persistence may cause another provider call. Queue/compute usage is separate from model API usage.

On Vercel, Queue uses platform OIDC. A provider key alone does not prove queue delivery. Validate one real queued evaluation after deployment. Local end-to-end provider/queue testing requires Vercel local credentials; focused tests instead use a mocked provider and database transaction checks.

## Dependency security
The Queue SDK uses the existing compatible `@vercel/oidc` 3.2.0 API (`getVercelOidcToken`) via an npm override. This avoids the newer CLI-config dependency that pins vulnerable Zod. The AI SDK already uses the same OIDC version. The production dependency audit after this override reports zero advisories. Recheck this override when updating Queue; real platform queue delivery still requires the deployment E2E check described above.

## Validation
- Optimized Next.js build and typecheck.
- 14 focused tests: L/R selection; authoring capabilities; task/image snapshots; Task 2 weighting; invalid/unsupported model evidence; owner/access checks; duplicate reservation; bounded real SDK request using mocked fetch.
- Neon transaction assertions: duplicate job rolls back reservation; exhausted quota; unlimited grant; refund exactly once; standalone quota untouched; runtime role privileges.
- Browser QA with mocked APIs: automatic single evaluation request, structured feedback, escaped model text, mobile overflow, guest denial.
- No real paid provider call or IELTS grading-quality benchmark has been performed. Missing provider credentials return an honest unavailable message; no fake band is shown.
