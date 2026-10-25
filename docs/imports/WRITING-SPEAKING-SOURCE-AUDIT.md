# Writing and Speaking source assessment — 2026-10-25

Scope is discovery and integration assessment, not production import. No Writing/Speaking modules, product grants, quotas, routes or application UI were changed.

Source inventories: 84 Cambridge Academic Writing URLs and 84 Speaking URLs (Books 1–21, four tests each), enumerated from seven catalog pages per module. The manifest distinguishes catalog-listed links from content-checked pages. The saved snapshot checks 55 Writing page identities and 16 Speaking identities; it is NOT all-168-content verification. Some direct fetches returned 429; they must not be treated as absent tests.

## Writing

All 55 checked Writing pages have two tasks and one writing reference image. C1T1 and C21T1 image GETs returned HTTP 200 with dimensions 686×554 and 822×375 respectively. Other image URLs have not all been HTTP/load checked. Import full chart/diagram images without cropping; do not import sample-answer panels, score placeholders, ads, comments or source scripts.

Our exam document supports two Writing parts, passage_text prompts and image_url. The dedicated Writing product's Cambridge task picker already reads those fields from published Writing modules. Source Task 1 reference media must be stored in image_url, not only embedded in prompt HTML. Each prompt/image and test identity needs final validation before publication. Evaluation uses our own rubric/model; the source's scores are not an answer key.

## Speaking: important format exception

C1T1 source contains one role-play cue card tagged part_two and six discussion questions tagged part_three, with no part_one. C2T1 has the same tag distribution. Do not infer that every test in these books has been checked. C3T1 has 5/1/6 questions, C4T1 4/1/6, C21T1 4/1/6 across parts one/two/three. Official IELTS research confirms the Speaking format changed in 2001, but original book comparison is still needed before declaring whether any specific source is complete. Never invent Part 1 questions to fill gaps or relabel role-play as a normal descriptive long turn.

C1T1's candidate is instructed to ask the examiner questions, which differs from our fixed examiner-question / candidate-recorded-answer flow. It needs a deliberate legacy role-play mode, or explicit exclusion/legacy labeling pending review. Treating it as an ordinary Part 2 card changes the task.

## Existing animated room compatibility

Code inspected: src/lib/speaking/schema.ts, flow.ts, render.ts, controller.js, approved-room.html; product attempts/voice/recording endpoints; Writing task picker.

The room already accepts Part 1/3 groups and question arrays, cue-card topic/points/explain, rounding questions and timing. It renders cue-card text on its paper overlay, provides preparation notes/timer, examiner voice, animated speaking/listening state, recording/review/upload and evaluation submission. Standard three-Part sources can be adapted to that data shape without rebuilding the room or adding Three.js. Source timing must not blindly override intended test timing (some source long-answer recording caps are 150 seconds, whereas our long turn caps at 120 seconds).

This is code-level compatibility assessment, not a successful imported-source browser/audio test. Live one-to-one mock conversation is not implemented by this audit; the current controller sets LIVE=false.

Current production room routes/voice/recordings operate through dedicated Speaking Evaluation attempts and speaking_sets. Cambridge attempts currently support Listening/Reading/Writing, not a Speaking module. A Cambridge-to-speaking-set link and correct attempt/access wiring are needed; do not simply pass a Cambridge numeric test ID to the product's attempt route. Preserve independent evaluation quotas and keep the existing Full Test LR selection unless the user changes that policy.

## Recommended implementation order

1. Complete prompt/media checks and import Writing tasks, preserving images.
2. Convert and validate standard Speaking sets; connect them to the existing animated room and test the actual question → voice → record → save → evaluation flow.
3. Handle legacy role-play sources separately after user-visible design/format decision; do not auto-publish invented replacements.

Source examples:
- https://engnovate.com/ielts-writing-tests/cambridge-ielts-01-academic-writing-test-1/
- https://engnovate.com/ielts-speaking-tests/cambridge-ielts-01-academic-speaking-test-1/
- https://engnovate.com/ielts-speaking-tests/cambridge-ielts-21-academic-speaking-test-1/
- https://ielts.org/researchers/our-research/research-reports/candidate-discourse-in-the-revised-ielts-speaking-test
