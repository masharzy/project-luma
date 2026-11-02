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
