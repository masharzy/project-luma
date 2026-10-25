# CURRENT STATUS — Reading validated; production release pending

All 84 source tests and 252 answer pages retrieved. 84/84 documents validated and saved to validation Neon. Browser fixtures and focused regression tests passed. See [engnovate-reading.md](engnovate-reading.md) for implementation and current evidence. Production still needs the new renderer deployed, then guarded import and live checks. The old stopped-work checkpoint below is historical.

---

# Reading import handoff — 2026-10-25 — STOPPED at user request

## Current request and authorization

User asked to import all Cambridge Academic Reading tests, following the completed 84-test Listening import. Reference: https://engnovate.com/ielts-reading-tests/cambridge-ielts-01-academic-reading-test-1/
They specifically want the pipe-separated word bank (Mexicans | despite | sunlight, etc.) rendered as a proper bordered table/grid of separate word options, consistent with our engine. The source has **20 words**, including make and surprised on the final row. Do not drop them. Repeated words are permitted by the source instructions.

User then requested to stop and provide a handoff. All fetching/conversion processes were stopped. Do not claim Reading is live.

## Production state — NO Reading imports were made

- Production Listening remains 84 modules / 21 books, released through PR #12; docs PR #13.
- Production master at this work's base: `665ae58beaece1aa091787beef2e4962bf0738cd`.
- Reading production still has only the previous C1T1 **sample** at revision 2, one question. Do not mistake it for a completed Reading import.
- No validation DB Reading writes were made either. No branch env changes, deployments, PR merges or auth changes for this Reading work.
- `engnovate-reading-before.json` backs up the existing Reading module, all 84 test rows, and the 84 Listening revision/hash pairs. Use it to prove Listening is unchanged after a future import.

## WIP implementation (committed on this handoff branch)

`scripts/imports/engnovate-reading.cjs` is adapted from the Listening converter. It parses three Parts / 60 minutes, separate passages and source groups; retains original question numbering, paragraphs, tables, images and stable `en-c{book}-t{test}-r-q{number}` bindings. Handles radio, checkbox, text and hidden drag/drop inputs. Missing/uncertain answers hold a module for review.

Important Reading difference: many matching-heading inputs are **inside the passage, outside the test form**. Each source group collects its own passage controls by original section ID. Passages are stored with `sourcePassage:true` and controlled `data-luma-question` markers. The renderer now uses SourceQuestionGroup in the left passage pane for these parts, while the option bank stays on the right. Document validation accepts group bindings in the corresponding passage, rejects foreign-part bindings and executable layouts. Admin uses SourcePassageEditor to preview these controlled gaps and edit raw layout without Tiptap deleting markers.

`makeWordBank()` replaces pipe-separated short option paragraphs with one `.source-word-bank > .ielts-word-bank-grid`, preserving word order and values. SourceQuestionGroup renders separate draggable buttons; gaps also accept keyboard entry. CSS forces three bordered columns. Word-bank reuse is not disabled. This has **not been browser-tested yet**.

`scripts/imports/build-reading-sql.cjs` emits SQL only. It imports only validated reports into existing Cambridge tests, adds Reading to their sections, and preserves Listening. Production uses ON CONFLICT DO NOTHING except the C1T1 sample, which can be replaced only at exact revision 2 and MD5 `3801812d7d324792a1a283e769f5b918`. No schema migration. Review this helper before running it; it has **not been executed**.

## Sources and saved checkpoint

All 84 actual test pages were fetched and their H1 identities verified. `data/imports/engnovate-reading/source-manifest.json` contains their URLs and SHA256 hashes.

All **252 Book/Test/Part answer-page identities** were discovered from 66 public Reading answer archive pages. Direct HTTP initially fetched some HTML, then encountered browser-check 403 and a 429. Do not bypass challenges or use gated export endpoints. The user was informed when C8T4 keys were temporarily unavailable. Normal public web retrieval could independently read many of those same answer pages, including all Book 8 keys. Source identity was checked and only Q-number/answer summary rows were extracted; no AI-generated keys.

`data/imports/engnovate-reading/answer-key-checkpoint.json` stores all successfully retrieved key pages so far, with identity, URL, retrieval representation and answer mapping. Public HTML entries also include original HTML hashes; `public_web` entries are extracted from normal web text, not raw HTML. **Retrieved is not the same as validated against the test.**

Checkpoint totals: **210/252 key pages retrieved; 42 remaining**. No Reading module is live.

`remaining-answer-pages.json` lists the exact answer pages still pending/unavailable. Do not assume those keys do not exist. Some public web requests returned 429; others had not been attempted when stopped. Never publish a test with missing keys without telling the user.

**Critical next implementation step:** the converter's `keysFor()` currently reads only cached `public-keys/XX-T-P.html`. It does **not yet read the saved JSON key checkpoint**. Wire the checkpoint in with strict Book/Test/Part checks and per-Part expected question coverage, without fabricating HTML. Use the checkpoint for reproduction when raw cache is absent.

`preliminary-report.json` is from the early converter run **before the public-web keys were collected**: 15 validated, 69 review, zero failed. It is stale and **NOT the final import eligibility report**. It found no structural errors beyond missing/uncertain keys, but normalized scoring and browser checks still need a final pass.

Normalized candidates currently live only in scratch cache; do not publish them as finished data. Regenerate them after wiring the saved key checkpoint and retrieving remaining keys. Source question counts can differ from 40 (e.g. C1T2 has 41, C1T3 38, C1T4 39 in source numbering). Verify and report these source anomalies; do not silently force 40 or omit questions. Existing result policy omits estimated band for non-40 totals. Source self-scoring validates mapping, not official key correctness.

## Verification already done / NOT done

- Optimized Next build passed with WIP Reading renderer/editor changes. TypeScript passed before the last editor additions; the later production build also typechecked.
- Early converter processed all 84 test pages without runtime failures and all structural bindings covered their source numbers.
- Final all-key conversion/scoring, new Reading tests, browser UI checks, image HTTP checks and all database imports are **NOT done**.
- C1T1 now has all three key pages in the checkpoint (the Part 3 direct fetch completed before collection stopped), but it has NOT been rerun against the final keys or browser-tested. Do not claim it is imported or ready.

## Exact next steps

1. Read saved key checkpoint + remaining list. Recover remaining public keys normally; pause on access walls. Inform user if any test must stay on hold.
2. Teach keysFor to consume checkpoint; rerun all 84 conversions. Validate identities, per-Part answer coverage, complete source numbering, binding ownership, multi-select key count and accepted alternatives. Add source-perfect and wrong-answer tests. Remove stale report eligibility.
3. Verify all source images (passage and question groups) HTTP/load successfully and preserve whole images. No cropping.
4. Browser-test C1T1 word bank (20 words in three-column cells; repeated-word reuse), passage heading drag/drop in C1T3/C1T2, text, radios, checkboxes, tables, footer navigation, Part switching and admin preview. Ensure answer keys/variants do not leak in learner payloads. Recheck Listening fixture regression since shared renderer changed.
5. Apply only verified Reading modules to validation Neon, run real HTTP scoring and Full Test Listening → Reading sequencing. Backups already saved, but re-read production revisions before release.
6. Push/review/merge renderer to master and wait for production READY **before** importing sourcePassage documents. Apply production helper only for validated tests. Preserve all Listening hashes, access flags and existing attempts. Verify public Cambridge module cards and full LR flow.
7. Update final handoff and report live counts and explicit held tests; do not call all 84 complete prematurely.

## Repo, infrastructure, local files

Active worktree: `/workspace/scratch/1a49811bb85f/luma-reading`, branch `feat/engnovate-reading-import`. `node_modules` is an untracked symlink; never stage it. Other project worktrees may be dirty; do not reset them.

Raw cache: `/tmp/luma-engnovate-reading/XX-T.html`, `public-keys/XX-T-P.html`; public web batches `public-web/batch-N.json`; converted candidates and per-book reports `converted/`. Logs: `/tmp/luma-reading-fetch.log`, `luma-reading-keys.log`, `luma-reading-keys-resume.log`, `luma-reading-convert.log`, `luma-reading-build.log`, `luma-reading-typecheck.log`. These scratch files may not survive; persistent checkpoint files above are in git.

Neon: project `holy-bird-58277611`, db `neondb`, production `br-ancient-salad-a1pk9zgd`, validation `br-fragrant-hall-a1yqo08w`. Custom auth only; NEVER Neon Auth.
Vercel: project `prj_hOKly2ADgwEMyTzU4tkqO03BeXZB`, team `team_gq7mzXQoP1PTZiTGYeSbGT6F`; production https://project-luma-rho.vercel.app/.

Push via GitHub connector; CLI fetch works, CLI push previously lacked credentials. Create tree from exact base tree, create commit, create branch. Check remote/local tree hashes. Respect user stop: this checkpoint branch is WIP, no automatic merge/deploy.

Browser tooling: `/tmp/luma-import-chromium`; `LD_LIBRARY_PATH=/tmp/luma-browser-libs/lib`, `FONTCONFIG_PATH=/etc/fonts`; Playwright `/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright`. Next host 127.0.0.1. Existing `/tmp/luma-engnovate-ui.cjs` (Listening fixture) and `/tmp/luma-engnovate-production-check.py` can be adapted; do not claim actual audio was heard (Listening tests stubbed media events).
