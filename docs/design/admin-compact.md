# Compact admin redesign

The administration layout now uses AdminShell rather than the learner WorkspaceShell. All 18 existing management sections remain reachable through grouped, searchable navigation. Nested pages retain their parent selection. Existing create/edit/module links and validation flows are preserved. The public header, marketing pages and learner shell are unchanged.

## Presentation

- 218px desktop sidebar, 54px top bar and 10–18px content gutters. Compact tables, cards, controls and headings across managers, membership administration, AI lab, mock management, resource and speaking editors.
- Large decorative introductions, duplicated inventory explanations, motivational footer and non-functional revenue messaging removed from the admin overview. Counts are still queried from PostgreSQL; no fake revenue or purchases are shown.
- Create and catalog forms use native details disclosures; editing automatically opens the relevant form. Existing values, validation, confirmations and server endpoints remain intact.
- Light, dark and system themes are scoped to admin. The supported theme value is persisted in a same-site cookie and read server-side, so reload/navigation uses the saved choice. System mode uses prefers-color-scheme without a client-only first-paint theme swap.
- The mobile sidebar uses a native modal dialog for focus containment, Escape dismissal, inert background and focus restoration. Background scroll is locked while open. Touch devices receive 44px primary controls. Reduced motion is respected.
- Full-screen editor portals copy the admin theme and observe theme changes. Learner exam surfaces and actual IELTS exam previews retain their existing exam presentation.
- Route loading and error states are compact; authorization is still enforced by requireAdmin before rendering the shell. Theme preferences do not affect roles or sessions.

## Management access repair

Privilege inspection found that existing admin APIs could not create/update More Books catalog rows or write learning resources, and could not read/insert media metadata. Migration 028 restores only the table operations used by those existing server-validated APIs, plus the resource identity sequence. It was tested on the existing isolated QA branch before production. It does not grant unrelated privileges, expose credentials, or modify content records.

## Validation

The initial production compilation, TypeScript checks and 140 unit/security tests passed. Tests cover real menu destinations, section coverage, nested active states, theme value validation and the unchanged admin authorization guard.

Visual QA uses the actual production shell and management components with explicitly synthetic data on a separate static QA deployment. Dark/light switching, persistence after reload, menu filtering, compact resource forms and edit disclosure were verified there. This synthetic harness is outside the app build and is not an authentication bypass.

The available cloud browser reaches the real production admin sign-in wall and has no authenticated admin session. Live authenticated CRUD actions have not been executed as part of this redesign. No account, role, subscription, question, resource or upload was created/deleted for the visual tests. Existing API authorization and confirmation mechanisms remain enforced.

Primary files: admin layout/overview/loading/error routes; admin-shell.tsx; lib/admin/navigation.ts; admin-compact.css; generated admin-theme-bridge.css and its generator; targeted disclosure changes in ContentManager, BookCatalogManager, ResourceManager and MembershipManager; mock CSS module; EngineSurface theme propagation; migration 028; admin-navigation tests.
