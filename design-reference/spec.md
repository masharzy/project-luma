# JumpToNine Home Page: Design Spec and Build Prompt

Hand this single file to Claude Code. It contains (1) the prompt, (2) the full design spec, and (3) at the bottom, **Appendix A: the reference HTML prototype, verbatim**. If anything in this spec disagrees with Appendix A, **Appendix A wins**.

---

## 1. Prompt for Claude Code (copy this part first)

You are replacing the home page of the existing JumpToNine production app (an IELTS practice platform) with a new design. A finished, pixel-accurate single-file prototype is in Appendix A of this document. Your job is a 100% faithful, production-ready implementation of it inside the real codebase.

Do this in order:

1. Extract Appendix A verbatim to `design-reference/home.html` (outside the build). Open it in a browser. It is the visual source of truth for spacing, colour, type, motion and responsive behaviour.
2. Explore the repo before writing code: framework and router, styling approach (Tailwind, CSS modules, etc.), font loading, the existing header component, the existing footer component, the current home page, where book data comes from, where plan/pricing data comes from.
3. Replace the home page with the new design, following sections 2 to 11 below.
4. Verify with screenshots (section 11) and fix every difference.
5. Finish with a short report: files changed, data sources used, routes you could not map (section 10), and anything you could not match exactly.

Hard rules:

- **Do not edit the header.** Not its markup, styles, behaviour or links. Only adapt the hero around it (section 2.2).
- **Everything else on the home page is replaced**, including the footer. If the footer is a shared layout component used by other pages, replace it as the new global footer and say so in your report.
- **Match the prototype exactly**: tokens in section 3, copy in section 5, breakpoints in section 4. Port the prototype CSS near-verbatim (per section, scoped) rather than re-deriving it in a different system. If the repo uses Tailwind, put the tokens in the theme and use arbitrary values where needed.
- **Production ready**: all copy and book links are server-rendered (SSR or SSG) for SEO. JavaScript only powers the interactions in section 6. Anything random or time-based renders on the client only, with no hydration mismatch and no layout shift.
- **Real data only in two places**: the books shelf and the free-plan allowance in the Plans section (section 8). Everything else stays static in code.
- **Do not invent routes or APIs.** Map each link to an existing route (section 10). If a route does not exist, keep the href from the table and list it in your report.
- No new heavy dependencies. No animation library, no UI kit. CSS animations only.
- Respect `prefers-reduced-motion`, keep visible keyboard focus, keep the page free of horizontal scroll from 320px up.
- Do not touch unrelated pages.

---

## 2. Scope

### 2.1 What is editable

| Part | Editable |
|---|---|
| Header (logo, nav, mobile menu, Dashboard button) | **No. Leave untouched.** |
| Hero | Replace |
| Books, Practice, Test tools, AI feedback, Mock exams, Learn, Plans, FAQ, Final CTA | Replace |
| Footer | Replace |

The prototype includes a header only so you can see how the hero sits under it. Do not copy the prototype header.

### 2.2 Hero and the existing header

In the prototype the header is transparent and absolutely positioned over the hero, and the hero is `min-height: 100svh` with its content vertically centred. Keep that visual result without editing the header:

1. Read how the existing header is positioned and measure its height.
2. If it overlays content (absolute or fixed and transparent), copy the prototype hero as is.
3. If it is in normal flow, or sticky with its own background, set a CSS variable `--header-h` to its height, make the hero `min-height: calc(100svh - var(--header-h))`, and reduce the hero top padding (prototype: 104px, which already reserves the header) so that header plus hero equals exactly one viewport.
4. In every case the first headline line must never touch the header. Minimum gap between header bottom and headline top: 40px at 1440×900, 24px at 375×667.
5. The hero must be exactly one screen tall on first view at 1440×900, 1920×1080, 390×844 and 667×375 (landscape phone may grow taller instead of clipping content).

---

## 3. Design tokens

### 3.1 Colour

| Token | Hex | Use |
|---|---|---|
| `--paper` | `#FDFBF7` | Page background, cards |
| `--c` (crimson) | `#C8082F` | Brand, CTAs, accents, numerals |
| `--w` (wine) | `#7B1230` | Links, borders, shelf plank, hover |
| `--ink` | `#2A0F16` | Body text, tooltip background |
| `--sand` | `#F3EADC` | Books and final CTA sections |
| `--blush` | `#FBE6EA` | Writing panel, hero stairs fill |
| `--mist` | `#EBEFF6` | Test tools section |
| `--sage` | `#E6EEE6` | Mock exams section |
| `--mute` | `#6A4852` | Secondary text |
| `--line` | `rgba(123,18,48,.18)` | Hairlines, borders |

Hero headline line colours: line 1 `#B5617A`, line 2 `#D03A5C`, line 3 `#C8082F`.
Writing marks: mistake bg `rgba(200,8,47,.12)` underline `#C8082F` (wavy); needs-update bg `#FFF1B8` underline `#E0A800`; strong bg `#D3EBD8` underline `#2E8B4E`. Tooltip dot colours on the dark tooltip: `#FF6B86`, `#F5C518`, `#5CC47F`. Reader highlight `#FFE27A`.

### 3.2 Fonts

| Role | Family | Weights | Notes |
|---|---|---|---|
| Display (headings, big numerals, UI labels) | **Bricolage Grotesque** | 500 to 800, optical size 12 to 96 | Headings 600, numerals and band score 700, letter-spacing negative |
| Body | **Instrument Sans** | 400, 500, 600 | Base 1rem/1.6 |
| Bangla headline | **Anek Bangla** | 800 | Hero `h1` only. Load with `bengali` and `latin` subsets |
| Reading serif | Georgia, "Times New Roman", serif | 400 and italic | Reading passage, essay, transcript line |

Use the framework's font loader or self-host, `font-display: swap`, preload the hero fonts (Anek Bangla 800 and Bricolage Grotesque). Fallback stack for display: `'Bricolage Grotesque','Instrument Sans',system-ui,sans-serif`.

### 3.3 Type scale

| Element | Size | Line | Letter-spacing |
|---|---|---|---|
| `h2` | `clamp(2rem, 4.8vw, 4rem)` | 1 | -0.035em, max-width 13ch |
| `h3` | 1.5rem | 1.1 | -0.025em |
| Lead paragraph | 1.05rem, colour `--mute`, max-width 44ch | 1.6 | none |
| Hero Bangla line 1 / 2 / 3 | `clamp(1.7rem, min(4.4vw,7.5vh), 4rem)` / `clamp(2.3rem, min(6.4vw,11vh), 6rem)` / `clamp(3.2rem, min(11vw,18vh), 10rem)` | 1.05 | none |
| Plans `h2` "Start free." | `clamp(3.2rem, 12vw, 10rem)` | .85 | -0.065em, crimson |
| Final CTA `h2` | `clamp(2.6rem, 7vw, 6rem)`, max-width 11ch | 1 | -0.035em |
| Countdown (mock) | `clamp(4rem, 10vw, 7.5rem)`, 700, tabular numerals | .9 | -0.06em |

Typographic punctuation in all visible text: use ’ and “ ” and the en dash in `1–21`.

### 3.4 Layout tokens

- Container: `max-width: 1160px`, horizontal padding `clamp(20px, 4vw, 40px)`.
- Section vertical padding: `clamp(72px, 10vw, 140px)`.
- Edge variable used by full-bleed parts (hero, Writing/Speaking split) so their content lines up with the container on wide screens:
  `--gx: calc(max(0px, (100vw - 1160px) / 2) + clamp(20px, 4vw, 40px))`.
- Radii: 2px on buttons and cards; 99px on chips; 50% on dots and the record button. No soft shadows. Only the hard offset shadow on the test sheet (`10px 10px 0 var(--w)`) and the mobile-less cue stack.
- Borders: 1px `--line` hairlines, 1px `--ink` for the plans spec rows' top rule.
- Buttons: crimson background, white text, padding `.95em 1.6em`, weight 600, hover to wine. Text links: wine, weight 600, 1.5px underline via bottom border, hover crimson.

---

## 4. Responsive rules

Breakpoints used (all in the prototype): **max 1000**, **max 860**, **max 760**, **min 700**, **max 560**.

- ≤1000: footer becomes 2 columns, brand block spans both.
- ≤860: section heads, practice panes, tools, AI split, learn, plans all become one column. Hero stairs become `width: 140vw`, opacity .3. Writing and Speaking content use `padding-inline: var(--gx)`.
- ≤760: mock "pass" ticket stacks vertically, perforation turns horizontal, barcode turns vertical stripes and 44px tall.
- ≥700: the "More books" book leans 7deg.
- ≤560: practice timing bars stack vertically with proportional widths, mock flow becomes 2 columns, band card stacks, spines scale to 86% height.

Rules that always apply: no horizontal scroll from 320px; no clipped text anywhere; grid and flex children that hold text need `min-width: 0`; tap targets at least 44px high.

---

## 5. Sections

Page order: Hero, Books, Practice, Test tools, AI feedback (Writing | Speaking), Mock exams, Learn, Plans, FAQ, Final CTA, Footer. Section backgrounds in that order: paper with grid, sand, paper, mist, blush | paper, sage, paper, paper (top hairline), paper, sand, paper.

### 5.1 Hero (static)

- Height: one viewport (`100svh`, min 100vh fallback). Padding `104px var(--gx) max(40px, env(safe-area-inset-bottom))`. Content centred vertically, left aligned. Overflow hidden.
- Background: paper with a 56px grid of 1px lines in `rgba(200,8,47,.055)`, plus a paper-to-transparent fade over the top 22% so the header stays readable. Behind the text, an SVG staircase anchored bottom-right, `width: min(66vw, 125vh)`:
  - A blush filled polygon under the steps (opacity .75), a crimson 2px step outline (opacity .5), numerals 4 to 8 as outlined text (stroke 1.3, opacity .6) growing in size, the 9 solid crimson and largest, and a crimson dot (r=10) that hops step to step and loops.
  - Exact path: `M90 600H220V515H350V430H480V345H610V260H740V175H870`; fill polygon closes to `V700H90Z`. Numeral positions and sizes are in Appendix A.
- Headline (`h1`, `lang="bn"`, Anek Bangla 800): three stacked lines, each progressively larger and closer to crimson: `প্রতিদিন` / `একটু` / `এগিয়ে যাও।`
- English line (max 38ch, `--mute`): "IELTS practice for Listening, Reading, Writing and Speaking. Every test brings your target band a little closer."
- Actions: primary button "Take a free test", text link "View plans" (scrolls to `#plans`).
- Motion (one orchestrated moment): each headline line rises from `translateY(110%)` inside an `overflow:hidden` wrapper, .95s `cubic-bezier(.2,.8,.2,1)`, delays 0 / .25 / .5s. English line and actions fade in at 1.2s. Stairs outline draws over 2.6s starting .4s. The dot hops on a 9s loop starting 3.2s. Keyframes are in Appendix A (`hop`, `draw`, `up`, `fade`). With reduced motion: everything in its final state, no animation.
- Mobile: stairs sit behind at low opacity; text stays readable; CTAs wrap.

### 5.2 Books (real data, section 8.1)

- Background sand. Head: `h2` "One shelf, every IELTS book." and lead "Start with Cambridge 1–21, or pick any book. Free and premium, side by side." Below the shelf: link "Browse the full library".
- Shelf: flex row, bottom aligned, gap `clamp(5px, .8vw, 9px)`, 12px wine plank as bottom border, 38px top padding for hover lift.
- Book 1, the **featured cover** (Cambridge): face-out, crimson, `width: clamp(116px, 26vw, 200px)`, `height: clamp(250px, 34vw, 320px)`. Top label "Featured", centre "Cambridge" over the big range "1–21", bottom label "IELTS practice tests".
- Books 2 to N, **spines**: width flexes between 52 and 76px, height per book (table in 8.1), top 5px lighter band, title set vertically (`writing-mode: vertical-rl` rotated 180deg so it reads bottom to top), small light bar at the bottom.
- Last item, **"More books"**: dark ink face-out book, `clamp(66px, 9vw, 96px)` wide, label "Library", a "+N" count (or "+"), and "More books". Leans 7deg on screens ≥700px.
- Book shapes: 2px radius left, 5px right, inset spine shading (`inset 6px 0 0 rgba(0,0,0,.16), inset 8px 0 0 rgba(255,255,255,.1)`). Hover or focus: lift 16px and rotate -1.2deg.
- **Fit behaviour**: show only the spines that fit the shelf width so nothing is cut off. Algorithm in 6.7. On a 375px phone that is Cambridge, 2 spines and More books.
- Links: Cambridge goes to the Cambridge library page. Every other book goes to its own book page if one exists, otherwise to the library with `#slug`. "More books" goes to the full library.

### 5.3 Practice (static)

- `h2` "Practise the way you need to." Then a 3-tab control (equal width columns, bottom border, active tab crimson with a 3px crimson underline): **Full test**, **One module**, **Question types**.
- Each panel is a two-column grid (`1fr 1.25fr`, gap `clamp(24px, 5vw, 72px)`) that collapses to one column at ≤860.
  - Full test: `h3` "A whole test, start to finish." plus link "Start a full test". Visual: three proportional blocks Listening 30 min (mist), Reading 60 min (sand), Writing 60 min (blush), each 150px tall; at ≤560 they stack with widths 50% / 100% / 100%.
  - One module: `h3` "One module, nothing else." plus link "Choose a module". Visual: three full-width rows (single select, selected row filled crimson with white text): Listening (4 sections), Reading (3 passages), Writing (Task 1 and 2).
  - Question types: `h3` "Drill only what you miss." plus link "Build a session". Visual: pill chips (multi select, selected filled wine): True / False / Not Given, Matching headings, Multiple choice, Sentence completion, Map labelling, Form completion, Short answer. Counter below in crimson. Initial state: True / False / Not Given and Multiple choice selected, "2 types selected".

### 5.4 Test tools (static)

- Background mist. Two columns (`.8fr 1.2fr`). Left: `h2` "Built like the real exam screen." and four term/description pairs:
  - Timer: A countdown that runs in the corner while you work.
  - Highlights and notes: Mark the passage and keep notes beside it.
  - Answers saved: Every answer is stored as you type, so nothing is lost.
  - Answer review: After you submit, go back through every answer.
- Right: a paper "sheet" with the hard wine offset shadow. Header row: "Reading passage 1" and a crimson countdown starting `60:00`. Passage in Georgia 1.08rem/1.8: "Tea reached Europe in the seventeenth century as a luxury of the wealthy, carried in small quantities by Dutch traders. Within a hundred years it had become an everyday drink, and the demand it created reshaped trade routes, farming and even the design of ships." Hint: "Try it: select any text to highlight it. Click a highlight to remove it." Notes textarea with placeholder "Notes for this passage" and a row "Notes" / status ("Saved").

### 5.5 AI feedback (static): Writing | Speaking

Full-bleed two-column split, no section padding. Left half blush (Writing), right half paper (Speaking). Left content starts at `--gx`; right content ends at `--gx`. At ≤860 they stack, both with `padding-inline: var(--gx)`.

**Writing**
- `h2` "Writing, marked line by line." Lead: "Choose Task 1 or Task 2. Use your own prompt, a Cambridge prompt or an AI prompt, add an image, and watch the word count as you write."
- Card (paper, 1px line border, 22px padding, `position: relative` for the tooltip). Essay in Georgia 1.02rem/2:
  "Some people believe that online learning is better than classroom teaching. [I partly agree, because it gives students flexibility and access to excellent teachers.] However, many students [doesn’t has] a stable internet connection, so they [get left behind a lot]. [In conclusion], a blend of both approaches is the most [effectives] solution."
- Marks (each focusable, `tabindex=0`, cursor help):
  - Green, label "Strong": "A clear position, backed by a reason. This is exactly what Task 2 rewards." (the first bracket)
  - Red, "Grammar": "Write “don’t have”. After “do not”, the verb stays in its base form." (doesn’t has)
  - Yellow, "Needs an update": "“A lot” is vague. Try “fall behind in their studies”." (get left behind a lot)
  - Yellow, "Needs an update": "Correct, but very common. Tie it back to your opening position instead." (In conclusion)
  - Red, "Word form": "Use the adjective “effective”. “Effectives” is not a word." (effectives)
- Legend row: red dot Mistake, yellow dot Needs an update, green dot Strong.
- Band row: large crimson "6.5" with "Estimated band", and four criteria bars (92px label column): Task response 68%, Coherence 60%, Vocabulary 74%, Grammar 64%.
- Note: "Hover or tap a highlight for details. An AI estimate, not an official IELTS score."
- Links: "Open Writing", "Task 2 guide".

**Speaking** (kept minimal)
- `h2` "Say it. See how it sounded." (max 11ch). Lead: "Record your answer. AI gives you the transcript, a playback and feedback by skill."
- Row: 58px crimson circular record button (white dot inside, becomes a rounded square when active) and a thin waveform of 90 bars (2px wide, `#E9AEBB`, crimson when active). Caption "Tap to try a sample". On tap the caption becomes "Recording a sample. Tap to stop." and the transcript line appears in italic Georgia: “I like the river, because in the evening everyone walks along it.”
- Below: a 2×2 hairline grid of skill names: Fluency, Vocabulary, Grammar, Pronunciation. Link "Enter Speaking".
- There is **no virtual examiner**. Speaking is fully AI based. Do not add examiner copy or visuals.

### 5.6 Mock exams (static)

- Background sage. Head: `h2` "Mock exams." and lead "Scheduled and timed. Results appear once they are published."
- A boarding-pass style ticket (paper background, 3 parts, `1.3fr 1fr 130px`), separated by dashed 2px perforation lines with 24px circular notches (sage coloured) at top and bottom of each perforation:
  1. "Waiting room", a large crimson countdown starting `09:59`, "until the exam opens".
  2. Rows: Listening 30 min, Reading 60 min, Writing 60 min.
  3. A barcode stub (repeating-gradient stripes in ink).
- At ≤760 the ticket stacks, perforations become horizontal with notches on the left and right edges, barcode stripes turn vertical.
- Below the ticket: a 4-column numbered row with a 1px wine hairline on top: 1 Register, 2 Waiting room, 3 Timed exam, 4 Result (2 columns at ≤560).
- Link: "Explore mock exams".

### 5.7 Learn (static)

- Two columns. Left: a stack of three speaking cue cards (white, blush, sand), 28px inset so the stack peeks out; hint "Tap a card for the next topic." Right: `h2` "Learn between tests." and four hairline link rows (hover pushes the text 12px right and turns it crimson): Practice guides, Worked examples, Speaking cue cards, Vocabulary, grammar and ebooks.
- Cards (label "Speaking cue card" in small crimson):
  1. Describe a book that changed how you think. / What it was, when you read it, why it mattered.
  2. Describe a place you would like to visit. / Where it is, why you want to go, what you would do.
  3. Describe a person who helped you learn. / Who they are, how they helped, what you learned.

### 5.8 Plans (real data for the free allowance, section 8.2)

- Paper background with a 1px hairline on top. No cards and no tinted background. `h2` "Start free." in giant crimson.
- Two columns (`1.1fr .9fr`, bottom aligned; one column at ≤860):
  - Left spec list with a 1px ink top rule and hairline rows: "Listening and Reading" / No account needed; "Writing" / crimson dots (one per monthly AI evaluation); "Speaking" / crimson dots.
  - Right: "Need more tests and feedback?" (display, max 16ch), then primary button "View all plans" and text link "Take a free test".
- Fine print below: "Dots show free AI evaluations each month, with a verified account. AI feedback is an estimate, not an official IELTS score."
- There is intentionally **no Premium card** on the home page. All other plans live on the dedicated plans page.

### 5.9 FAQ (static)

- `h2` "Before you begin." left, three native `<details>` rows right (max 820px): top and bottom 1px wine borders, summary in display type with a crimson "+" that rotates 45deg when open.
  1. Do I need an account? "No. Take Listening and Reading tests without one. AI Writing and Speaking evaluation needs a verified account and a plan allowance, and your past AI feedback is kept in your account."
  2. Test Practice vs Question Practice? "Test Practice runs a full test or a single module in exam conditions. Question Practice lets you choose question types, or pick individual questions, to build a custom session."
  3. Is AI feedback an official IELTS score? "No. It gives an estimated band to guide your practice. JumpToNine is an independent practice platform and is not the official IELTS test."

### 5.10 Final CTA (static)

- Sand background. `h2` "Ready for your first test?", line "Start with a Listening or Reading test. No account needed.", button "Take a free test". A giant outlined "9" (2px crimson stroke at 35%, `clamp(16rem, 42vw, 40rem)`) bleeds off the bottom right, behind the text, `aria-hidden`.

### 5.11 Footer (static)

- Paper background. Grid `1.3fr repeat(4, 1fr)`, 2 columns at ≤1000 with the brand block spanning both.
- Brand: wordmark "JumpToNine" and "Listening. Reading. Writing. Speaking."
- Columns:
  - Practice: Cambridge 1–21, More books, Mock exams, Full tests and modules, Question practice, AI Writing, AI Speaking
  - Learn: Resources, IELTS Listening practice, IELTS Reading practice, Writing Task 2 guide, About JumpToNine
  - Account: Plans, Dashboard, Create an account, Password recovery
  - Legal: Privacy policy, Terms of service
- Legal row (top hairline): "© 2026 JumpToNine" (use the current year in code) and "Independent IELTS practice platform. Not the official IELTS test."
- Below it, a giant clipped wordmark "JumpToNine" in blush (`19vw`, line-height .78, bottom cropped), `aria-hidden`.

---

## 6. Interaction spec

All of this is client-side only and must not affect server-rendered markup.

1. **Practice tabs**: `role=tablist/tab/tabpanel`, `aria-selected`, `aria-controls`, `hidden` on inactive panels. Add Left/Right arrow keys and roving `tabindex` (an upgrade over the prototype).
2. **Module picker**: single select with `aria-pressed`. **Chips**: multi toggle with `aria-pressed`. Counter text: `N type(s) selected`, or "Pick a type to start" when none.
3. **Reader**: selecting text inside the passage wraps it in `<mark>`. Clicking a mark unwraps it (ignore clicks within 50ms of creating it). Support touch (`touchend` then 10ms). Ignore selections that cross element boundaries. Nothing persists.
4. **Timer**: counts 3600 down to 0 in seconds, loops, format `mm:ss`, tabular numerals, `aria-hidden`.
5. **Notes**: on input, status shows "Saving…" and returns to "Saved" 600ms after the last keystroke (debounced).
6. **Writing tooltip**: one shared tooltip element inside the card (`position: absolute`, ink background, white text, 264px max). On mouseenter or focus of a mark: set label and text, set the dot colour by mark type, measure the first client rect of the mark relative to the card, centre the tooltip over it, clamp x to `[8, cardWidth - tipWidth - 8]`, place 10px above (if there is no room above, place 10px below and flip `transform-origin` to top). Show with opacity 0 to 1 and `translateY(8px) scale(.96)` to none, .2s and .25s. Hide on mouseleave, blur and Escape. `role=status`.
7. **Bookshelf fit** (run on load, `resize`, and a `ResizeObserver` on the shelf):
   ```
   show all spines
   gap = shelf column-gap (fallback 8)
   used = cover.width + more.width + more.marginLeft + more.marginRight + 2*gap
   n = clamp(0, spines.length, floor((shelf.clientWidth - used + gap) / (52 + gap)))
   spines[i].hidden = i >= n
   moreCount = totalBooks - 1 - n   // real total from data
   more label = moreCount > 0 ? "+" + moreCount : "+"
   ```
   Server-render every spine (up to 12) so crawlers see all links, and apply the fit after hydration.
8. **Speaking sample**: build 90 bars on the client. Bar height `14 + |sin(i*1.3)*60 + cos(i*.45)*20|` percent, animation delay random 0 to .7s. Toggle a `live` state: bars animate (`scaleY` .2 to 1.2, .9s, alternate), the record dot becomes a rounded square, transcript line shows, caption changes, `aria-pressed` updates. No microphone access on the home page.
9. **Mock countdown**: 599 down to 0 seconds, loops, `mm:ss`, `aria-hidden`.
10. **Cue deck**: three buttons with a CSS variable `--i` of 0, 1, 2. Click any card: every card gets `--i = (i + 2) % 3`. Transform: `translate(calc(var(--i)*14px), calc(var(--i)*14px)) rotate(calc(var(--i)*2.4deg - 2.4deg))`, `z-index: calc(3 - var(--i))`, .55s `cubic-bezier(.2,.8,.2,1)`.
11. **FAQ**: native `<details>`, no JS.
12. **Anchor links** to `#plans` use smooth scroll.

---

## 7. SEO and metadata

- `<title>`: "JumpToNine: Free IELTS Practice Tests with AI Writing and Speaking Feedback"
- Meta description: "Practise IELTS Listening, Reading, Writing and Speaking online. Cambridge 1–21, question-type practice, scheduled mock exams and AI feedback with an estimated band."
- Canonical set to the real production URL (the prototype uses a placeholder). Open Graph: type website, title "JumpToNine: IELTS practice, one step at a time", description "Cambridge 1–21, mock exams and AI feedback for all four IELTS modules. Start with a free test." Reuse the site's existing OG image.
- JSON-LD: `Organization` plus `FAQPage` (the three FAQ answers verbatim). Copy the block from Appendix A and replace the URL.
- Exactly one `h1` (the Bangla headline). The English line under it carries the keywords. Do not add hidden text.
- Semantic structure: `main`, one `section` per block with a single `h2`, `nav` with `aria-label` in the footer columns, real `<a href>` for every link including every book.
- Decorative SVG, giant numerals and the footer wordmark are `aria-hidden`.

---

## 8. Data

### 8.1 Books (real data)

Read from the existing book data source. Do not hardcode in the component. Suggested shape (adapt to what exists):

```ts
type Book = {
  id: string; slug: string; title: string;
  isFeatured: boolean; sortOrder: number;
  access?: 'free' | 'premium' | 'mixed';
  accentColor?: string;     // optional, else use the palette below
  href?: string;            // optional, else derive
}
```

Rules:
- The **featured** collection is Cambridge. Its cover label is the real range of Cambridge volumes from data (prototype shows `1–21`), so adding volume 22 updates it automatically.
- All other books are sorted by `sortOrder` and rendered as spines. Titles render as stored.
- If a book has no `accentColor`, use this palette by index (the prototype's exact look for the current nine books):

| # | Book | Colour | Height |
|---|---|---|---|
| 1 | Achieve IELTS | `#3C5A80` | 250 |
| 2 | Barron’s | `#46634F` | 286 |
| 3 | Collins | `#B9770E` | 234 |
| 4 | IELTS Simulation Tests | `#5B3A78` | 298 |
| 5 | IELTS Trainer | `#1F6F78` | 262 |
| 6 | More IELTS Practice Plus | `#7A8F3C` | 278 |
| 7 | Official Cambridge Guide | `#7B1230` | 302 |
| 8 | Official IELTS Practice Materials | `#8B5E3C` | 310 |
| 9 | Succeed in IELTS | `#C23B7A` | 244 |

  For more than nine books, cycle the palette, and make sure no two neighbouring spines share a colour. Heights: use the table, but never below `120 + 5.5 × title.length` px (max 310) so long titles never clip.
- "More books" is always last and is not a database item.
- Empty state: if only the featured collection exists, show the cover and "More books".
- Server-render the shelf, cache it (ISR or equivalent), and never block the page on it.

### 8.2 Free plan (real data)

Read the Free plan record from the existing plans data. Needed fields: monthly Writing AI evaluations and monthly Speaking AI evaluations (prototype: 5 and 2). Render one crimson dot per evaluation, with `role=img` and an accessible label such as "5 AI evaluations each month". If a count is above 8, show 8 dots followed by "+N". The row "Listening and Reading / No account needed" stays static text.

All other content on the page is static in code.

---

## 9. Accessibility and performance

- Colour contrast at least AA for text (hero line 1 is large text at 4.7:1).
- Visible focus: 2px crimson outline, 3px offset, on links, buttons, summaries, marks and the textarea.
- `prefers-reduced-motion`: disable every animation and transition, keep final states.
- Targets: Lighthouse SEO and Accessibility ≥ 95, CLS < 0.05, no layout shift from fonts or the shelf fit, LCP element is the hero text.
- No horizontal scroll at 320px. No console errors or hydration warnings.

---

## 10. Route map

Keep these hrefs unless an equivalent route already exists. Report any you cannot map.

| Link text | Prototype href |
|---|---|
| Take a free test | `/practice/free-test` |
| View plans (hero) | `#plans` |
| View all plans | `/plans` |
| Cambridge cover, Cambridge 1–21 | `/books/cambridge` |
| Other books | `/books/more#<slug>` |
| More books, Browse the full library | `/books/more` |
| Start a full test | `/practice/full-tests` |
| Choose a module | `/practice/modules` |
| Build a session, Question practice | `/practice/questions` |
| Open Writing, AI Writing | `/writing` |
| Task 2 guide, Writing Task 2 guide | `/writing/task-2-guide` |
| Enter Speaking, AI Speaking | `/speaking` |
| Explore mock exams, Mock exams | `/mock-exams` |
| Practice guides | `/resources/guides` |
| Worked examples | `/resources/worked-examples` |
| Speaking cue cards | `/resources/speaking-cue-cards` |
| Vocabulary, grammar and ebooks, Resources | `/resources` |
| IELTS Listening practice | `/ielts-listening-practice` |
| IELTS Reading practice | `/ielts-reading-practice` |
| About JumpToNine | `/about` |
| Dashboard | `/dashboard` |
| Create an account | `/signup` |
| Password recovery | `/recover` |
| Privacy policy, Terms of service | `/privacy`, `/terms` |

---

## 11. QA and acceptance

1. Screenshot the prototype and the implementation at **360, 390, 768, 1024, 1440, 1920** wide, full page, and compare section by section. Fix every visible difference in spacing, size, colour, alignment and motion.
2. Hero check: one screen exactly at 1440×900 and 390×844, nothing overlapping the header, headline fully visible, stairs animation and dot hop running.
3. Books check at 360 and 390: Cambridge, two spines and "More books", nothing cut off, "+N" correct. At 1440 all nine spines show.
4. Practice check at 360: tabs fully visible and readable, panels not clipped, timing bars stacked.
5. Writing and Speaking check at 1920: content edges line up with the container and the other sections.
6. Interactions in section 6 all work by mouse, touch and keyboard.
7. Header untouched: `git diff` shows no change to header files.
8. Lighthouse and console checks from section 9 pass.

---

## Appendix A: Reference HTML (verbatim)

Save everything inside the fenced block below as `design-reference/home.html`.