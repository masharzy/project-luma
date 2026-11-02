# Student dashboard

Eight destinations: Overview, My tests, Results, Study progress, Saved resources, Mock exams, Subscription and Account. Writing and Speaking shortcuts use the existing standalone evaluation routes. The learner shell is independent from admin and uses a mobile modal drawer and transition progress bar.

Overview reads real account-owned attempts, weekly starts and recent evaluation status. My tests paginates the latest 100 attempts. Progress uses the latest 100 attempts, up to 10 scored objective modules and 20 evaluations per skill; full-module average bands exclude partial tests. Results never expose unpublished mock scores or snapshot answers. Existing exam and evaluation endpoints enforce ownership again when opening a result.

Migration 029 adds account goals and bookmarks without modifying existing study data. It was exercised on the existing isolated QA branch (new-branch quota was full), including runtime-role read/write and rollback of QA records, then applied to production. Server API requires a verified session, same origin, bounded JSON, validated paths and goals, and a per-user write rate limit. The authenticated session supplies user identity; clients cannot choose it.

Saved resources supports resource collection bookmarks and published free library entries. Goal defaults are editable; writes persist in PostgreSQL. Dashboard navigation does not duplicate evaluation forms or change credit policies.

Validation: TypeScript, 143 unit/security tests, production build and fixture-based visual QA. Browser fixtures use synthetic data and mock preference writes, not a signed-in production account. Live authenticated end-to-end CRUD was not exercised in the browser.

Writing feedback is loaded only when its disclosure opens, avoiding up to 20 hidden feedback requests and polling loops on the Results page.

## Direct practice update

My tests now prioritizes published Premium tests included in the active subscription, with Free tests collapsed by default. Cambridge, More Books and Practice metadata is searchable and paginated in the dashboard. Only modules with published, usable exam documents receive launch links; neither questions nor answers are serialized in the library.

The current schema has subscription access, not per-test purchases. Test access uses the same active/start/expiry window as existing Premium mock access. The launcher and attempt POST enforce it again; expired, pending and cancelled subscriptions do not grant Premium access. Writing task selection and Speaking set selection follow the same rule. Evaluation credit checks remain separate and unchanged.

Writing and Speaking are available as dashboard routes using the existing product components and endpoints. Public evaluation routes remain available. Dashboard navigation uses full Next Link prefetch (client router cache, default five-minute prefetch window), with a delayed progress indicator so cached transitions do not flash loading. No shared server cache or browser storage of private pages is introduced. Subscription is server-hydrated to avoid fetching it again on every client remount; membership changes and Writing submission call router.refresh to invalidate old page payloads. Exam entry uses document navigation so the browser receives the exam-specific audio, image and inline layout CSP; this is separate from cached dashboard menu transitions. Speaking room remains a standalone HTML document and still requires a document navigation.

Validation: 147 unit/security tests, TypeScript and production build. Metadata SQL executed under the runtime role on isolated QA and production (read-only). Production route and navigation browser checks follow release.

## Studio and results redesign

My Tests has four keyboard-accessible tabs: Premium, Free tests, In progress and History. Completed modules and full tests receive Retake links to a new attempt launcher; history displays saved module bands prominently. Retakes do not reuse or overwrite an old attempt. Writing bands are read from the existing evaluation job. No numeric band is fabricated for short question sets, pending/failed evaluations or unpublished mock results. An overall band requires all four skill bands; other averages are explicitly labelled module averages.

Results is now Mock results. It shows only account-owned mock attempts and registered mocks without an attempt, with a reason when no band exists. Test history lives in My Tests; Writing/Speaking feedback lives in the corresponding Studio. Overview and progress links follow those destinations.

Speaking Studio uses Collection → Book → Test & start. Collection order is Cambridge, Official Cambridge Guide, Practice Tests Plus, Collins, then other available collections. Official Guide and Plus currently have no published Speaking sets: their disabled cards say Not published yet. No content was invented. The public Speaking catalogue is preserved.

Writing Studio adds a workspace/feedback switch and a question → answer → feedback guide around the existing editor, draft storage, timer and quota flow. Subscription has a current membership panel, separate credit meters, plan cards, pending requests and a billing history disclosure; request/cancel APIs and confirmations remain in place. Mock exams now has Upcoming, My registrations and Past exams filters, new calendar cards and an in-dashboard waiting room.

Validation: 152 unit/security tests, TypeScript and production build; SQL syntax/permissions checked under the runtime role in QA and production using a nonmatching synthetic account ID. Browser QA uses fixture data, including a paid plan, full/short result cards, unpublished mocks and future mock events. Desktop layouts, 320px/390px mobile layouts and the Speaking three-step interaction were inspected. Writing draft edits were exercised locally only. No production registration, subscription cancellation, AI submission or credit-consuming action was run.

Live account checks verified My Tests tabs, saved score cards and unpublished mock-result reasons. A legacy two-module attempt exposed a missing Retake action; such attempts now offer their original modules separately instead of adding a new module. Retakes remain new attempts and require current server-side access.
