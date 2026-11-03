# Admin workflow improvements

Admin Overview now includes subscription activations, distinct buyers, pending requests, active/expired memberships, plan performance and recent account requests. Monetary totals represent recorded activated plan prices, not independently verified payment receipts; the interface labels this distinction.

Cambridge books/tests, book catalog entries, Recent Tests, vocabulary, Speaking sets, resources and membership editors use a shared accessible native dialog. Dialogs keep the page position, restore focus, support Escape and keep failed-save feedback visible. Published tests omit redundant Publish actions. Test module labels, checkboxes and minute fields have a responsive grid.

More Books follows collection covers → volumes → tests → module editor. Speaking follows collections → volumes → tests → question modules, based on actual set metadata. Catalog actions remain available at their relevant level.

Mock cards distinguish setup, scheduled, live and ended states. Publishing uses explicit per-candidate completion/evaluation blockers while preserving the existing atomic publication gate. Investigation of the existing ended mock found unsubmitted Speaking and Writing awaiting administrative review. No candidate was completed, graded or published automatically. Buttons use the admin theme with readable foregrounds.

The guarded user detail route includes account flags and sign-in provider names, subscription history, evaluation usage and grants, test answers/results, Writing and Speaking history, mock registrations, goals, saved resources and account/session activity. Histories paginate. Queries do not return password hashes, session tokens, provider credentials or recording URLs.

Plans, allowances and subscription assignment now open in dialogs; existing pricing, allowance rules and activation confirmation remain in place. No schema migration or production data mutation is required.

Validation: TypeScript, optimized production build and 166 unit/security regression tests passed. SQL queries were checked against the database schema. Browser fixtures verified the library drill-down, Recent Test module fields, shared dialogs in light/dark themes, plan modal and mock blocker state; fixture writes are disabled. The HTTP suite requires a running site and is separate from these 166 tests.
