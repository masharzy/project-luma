# Cambridge books and full-test handoff

## Code and release state
- Repository: masharzy/project-luma
- Branch: feat/cambridge-books-full-test
- PR: https://github.com/masharzy/project-luma/pull/6
- Implementation commit: 9d65e78b1db37837958aab689a6e227a396fcca9
- Base production/master: c65da6727c24f636dbc78b480fcb20fa76866aee
- Implementation is pushed. PR is NOT merged. Production migration 008 is NOT applied. Do not describe this change as production-live.
- GitHub CI run 40008637295 passed.
- User requested immediate push and handoff to conserve usage; stop further implementation.

## Implemented
- Independent cambridge_books; a book can exist without tests.
- /admin/cambridge creates books, /admin/cambridge/[book] creates tests.
- Only test forms select modules and configure durations, default Listening 30 / Reading 60 / Writing 60.
- Metadata and question editor duration agree. Saving editor timing updates test metadata atomically.
- Public book page follows supplied sketch: test rows, module cards and right-side Start Full Test; no duplicate covers.
- Single/full practice routes launch server-owned attempts with immutable question snapshots, HttpOnly owner cookie, server deadlines, duplicate-submit protection and server-side final score/review.
- Next module begins on its Start button; expiry triggers client auto-submission.
- Writing responses/word counts are retained but explicitly unmarked. No AI evaluation is implemented.
- Red/white submit confirmation replaces legacy dark/green modal.
- Practice direct test creation and scheduled mock/admin result publication remain separate.

## Verified
- Production build: passed, /tmp/luma-books-release-build.log.
- Full test suite: 66/66 passed, /tmp/luma-books-alltests.log.
- Unit/security suite: 22/22 passed.
- Isolated real API checks passed: zero-test book creation, test/module timing consistency, full module order, hidden answer keys, attempt browser ownership, repeated-start deadline stability, cross-origin rejection, duplicate submission handling, final persisted score/review and writing word count.
- Desktop/mobile public layout and admin book/test forms passed browser checks.
- Screenshots: /tmp/luma-books-desktop.png and /tmp/luma-books-mobile.png.

## Remaining before release
1. Finish browser full-test flow verification. Do NOT claim full browser E2E passed.
   - First run timed out waiting for Begin full test (serial module queries were then replaced by parallel loading; loadExam now fetches timing in one query).
   - Current browser-only run: /tmp/luma-books-browser.cjs, log /tmp/luma-books-browser.log.
   - It passed forms/layout and reached a live Listening attempt, but was waiting for answer input/next step at handoff.
   - Investigate fixture token compatibility: test fixture uses groupText and question_text containing [gap1]. Original renderer commonly uses [[1]] / [[n1]]. Determine whether this is a bad fixture or a real normalizer/renderer mismatch; do not assume the cause.
   - Then verify red/white modal, Listening submit -> Reading, expired Reading auto-submit after reload, Writing draft reload, final result screen, runtime/CSP errors.
2. Apply migrations/008_cambridge_books_attempts.sql to production AFTER verification. It has only been applied to isolated validation branch.
3. Update PR description from pending verification to final actual evidence, merge expected head only after checks, monitor production Vercel READY, smoke-test canonical URL.
4. No production demo content should be created.

## Infrastructure
- Canonical production: https://project-luma-rho.vercel.app
- Vercel team: team_gq7mzXQoP1PTZiTGYeSbGT6F
- Vercel project: prj_hOKly2ADgwEMyTzU4tkqO03BeXZB
- Neon project: holy-bird-58277611
- Production branch: br-ancient-salad-a1pk9zgd
- Isolated validation branch: br-delicate-base-a1kc3il5 (custom-auth-validation)
- Runtime role: luma_auth_runtime
- Existing custom auth stays. Neon is PostgreSQL only.
- Never expose credentials. Private .env.custom-test contains approved isolated test configuration.
- QA data books 801/802 and .invalid QA users exist ONLY on isolated branch.

## Local/testing
- Repo: /workspace/scratch/1a49811bb85f/project-luma
- All implementation files were pushed, though local git index still uses the old base; do not mistake local untracked files for unpushed work.
- npm run test:cambridge runs scripts/test-cambridge-flow.cjs after a build, against explicitly approved isolated DB.
- Browser Playwright is globally available, binary /tmp/chromium, args from /tmp/luma-browser/node_modules/@sparticuz/chromium/build/index.js.
- Run Next and browser in same exec cell/network namespace, host 127.0.0.1.
- NODE_USE_ENV_PROXY=1 and NO_PROXY=localhost,127.0.0.1 are needed.
- No subagents requested. Prefer GitHub connector for mutations.
