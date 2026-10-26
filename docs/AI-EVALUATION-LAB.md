# AI evaluation lab

Admin page: `/admin/ai-lab` (also linked from Settings).
This is an isolated benchmark; it does not switch learner evaluation providers.

## Enable on a deployment

1. Apply `migrations/018_ai_lab.sql` with the database owner. Or set the direct owner connection as `DATABASE_URL_UNPOOLED` in the migration shell and run `node scripts/prepare-ai-lab.cjs`. The production runtime continues to use its restricted role. The migration grants access to the existing `luma_auth_runtime` role; adapt this if using a different runtime role.
2. Generate `AI_LAB_MASTER_KEY` once with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and save it as a **server-only** deployment secret. Never commit it. Keep it stable, or saved provider keys will become unreadable.
3. Deploy this branch, log in as an admin, open the lab, and save the Google and OpenRouter keys. Alternatively provide `GEMINI_API_KEY` / `OPENROUTER_API_KEY` as server environment secrets; the vault key is then unnecessary until a key is saved via the panel. Stored encrypted keys take precedence.
4. Load the live model catalog. OpenRouter only permits explicitly named `:free` models whose current input/output price is zero, with zero-price provider caps and no fallback. Google availability is not a free-tier guarantee: use a free-tier Google project without paid billing for a free-only experiment.
5. Choose a model-supported reasoning mode: Gemini 2.5 uses token budget; compatible Gemini models use effort levels; OpenRouter must advertise reasoning support for controlled effort. Provider default is a baseline, not a controlled Normal/Deep/Maximum experiment. Unsupported combinations fail rather than silently downgrade. Maximum means high effort or the explicitly configured model-supported budget; it does not claim a universal maximum across models. No secondary review call is included: each request is timed independently.

## Benchmark protocol

Use 10 examiner-scored Writing responses (Task 1 and Task 2), and 10 original Speaking recordings covering different proficiency levels and Parts 1–3. Include prompts. Use anonymized samples with permission for the provider's data policy. Keep original human band references hidden from the evaluator: the server does not include them in the model request.

For each sample run 3 repetitions at Normal, Deep, Maximum where controlled reasoning is supported. Run serially, then repeat on each competitor; interleave models across different times of day to reduce load/time-of-day bias. The UI stops a batch on its first failed request to avoid burning quota. Completed runs are saved independently. Stop takes effect after the current request finishes; it does not cancel a billable in-flight request.

Speaking requires original audio, under 2.9 MB for this inline pilot (compress long recordings to MP3). OpenRouter audio is limited to MP3/WAV and models advertising audio input. The pilot does not implement realtime examiner conversation or audio transcription timing. Timestamp presence is validated, but a human must verify whether audio evidence is true. A short clip is not a full Speaking test result. The Writing pilot has no image upload: chart tasks need chart facts supplied explicitly, and results must be interpreted with that limitation.

Compare human reference error, band range across repeated runs, false corrections, timestamp accuracy, JSON validation success, failures, first final-text latency, total latency, and usage. Manually inspect the actual feedback before picking a winner. Reference band error is an estimate against the supplied human score, not proof of official IELTS accuracy.

## Measurements and storage

`headersMs`: request start to HTTP headers; `firstEventMs`: first actual SSE data event (excluding comments); `firstTextMs`: first final-answer text (excluding Gemini thought parts); `totalMs`: request start through completed generation and output validation. Model catalog/key lookup and database persistence are excluded. No automatic retry, temperature override, or hidden second pass. Usage, model version and finish reason are saved when supplied. Failed output validation and streaming/provider failures are recorded. HTTP errors are sanitized; provider error bodies and keys are never returned.

Summary p50/p95 use successful runs only; success/total separately displays failures. Compare like-for-like sample hashes, reasoning settings, skill and model. p95 with three runs is effectively the slowest run, not a stable population estimate. Frontend upload/network latency is not included. Raw assessment output (which can quote candidate material) is stored in admin-only results; original answer and audio inputs are not stored by this lab. The 100 latest runs load in the UI and can be exported as JSON. Retain exports before exceeding that window.

## Validation

`node --test tests/ai-lab.test.mjs` tests sample validation, invented Writing evidence, mandatory Speaking audio/timestamps, paid-model rejection, mocked streaming latency and sanitized HTTP failures. These are offline tests, not evidence of model quality. Run `npm run typecheck` and `npm run build` too. Live provider, encrypted vault/database and authenticated browser flows require the deployment configuration and provider keys above.

## Provider compatibility update — 26 October 2026

The catalog prioritises explicitly versioned Flash models over moving aliases and labels Gemini 2.5 as legacy access. Google notes that 2.5 access is limited to existing active users; catalog visibility is not proof that inference is enabled. TTS, image, transcription and specialised tool models are excluded from this evaluation picker.

The existing Generate Content REST streaming API remains supported: `POST /v1beta/models/{model}:streamGenerateContent?alt=sse`, with `x-goog-api-key`. Gemini 2.5 uses `thinkingBudget` (Flash maximum 24,576; Pro 32,768); compatible newer text Gemini models use `thinkingLevel` LOW / MEDIUM / HIGH. Unsupported combinations are rejected. The default Maximum budget remains the configured cap, not a claim of maximum model capacity.

OpenRouter retains pinned zero-price `:free` models, `allow_fallbacks:false`, `require_parameters:true`, and zero input/output price caps. Controlled reasoning is offered only when the live catalog advertises it. A 429 alone does not distinguish platform limits from upstream provider limits. Diagnostics retain a safe category and parsed Retry-After delay; raw provider messages, which may echo candidate content or credentials, are never retained. No automatic retry is included in benchmark timings.

Official references checked:
- https://ai.google.dev/api/generate-content
- https://ai.google.dev/gemini-api/docs/generate-content/thinking
- https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash
- https://openrouter.ai/docs/api_reference/errors-and-debugging
- https://openrouter.ai/docs/guides/routing/provider-selection
