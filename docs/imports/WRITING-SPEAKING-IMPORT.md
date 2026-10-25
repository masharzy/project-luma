# Cambridge Writing + Speaking import — 2026-10-25

Scope: all Books 1–21 / Tests 1–4, **84 Writing and 84 Speaking tests**, including legacy two-part Speaking sources. No tests were discarded or padded with invented sections. Source content was fetched through normal public pages; no source grading, ads, sample panels, scripts or hidden authentication controls are imported.

Writing has two parts / 60 minutes, source prompt paragraphs and original uncropped Task 1 image. All 84 image URLs returned HTTP 200. AI evaluation continues through the existing Writing evaluation system; no source score is treated as an answer key.

Speaking uses sourceParts: ordered displayed sections with numbered original questions, paragraphs and task-card flags. Eight sources have two parts (Books 1–2), and 76 have three parts. Source role-play cards remain in displayed Part 1 where the source puts them. Existing standard manually created Speaking sets remain compatible.

The existing animated room now renders the actual number of source parts, the correct card Part label, paper/notes, preparation timer, fixed examiner questions, recording/review/upload and existing evaluation submission. Long task cards receive preparation/long-turn timing even when displayed in Part 1. Source text is not turned into an invented modern descriptive task. No live mock conversation is added. Name/ID steps are not added to Cambridge source practice.

The admin source editor retains the same source sections and card flags. Generic fields cannot silently convert a two-part source into three parts. Evaluation receives exact source tasks and clips; two-part sources get criterion feedback without a standard three-part overall band estimate. Existing product grant checks, ownership, rate limits and quotas remain in place; this release does not create new subscriptions or free allowances. Cambridge Speaking uses the existing Speaking Evaluation access/allowance, as stated on its launch page. Imported premium books retain the existing Cambridge access restrictions in cards and server-side lookup.

## Database and integration

Additive migration `scripts/migrations/cambridge-speaking-link.sql` links speaking_sets to cambridge_tests with a foreign key and partial unique index. It was applied to validation and production before release; existing sets/attempts remain compatible.

`build-ws-sql.cjs` only inserts absent Writing modules / linked Speaking sets and appends sections; it does not overwrite existing modules, book status, access settings or attempts. Original Listening and Reading are protected and checked against `ws-production-before.json`. Full Test remains LR-only. Writing opens through the exam engine and existing evaluation path. Speaking opens the same animated room through a linked Speaking set. Admin Cambridge module management links to its Speaking editor.

Production and validation databases both contain all 84 Writing modules and 84 linked Speaking sets (8 two-part, 76 three-part). PR #16 merged at ff40971f76b15ba44d27a8812a56b383d2380f70; production deployment dpl_Ce3wFL54y3C3SxkmNZLBYnqtVJ3f reached READY before the guarded insert-only content import. All 168 pre-existing Listening/Reading document MD5 hashes and revisions match the saved production baseline exactly. All 84 tests expose LRWS sections; original access remains 40 free / 44 premium.

## Verification

21 focused tests passed, including all 168 source documents, exact question/Part order, preserved role-play, bounded examiner speech, unsafe-media/duplicate-number rejection, legacy criterion feedback, existing products and prior Listening/Reading imports. TypeScript and optimized Next build passed.

Browser fixtures passed for old C1T1 (two tabs, paper task in Part 1, notes) and modern C21T1 (three tabs, cue card in Part 2), and Writing C1T1 original chart plus Task 1/2 draft persistence. Voice playback was previewed with no-provider fallback; paid TTS/AI assessment calls and real microphone uploads were not performed by these fixtures. Existing provider tests use mocks. No claim of new live conversation or human-equivalent scoring.

Source metadata/hashes and normalized payloads: `data/imports/engnovate-ws/`. Full text/image data should be independently audited against original books if official-content certification is required. This import verifies source preservation and engine compatibility.
