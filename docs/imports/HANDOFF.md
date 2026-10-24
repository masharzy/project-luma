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
There are 21 book index pages. Current discovery found **157 module URLs, not expected 168**:
- Book 3: only 5 module links matched; investigate missing 3.
- Book 13: no module links matched; investigate missing 8.
- Other 19 books: 8 LR links each.
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

1. Fix missing Book 3/13 discovery; confirm exactly 168 unique Academic LR book/test/module identities.
2. Resume cached page fetches, audit all structural profiles and source key/media completeness.
3. Implement reviewed reusable adapters/validation; keep incomplete cases out of published tests.
4. Batch-save on validation branch, test representative layouts + full answer mapping/scoring.
5. Back up existing production content, deploy any required renderer/editor changes, then import verified modules with correct access flags and revision guards.
6. Report exact counts imported/published/held for review; never claim all done while discovery/validation is incomplete.
