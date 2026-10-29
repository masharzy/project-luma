# Mock exams — unified builder

Create and Edit both open the modal at `/admin/mocks`. Select an existing Cambridge, More Books or Practice test inside this modal; its matching published Speaking set is selected automatically when available. A different Speaking set can be selected in the same form. Enter the public title, description, tier, Bangladesh start time and the Listening/Reading/Writing durations. Speaking has no total duration control.

**Save draft** keeps the mock private. **Publish mock** atomically saves the imported paper, its frozen snapshot, and the public event. This action opens registration and displays the mock at `/mocks`; there is no separate Open registration step. Publishing an incomplete paper or a past schedule fails without a half-published event. Frozen papers retain their booked questions/timetable; the modal can edit their public name/description or unpublish them. Results are a separate card action at `/admin/mocks/<id>`.

Listening, Reading and Writing retain their common absolute timetable and early-submit locks. After Writing, Speaking opens without a total deadline. The room keeps the usual preparation and per-answer turn timings, but no session countdown closes it. Each finished answer is uploaded privately. The candidate explicitly submits Speaking when finished; the saved recordings are then evaluated in a durable queue. Closing before uploading an answer cannot preserve that local recording. Admin can explicitly finish an unsubmitted Speaking stage for review using saved recordings.

Writing evaluation is queued from Join for the Writing-end boundary. Speaking evaluation is queued only after explicit candidate/admin submission, under its own deduplication key. Both preserve retry/lease protections and do not expose feedback through standalone product routes. Publication requires submitted Speaking and completed AI or manual reviews for both productive skills. Registered candidates can return to their unfinished Speaking after the timed modules have ended.

Navbar, homepage and footer link to `/mocks`. The public catalog has upcoming, registered and published-results views, Bangladesh dates and a direct register/continue action. Dashboard Mocks lists the user's registrations.

No new schema migration is required beyond migration 022. Builder preferences live in private admin module metadata and are excluded from the learner snapshot. Existing three-module frozen exams remain three-module exams. The new untimed Speaking behavior applies to unfinished Speaking in four-module mocks.

Validation: `node --test tests/mock-builder.test.mjs tests/scheduled-mocks.test.mjs`; complete non-HTTP suite and production build. The isolated integration harness uses only `MOCK_TEST_DATABASE_URL`, never production credentials.
