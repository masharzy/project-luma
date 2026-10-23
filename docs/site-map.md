# Site map and milestone boundary

## Live in this foundation

| Route                          | Purpose                                                    | Access                   |
| ------------------------------ | ---------------------------------------------------------- | ------------------------ |
| `/`                            | Approved bilingual landing page                            | Public                   |
| `/auth/sign-in`                | Email/password and Google sign-in                          | Public                   |
| `/auth/sign-up`                | Create an account                                          | Public                   |
| `/auth/forgot-password`        | Request a reset email                                      | Public                   |
| `/auth/reset-password?token=…` | Set a new password                                         | Valid recovery link      |
| `/account`                     | Minimal session confirmation and sign-out; not a dashboard | Signed in                |
| `/api/auth/*`                  | Same-origin Neon Auth SDK proxy                            | Provider enforced        |
| `/api/account`                 | Session verification endpoint                              | Signed in; otherwise 401 |
| `/coming-soon`                 | Honest destination for future landing services             | Public                   |

## Planned routes — documentation only

| Area               | Planned routes                                                                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| Cambridge          | `/cambridge`, `/cambridge/[book]`, `/cambridge/[book]/[test]`                                               |
| On-demand practice | `/practice`, `/practice/[testId]`, `/practice/[testId]/result`                                              |
| Scheduled mocks    | `/mocks`, `/mocks/[mockId]`, registration, waiting room, exam, results                                      |
| Learning           | `/resources`, `/resources/writing`, `/resources/ebooks`, `/vocabulary`, `/grammar`, `/blog`, `/blog/[slug]` |
| Premium            | `/pricing`, checkout and subscription settings (provider undecided)                                         |
| Learner            | `/dashboard`, `/dashboard/history`, `/dashboard/results`, `/settings`                                       |
| Admin              | `/admin`, questions, test assembly, mock scheduling, results review and bulk publishing                     |

Speaking and chatbot implementation are deferred. No planned route above has an engine or data in this milestone.

## Product rules for subsequent milestones

- Cambridge 1–10 free; 11–21 premium. Guests may explore and take free practice; no account history is saved for guest attempts.
- Practice tests start whenever the learner chooses.
- Scheduled mocks use registration, pre-start email, a 2–3 minute waiting room and server-authoritative synchronized Listening → Reading → Writing. Early submission waits for the next module.
- Writing evaluation must survive browser closure; queue/worker architecture is a later decision.
- Mock results stay unpublished until an admin publishes all results for that mock.
- MVP modules: Listening, Reading, Writing. No Speaking or chatbot implementation.
