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
