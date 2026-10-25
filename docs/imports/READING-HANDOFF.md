# Reading import COMPLETE — production — 2026-10-25

Do not restart discovery or import. All **84 Cambridge Academic Reading tests** (Books 1–21, Tests 1–4) are imported into production. All 252 public key pages were retrieved; zero tests held for missing keys. This supersedes the previous stopped-work checkpoint.

## Release

PR #14: https://github.com/masharzy/project-luma/pull/14
Merge: `d51a8391376a87e4b4282e2c512aa507ce18360a`.
Production deployment: `dpl_7Z9SfCb44jpbWNx2QDscCYa7zzWg`, READY.
Site: https://project-luma-rho.vercel.app/cambridge
Admin: https://project-luma-rho.vercel.app/admin/cambridge

Production: 84 Reading modules / 252 Parts, plus 84 Listening modules / 336 Parts. All tests have both LR sections; 40 free / 44 premium. 83 Reading modules were inserted; the previous C1T1 sample was replaced only after its revision-2/hash guard matched. Every one of the 84 Listening document hashes and revisions is unchanged from `engnovate-reading-before.json`. Existing attempts, account/auth system and access settings remain intact.

## Data and rendering

`data/imports/engnovate-reading/` contains 84 normalized documents, final report, all 252 answer-page mappings, source identities/hashes, and 22 successful media checks. `remaining-answer-pages.json` is empty. The obsolete preliminary report was removed.

C1T1's 20-word bank is a three-column bordered grid, including make/surprised. Both keyboard input and drag/drop work; reuse is allowed per source instructions. Heading controls inside source passages remain inside the left passage pane, with option banks on the right. Admin uses the same renderer and preserves binding markers. Learner payloads omit keys/accepted variants.

Images are original, whole and externally hosted; no crop or owned-media copy is claimed. Source keys were verified for mapping/coverage, not independently audited against official Cambridge keys. Normal public web retrieval recovered pages that direct HTTP could not fetch; no browser challenges, authentication or gated exports were bypassed.

Four older source tests have non-40 numbering: C1T2 41, C1T3 38, C1T4 39, C3T4 41. These source slots are preserved; existing grading shows raw/percentage scores without an estimated band for those tests. Do not silently force 40.

## Validation

All 84 documents normalized and self-scored against their source keys; every module's wrong-answer deduction passed. 15 focused Reading/Listening/document/result regression tests passed. TypeScript and optimized Next build passed. Browser fixtures checked 20-word grid/reuse, radio controls, Part answer persistence and passage-heading drag/drop. All 22 image URLs returned HTTP 200.

Production HTTP results, answer-key redaction, 60-minute Reading timing, premium guest denial and Full Test Listening → Reading sequencing are recorded in `engnovate-reading-production-checks.json`. Public Cambridge 1 page returned 200 with Reading cards live. Release error/fatal log scan found none.

## Operations / future work

See `engnovate-reading.md` for reproduction. `keysFor()` now consumes the persisted checkpoint and checks per-Part question coverage. `build-reading-sql.cjs` emits SQL without choosing a connection; existing modules are protected by conflict/guard rules. No schema migration. Do not run bulk production writes again without an actual new request.

Neon project `holy-bird-58277611`, database `neondb`, production `br-ancient-salad-a1pk9zgd`, validation `br-fragrant-hall-a1yqo08w`. Custom auth only; never Neon Auth. Vercel project `prj_hOKly2ADgwEMyTzU4tkqO03BeXZB`, team `team_gq7mzXQoP1PTZiTGYeSbGT6F`.

Optional later work: independent official content/key audit, resolving historical source numbering differences, and owned media hosting. Writing/Speaking are outside this import.
