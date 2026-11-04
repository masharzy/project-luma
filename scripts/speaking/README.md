# MiMo thinking experiment

Production implementation: thinking enabled, no forced temperature, 32,768 total completion-token budget (reasoning shares it), one request with every original question/audio pair. The per-answer correction cap and forced strengths are removed. Structural evidence failures and truncated responses fail with the original billed envelope preserved; no second paid request runs automatically. Exact quote validation does not establish grammar or IELTS scoring accuracy.

The fixed practice rubric is paraphrased from the official public IELTS Speaking descriptors. Context examples are regression checks, not independent human calibration. No 90–99% accuracy claim is made.

## Frozen two-test comparison

Provide a private manifest with exactly two cases. Each case has `name`, `input` (the saved SpeakingInput, with each clip's `key` replaced by a local original WAV path), and `baseline` containing the saved result and usage. Preserve all questions, step IDs, parts, durations and candidate pauses. Never commit the manifest or recordings.

Set OPENROUTER_API_KEY privately. Node 22+, installed project dependencies and ffmpeg are required.

```
node scripts/speaking/compare.mjs --manifest /private/manifest.json --output /private/fresh-run --dry-run
node scripts/speaking/compare.mjs --manifest /private/manifest.json --output /private/another-fresh-run
```

A is reused without charge. B uses the archived coverage-v2 prompt/schema and the documented thinking configuration. C uses the new prompt/schema with the same thinking configuration. The experiment changes thinking mode and its required sampling defaults together; do not attribute every B/A difference exclusively to extra reasoning. B/C are assessed by the same new evidence checks; compare their preserved raw envelopes as well as acceptance status.

Calls run sequentially, without retries. The runner verifies Xiaomi pricing and reserves a conservative worst-case context/output charge before each call against a 20 BDT total budget (FX reference 124.3569 BDT/USD, excluding tax/credit-purchase fees). It may stop before all four new calls if the remaining budget cannot cover the next worst-case request. Unknown costs stop further calls. Both successful and rejected model envelopes, timing, billing and reasoning tokens are saved immediately. Existing output directories cannot be reused. A returned zero reasoning-token count is visible in the report and requires investigation; sending enabled=true alone is not proof of thinking.

No production evaluations or allowances are overwritten. This CLI does not access the encrypted production key vault or automatically export private production recordings. Real comparison requires the owner's authorized audio export and provider credentials in the execution environment.

## Acceptance

- All input step IDs covered exactly once, no fabricated speech on silence.
- Corrections and strengths quote the same transcript; uncertain hearing is not repaired.
- Non-null criteria include exact supporting evidence; out-of-bounds timestamps fail.
- Manual review of genuine errors, false corrections and transcript fidelity. Record reviewers and disagreements; model self-review is not human verification.
- Compare examiner bands on independently verified, held-out human recordings with examiner feedback excluded from model input. YouTube title labels alone do not establish ground truth.
- Run the existing five synthetic sessions after the small comparison passes; long transport fixtures do not validate IELTS scoring.

Local checks: typecheck, production build, focused evidence/coverage/provider/feedback tests, and a fixture-only runner dry run. These do not measure live model accuracy or latency.
