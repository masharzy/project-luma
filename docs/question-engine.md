# Shared question engine

The original IELTSPracticeBDInterface and CDIAdminEditor from `masharzy/ieltspracticelab` are the reference for this implementation. Exam rendering preserves the original official theme. The admin toolbar, typography, identifiers and persistence are adapted for JumpToNine.

- `components/exam/exam-interface.tsx`: controlled, data-driven exam view. It has no authentication/database dependency. Hosts supply parts, questions, answers, time and callbacks.
- `components/exam/visual-editor.tsx`: visual parts/passages/group authoring. The same exam view is used for preview, with editor state retained while previewing.
- `lib/exam/document.ts`: versioned document validation, temporary ID canonicalization, ownership checks, duplicate detection and immediate inline-gap materialization.
- `lib/exam/store.ts`: parameterized Postgres persistence, HTML sanitization and answer-key removal for learner payloads.

## Routes

`/admin/cambridge/[book]` shows tests in the chosen book. Test, practice and mock cards open `/admin/engine/[kind]/[id]`, which lists only their configured modules. Each module opens `/admin/engine/[kind]/[id]/[module]`. Kinds are `cambridge`, `practice`, `mock`; modules are `listening`, `reading`, `writing`.

The admin API `/api/admin/exam-modules/[kind]/[id]/[module]` supports GET and PUT. PUT accepts `{revision, document}`. Saving atomically replaces one whole module, preserving question/group references. Revision conflicts return 409 rather than overwriting another editor. Deleted groups/parts are absent from the next snapshot; dangling questions are rejected. Parent deletion cascades to its documents.

Apply `migrations/007_exam_modules.sql` after migrations 004–006. No seed/demo exam content is added to production.

## Authoring and assets

Listening has up to four parts, reading three, writing two. Original question variants, rich passages, heading gaps, inline completion, word banks, dropdown/matrix matching, tables, flowcharts, diagram images and writing prompts are retained. Rich HTML is sanitized on persistence. Images can be uploaded as PNG/JPEG/WebP up to 1 MB and are embedded in the module; the whole request is capped at 3 MB. Listening audio uses an HTTPS media URL. Dedicated large-file audio storage is not provisioned by this change.

The shared renderer does not implement a synchronized mock scheduler, paid entitlement checks or AI marking. The separate practice-attempt host implements timed attempts and results as described below. Mock authoring and preview use the same renderer; scheduled mock participation remains separate. Public `/exam/[kind]/[id]/[module]` currently exposes only published free Cambridge/practice modules. It strips answers and explanations, and starts timed practice attempts. Premium and mock participation are not exposed by this route.

Engine utility CSS is scoped to `.exam-engine`; its form-layout inline styles are allowed only on engine routes while script nonce protection remains enabled. Admin API authorization is separate from the reusable component.

## Cambridge books and timed attempts

Migration 008 separates `cambridge_books` from `cambridge_tests`, backfilling only books already represented by existing tests. Books can exist without tests and have their own title, access and publication state. Tests contain configured modules and editable time limits (30/60/60 minutes by default). Book publication/access also gates all learner entry points.

`/cambridge/[book]` lists test rows with independent module links and a full-test action. `/exam/[kind]/[id]/full` starts a sequence of the configured modules in Listening → Reading → Writing order. Both single-module and full-test practice use `/exam/attempt/[id]` and the same exam renderer.

Attempts snapshot the authored documents on the server so answer keys never enter a running learner payload. A random HttpOnly cookie owns the attempt; its hash is stored in Postgres. Each module deadline is set once on the server. Reloads retain the deadline and browser-tab answers; submitted modules advance with a compare-and-update condition, preventing duplicate submissions from skipping a module. The next module timer starts only after its Start button is pressed. Timer expiry submits the current answers automatically. Network failures offer retry without losing the entered answers.

Final results are computed server-side and retained for 24 hours for the same browser. Listening/Reading show raw scores, answer review and partial credit for multi-answer questions. Estimated band is shown only for 40-mark modules. Writing responses and word counts are retained but are explicitly unmarked; no AI writing evaluation is fabricated. These are on-demand practice attempts, separate from scheduled mocks and their admin-controlled result publication.

Run `npm run test:cambridge` after building to verify the Book → Test → timed modules → result API flow against the explicitly approved isolated validation database in `.env.custom-test`. It creates only disposable QA records on that branch.
