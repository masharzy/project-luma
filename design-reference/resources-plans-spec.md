# JumpToNine: Resources Page and Plans Page, Design Spec and Build Prompt

Hand this single file to Claude Code. It contains (1) the prompt, (2) shared rules, (3) the Resources page spec, (4) the Plans page spec, and at the bottom (5) **Appendix A and B: the two reference HTML prototypes, verbatim**. If anything in this spec disagrees with an appendix, **the appendix wins**.

These two pages belong to the same design system as the new home page. If the home page has already been implemented, reuse its tokens, fonts, buttons, links and footer component instead of creating new ones.

---

## 1. Prompt for Claude Code (copy this part first)

You are replacing the **Resources page** and the **Plans (pricing) page** of the existing JumpToNine production app (an IELTS practice platform) with a new design. Two finished, pixel-accurate single-file prototypes are in Appendix A (Resources) and Appendix B (Plans). Your job is a 100% faithful, production-ready implementation inside the real codebase.

Do this in order:

1. Extract Appendix A to `design-reference/resources.html` and Appendix B to `design-reference/plans.html` (outside the build). Open both in a browser. They are the visual source of truth for spacing, colour, type, motion and responsive behaviour.
2. Explore the repo before writing code: framework and router, styling approach, font loading, the existing header and footer components, the current Resources and Plans pages, and where plan data comes from.
3. Replace both pages following sections 2 to 6.
4. Verify with screenshots (section 6) and fix every difference.
5. Finish with a short report: files changed, data sources used, routes you could not map (section 5), and anything you could not match exactly.

Hard rules:

- **Do not edit the header.** Not its markup, styles, behaviour or links. The prototypes include a header only for visual context. Do not copy it.
- **The footer is replaced** with the new footer (section 2.4). If it is a shared layout component, replace it globally and say so in your report.
- **Match the prototypes exactly**: tokens in section 2.2, copy in sections 3 and 4, breakpoints in section 2.3. Port the prototype CSS near-verbatim (scoped per page or component). If the repo uses Tailwind, put the tokens in the theme and use arbitrary values where needed.
- **Production ready**: all copy and all plan content is server-rendered (SSR or SSG) for SEO. JavaScript only powers the small interactions listed. No layout shift.
- **Data**: the Resources page is static. The Plans page is data driven (section 4.1). The preview control in the Plans prototype and its sample plans are for review only: do not ship them.
- **Do not invent routes or APIs.** Map each link to an existing route (section 5). If a route does not exist, keep the href from the table and list it in your report.
- No new heavy dependencies, no animation library, no UI kit. CSS animations only.
- Respect `prefers-reduced-motion`, keep visible keyboard focus, no horizontal scroll from 320px up.
- Do not touch unrelated pages.

---

## 2. Shared rules

### 2.1 Scope

| Part | Editable |
|---|---|
| Header (logo, nav, mobile menu, Dashboard button) | **No. Leave untouched.** |
| Page content of Resources and Plans | Replace |
| Footer | Replace |

Both pages sit under the header in normal flow (the header is not an overlay on these pages). No hero treatment is needed. Page content starts directly under the header with the breadcrumb.

### 2.2 Design tokens

**Colour**

| Token | Hex | Use |
|---|---|---|
| `--paper` | `#FDFBF7` | Page background |
| `--c` (crimson) | `#C8082F` | Brand, CTAs, accents, featured plan, numerals |
| `--w` (wine) | `#7B1230` | Links, outline buttons, borders on emphasis |
| `--ink` | `#2A0F16` | Body text, strong hairlines |
| `--sand` | `#F3EADC` | Ready-now section, Free band, journal tile |
| `--blush` | `#FBE6EA` | Vocabulary tile, stairs fill, hover tints |
| `--mist` | `#EBEFF6` | Grammar tile |
| `--mute` | `#6A4852` | Secondary text |
| `--line` | `rgba(123,18,48,.18)` | Hairlines, card borders |

Extra: Ebook tile `#E6EEE6`; grammar fix colours: wrong `rgba(200,8,47,.12)` with `#C8082F` wavy underline, right `#D3EBD8`; strong underline `#2E8B4E`; journal highlight `#FFE27A`.

**Fonts**

| Role | Family | Weights |
|---|---|---|
| Display (headings, numerals, prices, labels) | **Bricolage Grotesque** (optical size 12 to 96) | 500 to 800, headings 600, numerals 700 |
| Body | **Instrument Sans** | 400, 500, 600 |
| Taka sign `৳` | **Anek Bangla** | 800 (load `bengali` and `latin` subsets) |
| Reading serif (sample answer, journal, word-card meanings) | Georgia, "Times New Roman", serif | 400, italic |

Use the framework's font loader or self-host, `font-display: swap`. Display fallback: `'Bricolage Grotesque','Instrument Sans',system-ui,sans-serif`.

**Type and layout**

- Base text 1rem/1.6. `h2`: `clamp(2rem, 4.8vw, 4rem)`, line 1, `-0.035em`, max 13ch. `h3`: 1.5rem/1.1, `-0.025em`. Lead: 1.05rem, `--mute`, max 44ch.
- Container: `max-width: 1160px`, horizontal padding `clamp(20px, 4vw, 40px)`.
- Default section padding: `clamp(64px, 9vw, 120px)` vertical (individual sections below override it).
- Edge variable for the in-flow header context: `--gx: calc(max(0px, (100vw - 1160px) / 2) + clamp(20px, 4vw, 40px))`.
- Radii: 2px on buttons and cards, 99px on pills and chips, 50% on dots. No soft shadows. Only hard offset shadows where specified.
- Primary button: crimson, white text, padding `.95em 1.6em`, weight 600, hover wine. Text link: wine, weight 600, 1.5px bottom border, hover crimson.
- Typographic punctuation in all visible text (’ “ ” and en dashes). Latin digits throughout.

### 2.3 Breakpoints

Max 1000, max 860, max 700, max 640, max 560, plus min 701, min 1001 and min 1101 where noted. No horizontal scroll from 320px. No clipped text. Grid and flex children holding text need `min-width: 0`. Tap targets at least 44px high.

### 2.4 Footer (replaced)

Paper background. Grid `1.3fr repeat(4, 1fr)`, 2 columns at ≤1000 with the brand block spanning both. Brand: wordmark "JumpToNine" and "Listening. Reading. Writing. Speaking." Columns:

- Practice: Cambridge 1–21, More books, Mock exams, Full tests and modules, Question practice, AI Writing, AI Speaking
- Learn: Resources, IELTS Listening practice, IELTS Reading practice, Writing Task 2 guide, About JumpToNine
- Account: Plans, Dashboard, Create an account, Password recovery
- Legal: Privacy policy, Terms of service

Legal row (top hairline): "© [current year] JumpToNine" and "Independent IELTS practice platform. Not the official IELTS test." Below it a giant clipped wordmark "JumpToNine" in blush (`19vw`, line-height .78, bottom cropped, `aria-hidden`). The link for the current page gets `aria-current="page"` and crimson text (Resources on `/resources`, Plans on `/plans`).

### 2.5 SEO, accessibility, performance

- Exactly one `h1` per page, one `h2` per section, real `<a href>` for every link, breadcrumb as `<nav aria-label="Breadcrumb">`, decorative visuals `aria-hidden`.
- Each page has its own `<title>`, meta description, canonical (real production URL; prototypes use a placeholder), Open Graph tags (reuse the site OG image) and JSON-LD (given in the appendices).
- Colour contrast at least AA. Visible focus: 2px crimson outline, 3px offset.
- `prefers-reduced-motion`: disable all animation and transition, keep final states.
- Lighthouse SEO and Accessibility at least 95, CLS under 0.05, no console errors or hydration warnings.

---

## 3. Resources page (`/resources`, static)

Order: breadcrumb and title, Ready now (Speaking Cue Cards), Build your skills (tiles), Also useful, footer.

**Priorities (do not change):** the main resources are **Speaking Cue Cards, Writing Samples, Vocabulary, Grammar, Ebook Shelf and Study Journal**. **Writing Samples** is a main product and its name is exactly "Writing Samples" (never "Writing Samples & Guides"). The three practice guides are **not** resources and must **never** be shown as cards. They appear only as the quiet text row at the bottom.

### 3.1 Title

- Padding `clamp(28px, 4vw, 48px) 0 clamp(48px, 7vw, 88px)`. Breadcrumb "Home / Resources" (.82rem, `--mute`, margin-bottom `clamp(28px, 5vw, 56px)`).
- `h1` "Your learning toolkit." (`clamp(2.8rem, 9.5vw, 8rem)`, line-height .92, `-0.06em`, max-width 9ch).
- Lead: "Speaking cue cards, writing samples, vocabulary, grammar, ebooks and a study journal in one place. Start with what is ready."

### 3.2 Ready now (Speaking Cue Cards)

- Sand background, default section padding. Two columns, gap `clamp(28px, 7vw, 100px)`, vertically centred; one column at ≤860.
- Left: a stack of three cue cards (`max-width: 460px`, `height: clamp(290px, 56vw, 330px)`). Each card is a button, absolutely positioned with `inset: 0 28px 28px 0`, 1px line border, padding `clamp(20px, 3.5vw, 36px)`. Card backgrounds: white, blush, paper. Content: small crimson label "Speaking cue card", a display title (`clamp(1.5rem, 3vw, 2rem)`), and a one-line muted hint. Below the stack: "Tap a card for the next topic." (.82rem, muted).
  1. Describe a book that changed how you think. / What it was, when you read it, why it mattered.
  2. Describe a place you would like to visit. / Where it is, why you want to go, what you would do.
  3. Describe a person who helped you learn. / Who they are, how they helped, what you learned.
- Right: a status line with a filled crimson dot and "Available now" (crimson, 600, .88rem), `h2` "Speaking Cue Cards" (max 10ch), lead "Pick a Part 2 topic, take a minute to prepare, then answer in your own words.", primary button "Practice cue cards".
- **Deck behaviour**: each card has a CSS variable `--i` of 0, 1, 2. Clicking any card sets every card to `(i + 2) % 3`. Transform `translate(calc(var(--i)*14px), calc(var(--i)*14px)) rotate(calc(var(--i)*2.4deg - 2.4deg))`, `z-index: calc(3 - var(--i))`, .55s `cubic-bezier(.2,.8,.2,1)`.

### 3.3 Build your skills (tiles)

- `h2` "Build your skills." (margin-bottom `clamp(28px, 4vw, 48px)`). Grid: 2 columns, gap 16px; 1 column at ≤700.
- Every tile is one `<a>` (whole tile clickable): background tint, padding `clamp(22px, 3vw, 34px)`, `min-height: 380px` (none at ≤700), hover or focus lifts 6px. Inside: a visual area (flex 1, min-height 170px, centred, `aria-hidden`), then `h3` (`clamp(1.7rem, 3vw, 2.3rem)`, line 1), a status line, a one-line description (max 34ch, muted) and a link line with an arrow that moves 6px right on hover.
- **Status line**: a small dot (8px) plus text. Resources that are ready show a filled crimson dot and "Available now". Others show a hollow wine dot and "Collection in progress". Drive this from a per-resource flag in code so it can be switched without a redesign.
- Tile order and content:

| Tile | Background | Description | Link text | Route |
|---|---|---|---|---|
| **Writing Samples** (wide, spans both columns) | crimson, white text | Task 1 and Task 2 structure, ideas and sample answers in one place. | Explore writing | `/resources/writing` |
| Vocabulary | blush | The words each topic needs, and how to use them correctly. | Explore vocabulary | `/resources/vocabulary` |
| Grammar | mist | Common mistakes, and practice for writing clearer sentences. | Explore grammar | `/resources/grammar` |
| Ebook Shelf | `#E6EEE6` | Books and workbooks for IELTS preparation, kept in one place. | Browse ebooks | `/resources/ebooks` |
| Study Journal | sand | Preparation strategies, study habits and short learning notes. | Read journal | `/resources/journal` |

- **Wide Writing Samples tile**: at ≥701 it is a 2-column grid (`1fr 1.1fr`, gap `clamp(24px, 5vw, 64px)`, min-height 340px) with the text on the left and the visual on the right; stacked (visual first) below that. Text, status and arrow are white. Visual: a white sample-answer paper (`max-width: 440px`, padding 20px 22px, Georgia 1.05rem/1.85, rotated 1.2deg, hard shadow `8px 8px 0 rgba(0,0,0,.18)`) with a small crimson label "Task 2 sample answer" and the sentence "Some people believe that online learning is better than classroom teaching. [I partly agree, because it gives students flexibility], but [access still depends on income]." The two bracketed phrases carry a 2px green underline (`#2E8B4E`); on tile hover or focus a green highlight (`#D3EBD8`) sweeps in behind each phrase over .6s (the second delayed .25s).
- **Vocabulary visual**: three overlapping white word cards (150×98px, rotated -6, -1, 4deg) showing "resilient / able to recover quickly", "mitigate / make less severe", "viable / able to work in practice". On hover the first card moves 16px left and rotates -14deg, the third moves 18px right and rotates 12deg (.45s).
- **Grammar visual**: Georgia sentence "She [don’t] like tea." The word in brackets is red-marked; on hover it slides up and fades while "doesn’t" (green-marked) slides in from below, both in one inline grid cell so the sentence does not shift.
- **Ebook visual**: six book spines (30px wide, heights 92, 120, 102, 130, 96, 114px; colours `#3C5A80, #C8082F, #B9770E, #5B3A78, #1F6F78, #46634F`) standing on a wine plank (8px). On hover every spine lifts (odd 12px, even 5px) with a 40ms stagger.
- **Journal visual**: a ruled paper note (max 290px, 26px line-height ruling, rotated -1.5deg, hard shadow `6px 6px 0 rgba(123,18,48,.12)`) reading "Day 12. Three Reading passages in 52 minutes. Slow on headings, [do them first] next time." The bracketed text gets a yellow highlight that sweeps in on hover (.7s).

### 3.4 Also useful (quiet row)

Top hairline, padding `clamp(40px, 6vw, 72px) 0`. A small `h2` "Also useful" (1rem, muted, not large) and an inline wrapping list of three text links (wine, 600, hover crimson with underline): IELTS Listening Practice, IELTS Reading Practice, IELTS Writing Task 2 Practice. No cards, no boxes, no descriptions.

### 3.5 Metadata

- Title: "IELTS Learning Resources: Speaking Cue Cards, Vocabulary, Grammar and Ebooks | JumpToNine"
- Description: "Free IELTS learning resources in one place: Speaking cue cards, Writing samples, Vocabulary, Grammar, an ebook shelf and a study journal. Start with what is ready."
- JSON-LD: `BreadcrumbList` plus `CollectionPage` with an `ItemList` of the six resources (copy from Appendix A and use the real URLs).

---

## 4. Plans page (`/plans`, data driven)

Order: breadcrumb and title, plan cards, How credits work, Continue with Free, footer. The page is deliberately **compact**: previous versions felt oversized, so keep every section at the sizes below.

### 4.1 Data

Read plans from the existing plans data source (the same one the admin creates and edits plans in). Do not hardcode plans.

```ts
type Plan = {
  id: string; slug: string; name: string;
  tagline?: string;
  price: number;              // in BDT (taka)
  period: 'month';            // render "/ month" (extend if other periods exist)
  writingCredits: number;     // per month
  speakingCredits: number;    // per month
  features: string[];         // 2 to 6 short lines
  recommended?: boolean;      // at most one
  isFree?: boolean;
  isActive: boolean;
  sortOrder: number;
}
```

- **Paid cards**: active, non-free plans sorted by `sortOrder`. At most one is `recommended`.
- **Free plan**: the plan with `isFree`. It is never a card. Its `writingCredits` and `speakingCredits` feed the Free band (prototype: 5 and 2).
- Format prices with a thousands separator (`1,199`), Latin digits, `৳` before the number.
- The prototype's sample plans (Starter, Standard, Plus, Pro, Intensive, Ultimate) and the "Plans 0 to 6" preview control are review aids only. Do not ship them. If useful, keep a local fixture or story with 0 to 7 plans for testing the layout.
- Server-render the page and cache it. Never block rendering on client JS.

### 4.2 Title

- Padding `clamp(20px, 3vw, 32px) 0 clamp(24px, 3.5vw, 40px)`. Breadcrumb "Home / Plans" (margin-bottom `clamp(20px, 3vw, 32px)`).
- `h1` on two lines: "A little practice." in ink and "A bigger possibility." in crimson. Size `clamp(2.2rem, 5.6vw, 4.4rem)`, line-height .98, `-0.055em`.
- Lead (1rem): "Prepare at your own pace. Pick the plan that fits your Writing and Speaking feedback."
- Decorative mini staircase on the right of the heading (`aria-hidden`, width `clamp(130px, 16vw, 190px)`, hidden at ≤700): five steps drawn as a 2px crimson outline (opacity .5) over a blush fill, with a crimson dot (r=6) that hops step to step on a 6s loop starting after 1s (keyframes in Appendix B, `hp`).

### 4.3 Plan cards: layout follows the plan count

Base grid: 6 equal columns, gap 14px, container width. Cards in the same row stretch to equal height; the button always sits at the bottom of the card.

| Paid plans (n) | Desktop layout |
|---|---|
| 0 | No cards. Show the empty state: "Paid plans are being prepared. Published plans will appear here." (display font, `clamp(1.4rem, 3vw, 2rem)`, muted, max 24ch). The page still shows credits and the Free band. |
| 1 | One wide card centred (columns 2 to 5). Inside it, the two allowances sit side by side (gap 2rem) and features flow in 2 columns (≥1001px). |
| 2 | 2 columns |
| 3 | 3 columns |
| 4 | 4 columns in one row at ≥1101px; 2 × 2 below that |
| 5 | 3 on the first row and 2 on the second (the second-row cards span 3 columns each so the row is full) |
| 6 | 3 × 2 |
| 7 or more | `repeat(auto-fit, minmax(300px, 1fr))` |

Tablet and phone: ≤1000px use 2 columns (when n is odd, the last card spans both columns); ≤640px use 1 column. Never let 5 or 6 cards sit in a single row.

### 4.4 Plan card anatomy (top to bottom)

- Card: white background, 1px `--line` border, padding `clamp(20px, 2.4vw, 28px)`, hover or focus-within lift 4px (.35s).
- **Header row**: plan name (`h3`, `clamp(1.25rem, 1.9vw, 1.5rem)`) and, for the recommended plan, a "Most chosen" pill (white on crimson, .75rem, 600).
- **Tagline** (muted), omitted if empty.
- **Price row** (margin `.9rem 0 1rem`): `৳` set in Anek Bangla 800 at .62em, digits in Bricolage 700 `clamp(2.2rem, 3.6vw, 2.8rem)` with `-0.06em`, then "/ month" (.95rem, muted).
- **Allowance block** (top and bottom hairlines, padding `.9rem 0`, margin-bottom 1.1rem): two columns. Each has a large number (Bricolage 700, 1.8rem), a label ("Writing / month", "Speaking / month", .85rem muted) and a 3px bar. Bar width = this plan's value divided by the **largest value among the cards shown**, calculated separately for Writing and Speaking. The bar animates from 0 to its width in .9s (`cubic-bezier(.2,.8,.2,1)`) after mount (skip with reduced motion).
- **Feature list**: 1.02rem/1.4, gap .6rem, each line with a crimson check mark drawn in CSS (a rotated L-shaped border, 2.5px). Keep features larger than body text and never smaller than 1rem.
- **Button** (full width, bottom): outline wine, 1.5px border, padding `.7em 1.2em`, label "Choose [Plan name]", hover fills wine with white text. Link target is the existing checkout or subscribe flow for that plan (section 5).
- **Recommended card**: crimson background and border, white text. Tagline and period at 88% white, hairlines and bar track at 30% white, bar fill white, check marks white, button inverted (white with crimson text, hover blush). It is the only coloured card. Do not raise or scale it, so the rows stay aligned.
- Long content: names and features wrap; never truncate. Plans with `0` credits show `0` and an empty bar. If `tagline` is missing the card simply has no tagline line.

### 4.5 How credits work (static, quiet strip)

Top hairline, padding `clamp(24px, 3.5vw, 36px) 0`. A small `h2` "How credits work." (1rem, muted). Four columns (2 at ≤1000, 1 at ≤640), each with a top ink hairline, a bold label (.98rem) and one muted line (.88rem):

1. Monthly reset: Limits reset on the first day of each month (UTC).
2. One credit per Writing: Each Writing submission uses one credit, for either task.
3. Speaking is separate: Speaking credits are counted on their own.
4. Cambridge Writing: Cambridge Writing uses the same Writing allowance.

### 4.6 Continue with Free (bottom)

Free is the default choice for most people, so it lives at the bottom as one calm row, not as a card.

- Sand background, padding `clamp(32px, 5vw, 52px) 0`. Two columns (`1fr auto`, one column at ≤860).
- Left: `h2` "Or stay on Free." (`clamp(1.5rem, 2.8vw, 2.1rem)`), a facts line (1rem, display font, 600) with `৳0`, a crimson dot and "[N] Writing / month", a crimson dot and "[N] Speaking / month" (numbers from the Free plan record), and a note (.88rem, muted, max 56ch): "A verified account is required for AI evaluation. Free Listening and Reading practice stays open to guests."
- Right: primary-style button **Continue with Free** (wine background, hover ink) and a text link "View my allowance". Buttons wrap under each other on narrow screens.
- Continue with Free goes where free users normally go next (the prototype uses `/dashboard`; the existing auth guard should handle guests). View my allowance goes to the existing allowance or usage page.

### 4.7 Metadata

- Title: "IELTS Practice Plans and Pricing | JumpToNine"
- Description: "Choose a JumpToNine plan for AI Writing and Speaking evaluation, or continue with Free. Monthly credits reset on the first day of each month (UTC)."
- JSON-LD: `BreadcrumbList` (in the prototype). Optionally add an `ItemList` of `Offer` objects generated from the plans data (`name`, `price`, `priceCurrency: "BDT"`, `url`).

---

## 5. Route map

Keep these hrefs unless an equivalent route already exists. Report any you cannot map.

| Link | Prototype href |
|---|---|
| Practice cue cards, Speaking Cue Cards | `/resources/speaking-cue-cards` |
| Explore writing (Writing Samples) | `/resources/writing` |
| Explore vocabulary | `/resources/vocabulary` |
| Explore grammar | `/resources/grammar` |
| Browse ebooks | `/resources/ebooks` |
| Read journal | `/resources/journal` |
| IELTS Listening Practice | `/ielts-listening-practice` |
| IELTS Reading Practice | `/ielts-reading-practice` |
| IELTS Writing Task 2 Practice, Writing Task 2 guide | `/writing/task-2-guide` |
| Choose [Plan] | `/checkout?plan=<slug>` |
| Continue with Free | `/dashboard` |
| View my allowance | `/dashboard/allowance` |
| Footer links | as in section 2.4, same hrefs as the home page spec (`/books/cambridge`, `/books/more`, `/mock-exams`, `/practice/full-tests`, `/practice/questions`, `/writing`, `/speaking`, `/resources`, `/about`, `/plans`, `/dashboard`, `/signup`, `/recover`, `/privacy`, `/terms`) |

---

## 6. QA and acceptance

1. Screenshot each prototype and the implementation at **360, 390, 768, 1024, 1440, 1920** wide, full page, and compare section by section. Fix every visible difference.
2. **Resources**: deck rotates on click and keyboard; all tile hover and focus animations run; Writing Samples is the wide crimson tile; guides appear only in the quiet row; no card for any guide; no horizontal scroll at 320px.
3. **Plans**: test with 0, 1, 2, 3, 4, 5, 6 and 7 plans. Check: 5 plans give 3 + 2 on desktop; 4 plans are one row at 1440 and 2 × 2 at 1024; 6 plans are 3 × 2; tablet is 2 columns with a full-width last card when the count is odd; phone is 1 column; buttons align at the bottom of each row; bars scale to the largest value shown; the recommended card is the only coloured one; empty state works.
4. Plans data: prices format with separators and `৳`; Free band numbers come from the Free plan record; inactive plans never show.
5. Header untouched: `git diff` shows no change to header files.
6. Lighthouse, accessibility and console checks from section 2.5 pass.

---

## Appendix A: Reference HTML for the Resources page (verbatim)

Save everything inside the fenced block below as `design-reference/resources.html`.