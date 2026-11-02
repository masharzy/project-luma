# Student dashboard

Eight destinations: Overview, My tests, Results, Study progress, Saved resources, Mock exams, Subscription and Account. Writing and Speaking shortcuts use the existing standalone evaluation routes. The learner shell is independent from admin and uses a mobile modal drawer and transition progress bar.

Overview reads real account-owned attempts, weekly starts and recent evaluation status. My tests paginates the latest 100 attempts. Progress uses the latest 100 attempts, up to 10 scored objective modules and 20 evaluations per skill; full-module average bands exclude partial tests. Results never expose unpublished mock scores or snapshot answers. Existing exam and evaluation endpoints enforce ownership again when opening a result.

Migration 029 adds account goals and bookmarks without modifying existing study data. It was exercised on the existing isolated QA branch (new-branch quota was full), including runtime-role read/write and rollback of QA records, then applied to production. Server API requires a verified session, same origin, bounded JSON, validated paths and goals, and a per-user write rate limit. The authenticated session supplies user identity; clients cannot choose it.

Saved resources supports resource collection bookmarks and published free library entries. Goal defaults are editable; writes persist in PostgreSQL. Dashboard navigation does not duplicate evaluation forms or change credit policies.

Validation: TypeScript, 143 unit/security tests, production build and fixture-based visual QA. Browser fixtures use synthetic data and mock preference writes, not a signed-in production account. Live authenticated end-to-end CRUD was not exercised in the browser.
