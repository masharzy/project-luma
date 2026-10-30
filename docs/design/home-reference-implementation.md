# Homepage reference implementation

Source of truth: `design-reference/home.html` (verbatim uploaded HTML), with `design-reference/spec.md`. Prototype CSS is ported with `jtn-` namespacing to avoid changing the existing header or unrelated pages. Header files are untouched. The shared footer is replaced globally, as requested.

## Data

- Published Cambridge range: `public.cambridge_books.book_number` (computed min/max).
- Published book spines: `public.book_series`, stable creation/slug order, stored names, real series links, palette cycled by index. Up to 12 spines SSR, real total for overflow count. Cached 5 minutes.
- Free monthly allowances: existing `freePolicy()` / `public.evaluation_policy`. Cached 1 minute. No hardcoded allowances on failure.
- Hero streams immediately; data-dependent body is in Suspense. A database failure does not crash the hero or invent data.

## Route equivalents

| Prototype | Existing destination |
|---|---|
| `/practice/free-test`, `/practice/full-tests`, `/practice/modules` | `/practice` |
| `/practice/questions` | `/practice?view=questions` |
| `/books/cambridge` | `/cambridge` |
| `/books/more` | `/other-books` |
| Individual spine | `/other-books/<real-series-slug>` |
| `/plans` | `/pricing` |
| `/writing`, `/speaking` | `/writing-evaluation`, `/speaking-evaluation` |
| `/writing/task-2-guide` | `/ielts-writing-task-2` |
| `/mock-exams` | `/mocks` |
| `/resources/guides` | `/resources` (guide hub) |
| `/resources/worked-examples` | `/ielts-reading-practice` (worked examples) |
| `/resources/speaking-cue-cards` | `/resources/cue-cards` |
| `/signup`, `/recover` | `/auth/sign-up`, `/auth/forgot-password` |
| `/privacy`, `/terms` | `/pp`, `/tos` |

All destinations exist. No new APIs or application routes. No OG image existed in the repository/current metadata, so no image has been invented.

## Intentional adaptations

- Existing opaque sticky header retained. Hero subtracts its actual measured height (83px desktop, 75px mobile CSS fallback), with reference-reserved header padding removed.
- Actual published book count/titles may differ from the prototype sample. This is required by real-data rules.
- Inline prototype styles are compiled to scoped CSS classes or nonce-authorized server CSS. CSP is unchanged.
- Fonts self-hosted with `font-display: swap`; Anek Bangla and variable Bricolage preloaded. OFL licenses included.
- Native tabs gain roving focus and arrow/Home/End keys; highlights gain keyboard removal; record demo never requests microphone access.
- Interactive listeners, timers and ResizeObservers are cleaned up on navigation/unmount.

## Verification results

- Production build and typecheck passed; 132 unit/security tests passed, including catalog escaping and allowance overflow tests. HTTP integration tests require a configured server and are separate from the unit run.
- CI validation passed before the main release.
- Reference and implementation full-page screenshots captured at 360×800, 390×844, 768×1024, 1024×768, 1440×900 and 1920×1080.
- One H1 and no horizontal page overflow at all six implementation widths.
- Header + hero ends exactly at viewport height at all six sizes (800, 844, 1024, 768, 900, 1080 respectively).
- Production data: Cambridge 1–21; 10 published other-series links SSR; Writing 5 / Speaking 2 monthly free evaluations. At 390px two spines show and More books reads +8; at desktop all 10 current series show.
- 360px scrollbar accounting required reducing the More books left margin by 4px to fit two 52px spines. This small adaptation is required by the narrow-screen acceptance criteria.
- Browser checks passed: arrow-key tab activation; module/chip toggle and count; selecting/removing a Reading highlight; notes save indicator; Writing tooltip text and clamped position; 90 sample waveform bars with transcript and record-state toggle; cue rotation. Countdown timers run. No microphone permission request occurs.
- Preview browser logs showed only unrelated Grammarly extension warnings, no application errors/hydration warnings.
- Google PageSpeed/Lighthouse endpoint returned HTTP 429 (quota). Lighthouse SEO/Accessibility scores, LCP and CLS have **not** been certified; no 95+ or CLS claim is made.

## Changed files

- `src/app/(marketing)/page.tsx`: new SSR homepage and metadata/JSON-LD.
- `src/lib/home-prototype.ts`: trusted static reference markup and structured data.
- `src/lib/home-data.ts`: cached real data and escaped HTML generation.
- `src/components/home-interactions.tsx`: progressively enhanced demos and keyboard behavior.
- `src/components/footer.tsx`: new shared global footer.
- `src/app/layout.tsx`: imports scoped reference/font styles only; header unchanged.
- `src/styles/home-reference.css`, `src/styles/home-fonts.css`: scoped near-verbatim CSS and local fonts.
- `public/fonts/home/*`: font files and OFL licenses.
- `tests/home-data.test.mjs`: dynamic data/escaping checks.
- `design-reference/*`: supplied reference and spec, outside public/app build routes.
