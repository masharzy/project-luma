# Cambridge question practice fixes — 2026-10-25

Reviewed master through bb863d1, including seamless exam transitions and automatic Writing feedback. Preserve those changes.

- Question-type practice is collapsed by default in a compact disclosure above the shelf. Opening it mounts the explorer; closing removes it. Book discovery remains immediate.
- Each free question has an explicit checkbox, a one-question practice action, and a selection counter/clear action. Exact selected keys are validated against published free sources on the server; random count remains available when no questions are selected. Locked/unavailable/duplicate/out-of-filter keys are rejected. Selected questions retain original source context and audio. Small filtered pools clamp the random count instead of leaving the start button disabled at ten.
- Free questions show a scaled original HTML page layout, including source images, headings, tables and blank fields. A native dialog opens a readable full-page preview. This is an actual rendered question layout, not a generated image. Preview requests load only one source test/module and exclude answer keys; premium requests return 404. Lazy previews are deduplicated per source group and bounded in the client cache.
- Source HTML renders after mount to avoid server/client DOMParser hydration mismatches. Source scripts/styles/events remain sanitized and only the existing safe element vocabulary is rendered.
- Listening's full supported type list stays discoverable, with zero-content types marked Not added yet. Explicit original completion instructions refine generic imported completion labels; no question text or answer is rewritten. Raw import metadata is otherwise preserved.
- Listening/Reading/Writing/Speaking module tiles use four compact columns on desktop and mobile. Their timing and access remain unchanged.

## Practice-test source research

Verified public collections, not imported in this change:

- https://engnovate.com/ielts-listening-tests/ — includes IELTS Trainer, Collins, Oxford, Practice Test Plus, Recent Actual Tests and other non-Cambridge collections.
- https://engnovate.com/ielts-reading-tests/ — corresponding non-Cambridge Reading collections.
- https://engnovate.com/ielts-listening-tests/?category_type=ielts-trainer-academic — verified full-test listing.
- https://engnovate.com/ielts-reading-tests/?category_type=practice-test-plus-academic — verified category listing.
- https://takeielts.britishcouncil.org/prepare/ielts-free-practice-mock-tests — official sample/mock practice and answer keys.
- https://ielts.idp.com/prepare/all-test-types/all-skills/practice-test — official practice material.

Official task taxonomy: https://ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test . Full tests and mini exercises must be distinguished; commercial labels such as Recent Actual Tests are source labels, not independent proof of official past-paper status. Each future import needs its question count, complete answer key, audio and image audit before publication; these source findings are not a claim that their entire collections were verified or imported.

## Verification

15 focused tests passed across selection, free/locked preview privacy, original/native reference images and numbered gaps, exact snapshot membership, seamless LR transitions and Reading source regressions. Desktop/mobile browser fixtures passed for the collapsed shelf, readable Note Completion page/dialog, checkbox selection and one-question actions, four module cards on a 390px viewport, with no JS errors or page overflow. UI fixtures use mocked API data; production checks cover the live catalog and preview API separately. TypeScript and optimized production build were checked. No source test data or answer keys are modified by this release.
