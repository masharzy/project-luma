# Writing and Speaking products

Writing: `/writing-evaluation`. Speaking catalog: `/speaking-evaluation`. Question-bank admin: `/admin/speaking-tests`. These are separate products, not live mocks.

## Access and configuration

Apply `migrations/012_evaluation_products.sql` after 010 and 011. Runtime database role remains `luma_auth_runtime`; no Neon Auth integration. Grant verified users `writing_product` and/or `speaking_product` in `/admin/evaluations`. Monthly quotas are independent of `cambridge_writing` and `practice_writing`; NULL means unlimited, zero disables evaluation, an expiry is required. No automatic payment or subscription provisioning is added.

Set these in Vercel, then redeploy:

- `DASHSCOPE_API_KEY`: Alibaba Model Studio Singapore key.
- `QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1`.
- `R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com`.
- `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`: credentials scoped to a **private** Cloudflare R2 bucket. Do not enable public bucket access. Recordings are accessed through authenticated ownership checks and short-lived signed URLs.

Vercel Queues topics: `luma-writing-evaluation` and `luma-speaking-evaluation`, callbacks in `vercel.json`. Project OIDC must be enabled. Real provider and storage smoke tests require credentials; mocked provider tests do not establish scoring accuracy or voice quality.

## Writing

Manual Task 1/2 prompts, optional Task 1 image, local account-scoped drafts, answer word count and optional 60-minute timer. Select one or both tasks; one immutable submission reserves **one** Writing allowance. Retries reuse the same submission ID. Task 2 is double weighted when both tasks are assessed.

The task picker previews AI-generated questions or published **free** Cambridge Writing content before adoption. Premium Cambridge content is intentionally excluded until a shared premium-content entitlement exists. Question generation has a separate daily account/network rate limit and never consumes an evaluation allowance. AI Task 1 visuals are PNGs rendered from validated numeric chart data; question semantics still require model accuracy. Supported generated visuals are bar/line/table, not maps/process diagrams. Manual image uploads support other Task 1 visual types.

Assessment uses `qwen3.8-flash` with bounded structured output. Exact source quotations are checked, genuine errors are distinguished from style preferences, and missing evidence is reported. Feedback is an estimate, not an official IELTS score. Teacher calibration is still required before accuracy claims.

## Speaking

Admin creates and publishes complete test sets with Part 1 question groups, Part 2 cue card/bullets/explanation and optional rounding-off questions, Part 3 question groups and answer/preparation timing. Attempts snapshot the published set so later edits do not change an ongoing exam.

The approved animated 2D room asks those fixed questions directly, without name/ID collection. Qwen TTS (`qwen3-tts-flash`, Ethan/Cherry) reads server-selected question text; cached audio is private. If voice fails the question remains readable. No browser device voice and no live conversation are used.

User records, reviews and saves each answer. Browser audio is converted to canonical mono 16 kHz PCM WAV. Server validates ownership, actual question index, format, size, per-answer duration and total recorded duration. R2 object keys are immutable/random. Submitted assessments snapshot those object keys. Playback links expire after 15 minutes; reload results to refresh.

`qwen3.8-omni-flash` receives original audio plus the exact questions and returns a verbatim transcript and the four Speaking criteria. JSON Mode is used because JSON Schema output is unsupported for Omni. Server validates step matching and computes the equal-weighted band. Incomplete performances or inadequate evidence have no overall band. No invented word-accuracy percentages or transcript-only pronunciation grading.

## Durability and limitations

Jobs and usage reservations are atomic; duplicate submission cannot double-charge. Source/month-specific failure refunds occur once. Durable queue callbacks use leases and bounded retries and continue after browser closure. The DB-to-queue publication gap is recoverable through Submit/Resume; there is no scheduled outbox sweeper yet.

Room audio not saved successfully remains only in the tab, with download/retry available. Reload starts the room flow again; already uploaded clips remain on the server and may be replaced before submission. Do not claim seamless room-state restoration. Replacing recordings can leave orphan R2 objects; a reconciled retention/cleanup job is not included. Configure a documented retention policy before broad launch, and ensure it does not delete audio still needed by pending jobs. API upload rate limits and duration caps bound per-attempt storage, but billing/storage-wide budgets are still operational controls.

Live mocks, speaking partner, payment integration and automatic subscription quotas are outside this change.

## Verification for this change

- TypeScript and optimized Next production build passed.
- 35 existing/new unit checks passed before the final two ownership/retry tests; focused product + Writing suite then passed all 15 checks, including those additions.
- 44 HTTP smoke checks passed against a local production server connected to the isolated validation database.
- Browser checks passed for Writing task preview/adoption, local draft restoration, one-credit submission/result rendering and widths 1366/1024/390; mocked AI/evaluation responses were used.
- Browser checks passed for approved room entry, fixed Part 1 question, fake microphone recording, actual browser WAV conversion, mocked private upload and animated Part 2 cue-card/preparation flow.
- Validation database checked real SQL quota exhaustion, isolation from Cambridge usage and exactly-once failure refunds. Migration 012 applied to validation and production.
- Production dependency audit: zero vulnerabilities. Actual DashScope, R2 and queue-to-provider calls remain unverified until credentials are configured.
