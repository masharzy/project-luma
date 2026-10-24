# Cambridge 1 · Test 1 · Listening import

Reviewed single-test import from the user-supplied IELTS MASTER Test 171 HTML, mapped to Cambridge 1 Test 1 using the previously supplied test identity and matching question content. This is not a generic bulk importer and makes no claim about other pages/books.

Source: https://practicepteonline.com/ielts-listening-test-171/

- Four Parts, 30 minutes, 38 question objects representing 40 answer slots.
- Q1–2 share the original 597×382 image. Q4 uses the original 626×203 image. Neither image is cropped. Original PNG bytes are preserved under `public/imports/cambridge-1-test-1`; the imported document embeds the same bytes so it survives asset-path changes.
- Q3 and Q5 are text choices. Q11–13 remain one three-answer group with all original A–I options, example B disabled, and correct E/F/H letters preserved.
- Forms and notes are converted to numbered inline gaps, not flattened into repeated independent sentences.
- Q34 has one source answer/number but an extra unnumbered HTML input. This reviewed adapter collapses it into one answer field; it does not silently renumber Q35–40.
- Q10 and Q14 preserve currency outside the input and accept the numeric answer without requiring duplicated currency symbols.
- Other answers are copied from the source key, not independently certified against an official paper. This imports the source's content; it does not prove the source key is error-free.
- Full audio remains hosted at the source HTTPS URL; HEAD returned HTTP 200, audio/mpeg, with byte-range support. It has not been copied to Cloudflare storage or listened to end-to-end.

`cambridge-1-test-1-before.json` preserves the existing production Listening document and revision before replacement. Reading is not modified. New attempts snapshot the imported document; existing attempts keep their earlier snapshots.

Recreate the reviewed document with:

```
node scripts/imports/cambridge-one-listening.cjs /path/to/supplied-page.html
```

The adapter rejects a different title/group structure, missing 40-answer key, altered choice counts and unnumbered completion fields (except the explicit reviewed Q34 fix). Source SHA and adjustments are recorded in the report JSON. Runtime normalization and scoring tests verify 40 slots, original image bytes, preserved multi-select letters, 40/40 for source answers, wrong-picture deductions and image scheme validation.
