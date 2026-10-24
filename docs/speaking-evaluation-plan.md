# Fixed-question speaking: assessment design

Scope: Practice and Cambridge. Live mock is deferred. This document proposes the evaluation pipeline; it does not claim a deployed scoring service.

## Authoring and timing
- Parent test creation supports an optional Speaking module with its own minutes; default 15. Cambridge books remain metadata containers with no test modules. Modules belong to the test inside the book.
- Practice test creation now stores per-module minutes, including Listening/Reading/Writing. Written module documents and parent timing synchronize when edited.
- Part 1: arbitrary written questions, optionally organized into named groups. No fixed topic list.
- Part 2: one written cue-card task, author-supplied bullet points and explain prompt, optional rounding-off questions. Preparation and long-turn seconds are separate configurable fields (60/120 default).
- Part 3: arbitrary discussion questions, optionally organized into groups. No fixed topic list.
- Short-answer recording cap is configurable, default 90 seconds. Speaking room countdown uses parent Speaking minutes and preserves a partial recording at expiry.
- The existing written full-test engine still contains Listening/Reading/Writing. Its catalog button now explicitly says Written Test and excludes Speaking time; Speaking is launched as a separate module. Do not imply a four-module combined result is implemented.

## Recommended scoring pipeline
1. At final Submit for evaluation, verify the real account, premium entitlement and quota on the server. Do not trust a client premium boolean. Anonymous users may practice but do not get a paid evaluation.
2. Upload original answer audio privately, paired with immutable question IDs, part, question-bank revision and actual recording duration. Snapshot the cue-card text and question text used in the attempt.
3. Enqueue an idempotent durable job. Browser closure must not cancel it. Do not launch an unawaited serverless promise as the job mechanism.
4. Produce a verbatim transcript; preserve repetition, filler words, false starts and uncertainty. Do not polish the candidate's language before assessment. Use original audio to resolve uncertain ASR words.
5. Evaluate with original audio + verbatim transcript + exact question/cue card + the IELTS public band descriptors. Transcript supports vocabulary/grammar/coherence; acoustic evidence is necessary for pronunciation, pauses, rhythm, stress and fluency. Transcript-only grading cannot justify a pronunciation score.
6. Return the four IELTS Speaking criteria, evidence and useful feedback, plus an estimated band. Evaluate the whole performance rather than averaging unrelated per-question guesses. Return unscorable/low-confidence when audio is inadequate instead of inventing a score.
7. Persist the completed result. Repeated Submit and worker retries must reuse the same job, not charge again. Commit/reserve/refund quotas transactionally around successful evaluation.

The four equally weighted IELTS Speaking criteria are Fluency and Coherence, Lexical Resource, Grammatical Range and Accuracy, and Pronunciation. Task Response is not a fifth Speaking band criterion. Question relevance belongs in contextual feedback/coherence assessment. There is no single required answer to a Speaking question and no Reading-style correct-word percentage.

## Model recommendation / validation
An audio-capable Gemini Flash model is a reasonable initial grading candidate because it can inspect original audio and structured text together. This is a starting candidate, not a claim it is the most accurate IELTS grader. Compare it with teacher-marked recordings and other candidates before setting paid band-score expectations. A dedicated pronunciation service can add phoneme/prosody feedback later; its raw scores must not be mapped directly onto IELTS bands without calibration.

Use a representative reference set across Bangla-accented English, different bands, microphones, noise, long pauses, short answers and ASR confusions. Measure band error and criterion error against trained assessors, consistency on retries, insufficient-audio detection, latency and total cost. Do not penalize a non-native accent merely for being non-native when speech is intelligible. No provider API, upload endpoint, premium gate or scoring worker was added by this authoring/timing change.

References:
- IELTS key criteria: https://ielts.org/cdn/ielts-guides/ielts-speaking-key-assessment-criteria.pdf
- IELTS equal weighting: https://ielts.org/take-a-test/your-results/ielts-scoring-in-detail
- Gemini audio support: https://ai.google.dev/gemini-api/docs/audio
- Optional pronunciation assessment: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment

## Release prerequisites
Migration 010 adds admin_content.durations and backfills Cambridge Speaking defaults. Apply after migrations 008 and 009, then validate application role grants and real database persistence before deploying. No production migrations were applied here. The prior live-mock work remains inactive without provider configuration; this change does not advance its rollout.
