# Cambridge Academic Reading import

Scope: Books 1–21, four tests each, three Parts per test, 60 minutes. All 84 source pages and all 252 public answer-page identities have been retrieved and matched. All 84 documents normalize, cover their exact source numbering and score perfectly against source keys, with one wrong-answer deduction tested per module. No generated answer keys.

The saved `answer-key-checkpoint.json` contains public HTML or normal public web-text answer summaries, source URL and Book/Test/Part metadata. The converter checks identity and Part-level question coverage. Direct HTTP browser-check/rate-limit responses were not bypassed; independently public web retrieval recovered unavailable pages. Source-perfect scoring validates mapping, not independent official answer correctness.

## Layout

Imported groups preserve sanitized paragraphs, tables, images and option values inside the existing exam frame. Heading controls embedded in passages are rendered in the left pane, with banks on the right. Group and passage bindings are validated together, including foreign-Part rejection. Learner payloads omit keys and variants.

Pipe-separated banks are converted to three-column bordered word cells. C1T1 has all **20 options**, including make/surprised; each word can be reused when allowed. Both drag/drop and keyboard input work. Admin previews use the same controlled renderer and retain raw binding markers when editing.

All 22 image references passed HTTP GET checks. Images remain externally hosted, whole and uncropped. Reading has no audio. Existing Listening is not modified by this import.

## Validation and release

Validation database contains 84 Reading modules / 252 Parts. Regression checks cover all 84 scores, wrong-answer deductions, 20-word bank preservation, source passage ownership/XSS rejection, learner-key redaction and prior Listening imports. TypeScript passed. Browser fixtures passed for C1T1 word grid/reuse, radio interaction, Part answer persistence and C1T3 passage heading drag/drop.

Production release is pending at this code checkpoint. The SQL builder inserts 83 missing Reading modules and replaces only the backed-up C1T1 sample at its exact revision/hash guard. It appends Reading to test sections while preserving access, Listening, other modules and existing attempt snapshots. There is no schema/auth migration. Production checks will be recorded after deployment and data publication.

Pre-import backup: `engnovate-reading-before.json`. Detailed source and validation reports: `data/imports/engnovate-reading/`.

## Reproduction

```sh
mkdir -p /tmp/luma-engnovate-reading
python scripts/imports/fetch-engnovate-reading.py /tmp/luma-engnovate-reading
node scripts/imports/engnovate-reading.cjs /tmp/luma-engnovate-reading data/imports/engnovate-reading
node scripts/imports/build-reading-sql.cjs 2 data/imports/engnovate-reading validation
```

The converter uses the committed key snapshot by default; an explicit root-level answer-key-checkpoint.json overrides it. SQL emission does not choose or connect to a database. Review report eligibility and target branch before executing.

Older source tests may have fewer/more than 40 slots. Numbering is preserved and existing grading omits an estimated band for non-40-slot tests. Do not force 40 by dropping/inventing source questions.
