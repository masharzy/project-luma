# CURRENT WORK — Reading WIP, stopped for handoff

Read [READING-HANDOFF.md](READING-HANDOFF.md) first. No Reading DB import or deployment occurred. The completed Listening release below remains live.

---

# CURRENT HANDOFF — 2026-10-25 — Listening import released

This section supersedes the historical handoff below. Do not restart discovery or re-import the library.

## Release and data

- PR #12 merged into master: `02c1e102a481f03b22b5f6163e9d15448242834d`.
- Production deployment `dpl_GMUPricER1Z7NPU5GrvmU4qE78wJ` reached READY.
- Production contains **84 Cambridge Academic Listening modules across 21 books / 84 tests**. Imported 83 new modules; preserved the existing reviewed Cambridge 1 Test 1 Listening exactly (revision 2, document MD5 `22f937d6e7a068545dcb1e4a7c09d14a`).
- Existing Reading remains unchanged (revision 2, document MD5 `3801812d7d324792a1a283e769f5b918`). Reading remains deferred.
- All 84 tests published; Books 1–10 free (40 tests), Books 11–21 premium (44 tests). Existing access/status preserved.
- Validation branch contains all 84 source candidates / 336 Parts. Its C1T1 source candidate differs from preserved production C1T1; do not overwrite production with it.

## Implementation and evidence

See `engnovate-listening.md`, `engnovate-production-checks.json` and `data/imports/engnovate/report.json`.
All 84 source pages, 336 public answer/explanation pages and 380 audio/image URLs were checked. Normalized documents and source provenance are committed in `data/imports/engnovate/`. Source images stay whole; media remains externally hosted. No access-control bypass or gated export dependency.

The `source_html` renderer preserves paragraphs, tables, image references, choices, controlled gaps and draggable option banks inside the existing exam frame. Admin previews the same component. Keys/accepted variants are stripped from learner payloads. Per-Part audio advances independently of question browsing and tries source fallback URLs. Autoplay has an explicit Play action.

Source numbering is preserved: six newly imported tests have 41–43 slots, while the retained production C1T1 has 40. Non-40-slot tests show raw/percentage results without an estimated band. Source-perfect scoring proves answer mapping, not independent official key accuracy.

TypeScript, optimized Next build and focused regression tests passed. All 84 source documents normalize and self-score correctly, with wrong-answer deductions checked. Browser fixture checks for C1T3 and C2T1 passed with real image bytes, text/radio/checkbox controls, selection limits, single-input datalist/drop, and audio event sequencing. Audio was stubbed in browser tests; actual sound quality has not been audited.

## Production HTTP checks

Real guest create → fetch → start → submit passed: C1T3 42/42, C2T1 40/40 and C10T4 40/40. Learner payloads hid keys/variants and showed four Parts / 30 minutes. Non-40 band stayed omitted. Premium C21T1 guest start returned 404 as expected. Public /cambridge and /cambridge/2 returned 200. Deployment error/fatal logs scan found none in the release window. These are representative checks, not a manual review of all 84 tests.

## Operations

Production: https://project-luma-rho.vercel.app/cambridge
Admin: https://project-luma-rho.vercel.app/admin/cambridge
Neon project `holy-bird-58277611`, database `neondb`, production `br-ancient-salad-a1pk9zgd`, validation `br-fragrant-hall-a1yqo08w`.
Pre-import snapshot: `engnovate-production-before.json`.
Production SQL builder only inserts missing rows and never replaces modules. No schema/auth changes. Keep custom auth, package security overrides, existing attempts and unrelated manual content.

For reproduction, use the fetch/conversion commands in `engnovate-listening.md`. Do not bulk-run production imports without an actual new request. Potential later work: Reading import, independent content/key audit, optional owned media hosting, and premium entitlement behavior (unchanged by this import).

---
# Historical handoff — superseded

# CURRENT HANDOFF — 2026-10-24 — ENGNovate Listening ONLY

## Highest-priority user instruction

**Import all 84 Cambridge IELTS Academic Listening tests (Books 1–21, Tests 1–4 each) into the existing Luma exam engine.** User explicitly narrowed scope from the previous Listening + Reading plan: **Reading is deferred**, not part of the current job. Do NOT keep asking for scope or spend another turn just auditing; implement and execute the actual imports, then report real success/failure counts. Keep existing UI/theme, accurate questions, answer mapping, images intact (do not crop), and audio. User has been frustrated by repetitive non-import work.

## Latest source selection

User provided:
https://engnovate.com/ielts-listening-tests/cambridge-ielts-01-academic-listening-test-3/

User says Engnovate has consistent sequential URLs and prefers it over practicepteonline because the latter may have missing questions. The assistant previously observed that this page appears to number up to **42**; verify source numbering / scoring before transforming, don't hard-code 40 blindly or assume 42 means 42 distinct answer slots. Check representative pages and media and exact page availability. Original pattern hypothesis:
`https://engnovate.com/ielts-listening-tests/cambridge-ielts-XX-academic-listening-test-Y/`
where XX is zero-padded book number, Y = 1–4. **Do not mark unverified guessed URLs as complete.**

## Actual progress in this conversation

- Added `scripts/imports/audit-library.cjs` on branch; commit `39b8f77e37561334b907796c51875917c49ffc8c`. It is a read-only manifest/document preflight validator for the **old practicepteonline** plan; this is not imported content.
- Added `scripts/imports/discover-engnovate-listening.cjs`; commit `2d17d62ec99692fec9d30fd44a8df1340fd03067`. It enumerates archive pages and writes `data/imports/engnovate-listening-manifest.json` when run. **It has NOT been run or validated and may require correction to archive paths and parsing**. It imports no exams.
- No new content was imported into Neon or published by this conversation. Do not claim otherwise.
- Neon production was read-only queried and showed just one Cambridge listening module and one reading module as of that check. Validation branch likewise had one each. The single fully reviewed production module is **Cambridge 1 Test 1 Listening** (revision 2, 40/40 production smoke-tested), inherited from previous agent.
- Prior source-manifest had 165/168 Listening+Reading URLs, with Book 3 Listening Test 2–4 missing on practicepteonline. Those gaps are NOT a blocker if Engnovate has the tests, but Engnovate still needs verification.

## Repo / infrastructure

GitHub: `masharzy/project-luma`, working branch `feat/cambridge-library-import`; do not edit master directly.
Vercel production: https://project-luma-rho.vercel.app/
Neon project `holy-bird-58277611`, db `neondb`, production branch `br-ancient-salad-a1pk9zgd`, validation branch `br-fragrant-hall-a1yqo08w`.
Vercel project `prj_hOKly2ADgwEMyTzU4tkqO03BeXZB`, team `team_gq7mzXQoP1PTZiTGYeSbGT6F`.
Existing exam_modules schema/document, admin UI and question types must be inspected for compatibility. Existing rows should be backed up before changes, with revision guards and no replacement of unrelated modules; preserve free books 1–10 and premium books 11–21 per prior user requirement.
Previous reviewed single-test adapter at `scripts/imports/cambridge-one-listening.cjs`, normalized reference `data/imports/cambridge-1-test-1-listening.json`; this is explicitly **not generic**. See older handoff below for all details.
Do not migrate Neon Auth or change existing account/auth system.

## Immediate next actions

1. Verify Engnovate source and actual 84 source pages (via web/browser/HTTP). Fix the new discovery script if needed.
2. Download and inspect representative HTML, images, audio, instructions, answers; identify structural profiles and special cases. Validate exact source numbering and answer-slot counts.
3. Implement bulk importer with deterministic question-to-answer mapping, audio/image preservation, and explicit hold-for-review on uncertain data. Do not silently fake missing questions/answers or publish questionable modules.
4. Populate all verified Listening modules in validation Neon, run representative UI and scoring smoke tests. Back up affected production rows, safely publish verified modules and confirm production results.
5. Give counts: attempted, verified, imported to validation, live in production, and held, with per-test issue report. Full goal is **84 Listening modules**.
6. Reading is **out of scope for now**. Avoid another cycle of just explaining work, generating non-import audit scripts, or claiming success before DB imports.

## Original earlier handoff (historical; superseded when conflicting)

---
# Handoff — Cambridge 1–21 Listening / Academic Reading

## User request / scope

User approved importing **all Cambridge 1–21, four tests per book, Listening + Academic Reading**. Last message asks to stop and hand off because usage is exhausted. Do not ask scope again. Preserve the existing exam theme. Shared source images must stay whole; do not invent cropping. Writing/Speaking are outside this import request.

## Completed and LIVE

Repository: `masharzy/project-luma`
Production: https://project-luma-rho.vercel.app/
Latest merged master: `e12df3c94a2876a8a20eb439ed0a1abfd746a5e6` (PR #11).
Production deployment: `dpl_9jYsnm6kZZfG4sV8BmQrCqyBWJ3P`, READY.

Cambridge 1 → Test 1 → Listening is fully imported in production:
https://project-luma-rho.vercel.app/exam/cambridge/1/listening
Admin: https://project-luma-rho.vercel.app/admin/engine/cambridge/1/listening

- Four parts, 30 minutes, 38 question objects / 40 answer slots.
- Original Q1–2 shared image and Q4 separate image, uncropped, embedded PNG bytes. Generic `referenceImage` support added to editor/renderer with validation. `optionLabelOnly` renders picture-option letters visibly in one row.
- Q11–13 remain one three-answer question, original A–I options, B example disabled, E/F/H key preserved.
- Source Q34 had an extra unnumbered input; reviewed adapter collapses it to one field. Q10/Q14 accept numeric amount without duplicating printed currency.
- Audio still uses external source URL, HTTP 200 audio/mpeg checked; not copied to R2.
- Actual production HTTP guest attempt → start → submit source answers returned **40/40**, two images, hidden answer keys before submission, 30-minute duration.
- Production exam_modules: kind cambridge, parent_id 1, module listening, revision **2**. Reading revision 2 / one sample question was NOT modified.
- Prior Listening document/revision backup: `docs/imports/cambridge-1-test-1-before.json`.

Files:
- `scripts/imports/cambridge-one-listening.cjs`: reviewed SINGLE TEST adapter, explicitly not generic. Uses jsdom through createRequire(isomorphic-dompurify).
- `data/imports/cambridge-1-test-1-listening.json`: normalized document, includes image data.
- `docs/imports/cambridge-1-test-1-report.json`, `.md`: source hash, key and reviewed adjustments.
- `public/imports/cambridge-1-test-1/*.png`: original image bytes.
- `tests/cambridge-import.test.mjs`: 4 tests; 11 combined import/document/result tests passed; typecheck and production build passed.

Browser rendering was checked with fixture API; real database end-to-end was checked separately through production HTTP with Python urllib. Local HTTP-to-Neon attempt timed out; do not claim that local route test passed.

## Bulk import progress — NOT imported yet

Working tree: `/workspace/scratch/1a49811bb85f/luma-import`
Working branch: `feat/cambridge-library-import` based on current master.
The original `/workspace/scratch/1a49811bb85f/project-luma` is OLD and DIRTY; DO NOT reset, clean or stage its changes.

Discovery script: `scripts/imports/discover-library.py` (copy of `/tmp/luma-discover.py`). It fetches a known source catalog, parses book links, then test links, caches HTML and resumes from cache. Three parallel GET workers, timeout/retries. Background process was STOPPED on user handoff request; it is not running.

Source catalog: https://practicepteonline.com/cambridge-ielts-1-13-tests/
There are 21 book index pages. Current discovery found **165 module URLs, not expected 168**:
- Book 3: user-supplied official index was verified: it actually lists only Listening Test 3.1 plus four Academic Reading tests. Listening 3.2–3.4 are absent from that index and still need independently verified source mapping.
- Book 13: FIXED. Labels omit the word Test (Listening 13.1, Academic Reading 13.1); discovery regex now accepts it as optional. All eight URLs are in the manifest. Verified https://practicepteonline.com/official-ielts-tests-book-13/.
- Other 20 books (including Book 13): 8 LR links each.
Do not guess URLs/test numbers to fill these gaps.

Manifest committed as `data/imports/source-manifest.json`, original `/tmp/luma-source-manifest.json`.
Cached HTML: `/tmp/luma-source-cache/`, **42 files** when stopped (includes catalog/book index pages and a partial test-page download).
Discovery log: `/tmp/luma-discover.log`, reached `FETCHED 17 / 157`.
Rerun script to resume cache, but first fix discovery gaps. Current script uses `/tmp/luma-source-cache` as cache path. No generic bulk parser has been written. No other modules were imported or published.

Book 21 index example: `/official-ielts-tests-book-21/`, links Listening 205–208 and Academic Reading 316–319. Book/test identity must come from catalog links, NOT numeric source URL sequence.

## Source structure / cautions

Source is WordPress. Each HTML page advertises an endpoint like:
`https://practicepteonline.com/wp-json/wp/v2/pages/2424`
Test 171 endpoint verified to return JSON with `content.rendered` HTML. It includes question content and hidden Show Answers key. JSON is a wrapper, not already normalized questions.

- Extract `.entry-content`, strip ads/navigation/answer box from learner content.
- Images may be lazy loaded: prefer `data-src`, avoid placeholder GIF and duplicate noscript images.
- Combined images may be deliberately shared by multiple questions. Do not crop by guessing.
- Question arrays cannot be numbered by position: one 3-answer MCQ spans 3 slots; input counts can be wrong in source.
- Preserve letter labels when an example option is present. Removing example B and relabeling breaks source keys.
- Source keys can contain errors. 40/40 against source validates mapping, not independent official answer correctness.
- All modules need normalization, 40-slot coverage, duplicate/missing-gap/image/answer checks and representative browser review before publication. Fail uncertain imports to draft/review.

Possible next implementation decision (NOT implemented): either adapters for known structural profiles using existing group types, or a carefully sanitized rich HTML import renderer with explicit stable question bindings. Do not blindly render raw HTML inputs or publish inferred mappings. User expects existing exam UI/theme and exact question content.

## Database / deployment

Neon project: `holy-bird-58277611`, database neondb.
Production branch: `br-ancient-salad-a1pk9zgd`.
Validation branch: `br-fragrant-hall-a1yqo08w`, runtime role `luma_auth_runtime`.
Use Neon PostgreSQL only, custom auth; NEVER migrate to Neon Auth.
Validation branch currently has imported C1T1 Listening at revision 2, safe for isolated checks.
No secrets are in this handoff. Get connection through Neon connector if needed; never print credentials.

Tables: cambridge_books → cambridge_tests → exam_modules(kind,parent_id,module,document,revision). Existing modules should be backed up and updated using expected revision; preserve unrelated modules and in-flight exam attempt snapshots. Book 1 existing test id is 1. For other books inspect existing IDs before inserting. Preserve free/premium choices (books 1–10 free, 11–21 premium per user requirements) and existing manual content.

Vercel project `prj_hOKly2ADgwEMyTzU4tkqO03BeXZB`, team `team_gq7mzXQoP1PTZiTGYeSbGT6F`.
Preview branch env must be configured AFTER GitHub branch exists; Vercel rejects unknown branches. New Git branch can trigger a preview before env is added, so ensure a deployment after env config. Use validation DATABASE_URL, never production for preview writes.

Git CLI fetch works, push has lacked credentials. Use GitHub connector create_blob(base64 for PNG), create_tree(base_tree), create_commit, create_branch/update_ref(expected_sha), PR, merge. Large base64 output can exceed exec token limits: read/export each file individually and avoid printing content. Verify remote/local tree hashes.

## Runtime / verification helpers currently in scratch

- `/tmp/luma-import-browser.cjs`: starts local Next production server on 127.0.0.1:3107, fixture API UI checks, screenshots. It depends on current cwd.
- `/tmp/luma-import-live-check.py`: actual production guest create/start/submit smoke (creates one guest attempt); source answers from repo fixture, expects 40/40. It already PASSED. Do not repeatedly run without a change.
- Screenshots `/tmp/luma-import-part1.png`, part2, part4.
- Chromium `/tmp/luma-import-chromium` (manual Brotli decompression of @sparticuz/chromium).
- Playwright `/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright`.
- Browser env `LD_LIBRARY_PATH=/tmp/luma-browser-libs/lib`, **FONTCONFIG_PATH=/etc/fonts**. The extracted AWS fontconfig points to empty /tmp/fonts and makes text invisible; use system fontconfig.
- Launch args --no-sandbox --disable-gpu --disable-dev-shm-usage.
- Next must start with `-H 127.0.0.1` in this environment.
- `NODE_USE_ENV_PROXY=1` may be needed for Node network calls. Python urllib/curl worked against source and production.

Keep @vercel/oidc override 3.2.0 and jsdom 26.1.0; prior security audit fix. Do not remove overrides.

## Next steps

1. Find and verify Book 3 Listening Tests 2–4 (three missing URLs); Book 13 is fixed. Confirm exactly 168 unique Academic LR identities before claiming complete coverage.
2. Resume cached page fetches, audit all structural profiles and source key/media completeness.
3. Implement reviewed reusable adapters/validation; keep incomplete cases out of published tests.
4. Batch-save on validation branch, test representative layouts + full answer mapping/scoring.
5. Back up existing production content, deploy any required renderer/editor changes, then import verified modules with correct access flags and revision guards.
6. Report exact counts imported/published/held for review; never claim all done while discovery/validation is incomplete.

Update after handoff: user supplied Book 3 and Book 13 official index URLs. Verified both; only Book 13 was a parser issue. Bulk fetching remains stopped; no further production content was imported. `discover-library.py --discover-only` can regenerate the manifest without starting test-page downloads.
