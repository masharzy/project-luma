# Engnovate Listening library import

Scope: Cambridge Academic Listening Books 1–21, Tests 1–4 (84 module identities). Reading is deferred. No auth or subscription system is changed.

## Source and validation

- All 84 actual source pages were downloaded and their headings checked against book/test identity. Candidate sequential URLs were not treated as verified until HTTP content matched.
- Bulk answer collection uses 336 publicly readable Answers & Explanations pages. Book/Test/Part subtitles and summary-table question numbers are verified. An export endpoint required login for one test; no access control was bypassed. The importer does not call that gated endpoint.
- `data/imports/engnovate/source-manifest.json`, `answer-source-manifest.json` and `report.json` record identities, public provenance and source hashes. All 84 documents normalize and self-score against source keys with full marks, with a wrong-answer deduction checked for every module.
- 380 distinct audio/image references passed HTTP checks. A Unicode dash in one image URL was percent-encoded; no images were cropped or redrawn. Media remains externally hosted; no R2 copy is claimed.
- Older source tests can have 41–43 numbered slots. Source numbering is retained, not forced to 40. Estimated bands are omitted by the existing result policy for non-40-slot tests.
- Source-perfect scoring verifies mapping, not independent correctness of the publisher's answer keys.

## Implementation

A `source_html` question group preserves the source's paragraphs, tables, pictures and option banks inside the existing exam frame. Original controls are replaced with explicit stable question bindings. The renderer reconstructs a small safe React HTML vocabulary after sanitizing; it does not run source scripts, styles, forms, inline handlers, links or hidden authentication fields. Input ownership, maximum lengths, source numbering and binding membership are validated on save. Single-field accepted alternatives are stored as `correct_answer_variants`, stripped from learner payloads, and handled separately from comma-delimited multi-answer slots. This prevents punctuation inside a valid answer from becoming an extra question.

The admin editor previews the same component, with layout/key editing behind a details panel. Preview answers do not modify the key. Multi-select limits are enforced, and option-bank dragging/dropdown choices keep original letter values.

Per-Part audio is a four-item sequence. Ending an audio advances to the next recording and corresponding question Part. Browsing question Parts does not rewind or change the audio. A visible Play action handles browser autoplay restrictions. Existing single-file Listening audio also gets this playback action.

## Database release

Validation branch contains all 84 candidate modules / 336 Parts. Production import creates missing books/tests/modules only; it never replaces an existing module. Existing Cambridge 1 Test 1 Listening (previously reviewed, 40 slots) is retained, so production adds 83 modules. Its Reading module and all existing attempts remain untouched. Books 1–10 are free and 11–21 premium; existing access/status settings are preserved.

Pre-import production books/tests/modules are backed up in `engnovate-production-before.json`. SQL builder emits statements; it does not select a connection or run them by itself. Apply transactions to the validation branch first. No schema migration is required.

## Reproduction

```
python scripts/imports/fetch-engnovate-listening.py /tmp/luma-engnovate
python scripts/imports/fetch-engnovate-public-keys.py /tmp/luma-engnovate
node scripts/imports/engnovate-listening.cjs /tmp/luma-engnovate /tmp/luma-engnovate/converted
node scripts/imports/build-listening-sql.cjs 2 /tmp/luma-engnovate/converted validation
```

The converter isolates each book in a child process to bound DOM memory. Missing/ambiguous keys, numbering gaps, unsupported controls and scoring mismatches are held for review rather than guessed.

## Checks completed before release

TypeScript and optimized Next build passed. Import/document/scoring regression tests passed, including all 84 identities, optional/comma answer variants, answer-key redaction and unsafe layout rejection. Browser fixture checks passed for source map images, tables, text/radio/checkbox controls, multi-select limits, drag/drop and audio sequencing. Real media files were used for image checks; browser audio playback was stubbed to test event sequencing, so this is not a listening/sound-quality test. Production HTTP scoring checks are recorded separately after data publication.
