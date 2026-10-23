# Site map

## Public pages

- `/` — approved bilingual landing.
- `/free` — free-access overview.
- `/practice` — module cards and filterable test catalog.
- `/practice/listening`, `/practice/reading`, `/practice/writing` — module collections.
- `/cambridge` — searchable/filterable Cambridge 1–21 book shelf.
- `/cambridge/[book]` — individual book metadata and test availability; 11–21 show premium restriction.
- `/mocks` — scheduled-mock collection and exam flow.
- `/resources` — learning hub.
- `/resources/writing`, `/resources/ebooks`, `/vocabulary`, `/grammar`, `/blog` — learning collection pages.
- `/pricing` — Free/Premium comparison; no made-up price or active checkout.
- `/auth/verify-email` — finish verification or request a replacement link.
- `/auth/sign-in`, `/auth/sign-up`, `/auth/forgot-password`, `/auth/reset-password` — custom authentication (requires deployment configuration).

## Learner workspace (sign-in required)

- `/dashboard` — personal welcome, practice/mocks/result entry points and honest empty states.
- `/dashboard/practice` — practice history (`/dashboard/history` redirects here).
- `/dashboard/mocks` — registrations and mock status.
- `/dashboard/results` — published-results collection; unpublished mock results are not shown.
- `/dashboard/saved` — saved resource collection.
- `/settings` — connected profile name update, read-only email and password recovery.
- `/account` — redirects to settings.

## Administration (PostgreSQL admin role required)

- `/admin` — platform overview.
- `/admin/questions`, `/admin/questions/new` — question bank and draft editor.
- `/admin/tests`, `/admin/tests/new` — test library and composition draft.
- `/admin/mocks`, `/admin/mocks/new` — schedule collection and mock-plan draft.
- `/admin/resources`, `/admin/resources/new` — resource collection and editorial draft.
- `/admin/results` — review/release interface. Publish disabled until real evaluations and transactional release API exist.
- `/admin/users` — protected user-management landing; no directory API or role mutation exposed.
- `/admin/settings` — current admin identity and service status.

## Current behavior versus later integration

The pages, navigation, client filters, search, draft JSON export and real profile update are implemented. No demo tests, attempts, scores, users or articles are seeded. The catalogs intentionally have empty published-content states. Admin drafts export to the device and are not saved/published to the server.

Later integrations: imported question engine, content storage/CRUD, resource publication and detail records, persistent saves/history, server-timed mock registration/waiting/exam routes, evaluation workers, bulk result release, entitlements and payments. Dynamic detail/attempt routes will be introduced with real records rather than mock IDs.

## Agreed product rules

- Cambridge 1–10 free; 11–21 premium. Guests may take free practice, with no account history saved.
- On-demand practice starts whenever the learner chooses.
- Scheduled mocks: registration, reminder email, 2–3 minute waiting room, synchronized Listening → Reading → Writing. Early submission waits for the next module.
- Writing evaluation must continue after browser closure.
- Mock results remain private until an admin publishes the full mock.
- Speaking and chatbot implementation remain deferred.
