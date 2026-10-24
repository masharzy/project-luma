# Approved speaking room implementation

The visual source is the user's final `speaking-room (4).html`, preserved visually in `src/lib/speaking/approved-room.html` (unused legacy embedded audio removed; configured voice transport supplies speech). No 3D replacement is used. The renderer keeps the two examiner characters, facial animation, scene, ID/paper transitions and notes. The new controller changes behavior by mode.

## Routes
- `/practice/speaking`: published fixed-question practice sets.
- `/mocks/speaking`: published live speaking mocks.
- `/speaking/practice?test=ID`, `/speaking/cambridge?test=ID`: guest-compatible fixed questions, recording, retake, local answer downloads. No name or identification introduction.
- `/speaking/mock?test=ID`: verified-account live WebRTC speech-to-speech. Introductory name/preferred name and simulated ID handover only in this mode. No identity image or ID number is requested or uploaded.
- `/admin/speaking/{practice|cambridge|mock}/ID`: question-bank editor, linked from the existing test managers. The parent test must exist. Publishing the speaking set also requires a free, published parent test before learner access is granted.
- `/api/admin/speaking`: guarded GET/PUT question-bank persistence.
- `/api/speaking/voice`: fixed-question TTS; text comes from the published bank and step index, never arbitrary client text. Voice cache keys include the bank content hash.
- `/api/speaking/live`: authenticated same-origin POST setup and owner-bound DELETE hangup.

## Live architecture
The server exchanges the browser SDP with the OpenAI Realtime unified calls endpoint. The long-lived project API key never reaches the browser. Audio streams directly over WebRTC; the data channel handles transcripts and exam-stage tool events. Semantic VAD manages conversational turns. Preparation mutes the microphone; Part 2 switches to a timed long turn, then resumes conversational VAD. The UI has a 16-minute timeout. The server tracks call ownership, rejects a second active call per account using a unique partial index, rate-limits setup, and closes provider calls explicitly on exit. Startup failures clean up reservations.

References used:
- https://developers.openai.com/api/docs/guides/voice-webrtc
- https://developers.openai.com/api/reference/resources/realtime/subresources/calls/methods/create
- https://developers.openai.com/api/reference/resources/realtime/subresources/calls/methods/hangup
- https://developers.openai.com/api/docs/guides/text-to-speech

## Configuration / release prerequisites
1. This work is based on the unmerged Cambridge books/full-test branch; its migration 008 and outstanding verification remain prerequisites. Do not overwrite or bypass that handoff.
2. Apply `migrations/009_speaking.sql` using the migration/owner role, and grant the application runtime role SELECT/INSERT/UPDATE on `public.speaking_tests` and `public.speaking_live_calls`. Runtime should not receive schema-owner privileges. No migration was applied by this implementation task.
3. Set server-only `OPENAI_API_KEY`. Optional `OPENAI_REALTIME_MODEL` defaults to `gpt-realtime-2.1-mini`; optional `OPENAI_TTS_MODEL` defaults to `gpt-4o-mini-tts`. Validate model access in the actual project. Never use a NEXT_PUBLIC key.
4. Add and publish questions through the admin editor for existing tests. No sample production question rows were inserted.
5. Deploy the branch, then verify actual API audio, real one-to-one voice, CSP, microphone permissions and persistence with the target database. No production deployment or real OpenAI call was performed here.

## Scope still outside this implementation
- Speaking audio is held locally for download in fixed-question practice. Upload/storage, transcription, AI scoring and result-publication integration are not implemented.
- Existing paid entitlements, monthly network/account quotas and per-account device limits are not implemented by this feature. Premium parent tests currently fail closed.
- Registration/start-window checks for scheduled mocks are not yet connected to the live speaking endpoint. Do not advertise scheduling enforcement through this route.
- The 16-minute cutoff is client-side. An independently durable server hangup/billing cutoff and cleanup job are required before broad paid live rollout; the current index/rate guards are not a replacement for that.
- Model instructions guide exam sequence; this is not a server-side tamper-proof assessment controller or official identity verification.

## Verified
- `npm run typecheck` passed.
- Optimized Next build passed (final build repeated after integration links were added).
- `node --test tests/speaking.test.mjs tests/speaking-live.test.mjs`: five focused tests passed, including malformed question rejection, script-breaking text escaping, mode separation, key/auth/origin guards, server-owned instructions, active-call collision and owner-bound hangup.
- Browser: exact approved 2D room loads; fixed practice begins with hometown question, without name/ID; actual MediaRecorder recording/review/save; full 14-answer sample flow and download; Part 2 paper/notes; cancellation during entry; 390px viewport without horizontal overflow; no observed runtime exceptions.
- Live browser transport harness (simulated peer/provider events): identity handover, preparation, long-turn commit, finish and server hangup passed. This is not a real provider E2E test.
- The broad existing `npm run test` includes HTTP tests requiring a running localhost:3000 server. That invocation failed with ECONNREFUSED; do not report the entire existing suite as passing.

## Offline review file
`scripts/build-speaking-preview.cjs OUTPUT.html` builds a standalone practice review file with the same renderer. `SPEAKING_PREVIEW_AUDIO=PATH_TO_AUDIO_JSON` embeds consistent pre-generated preview voices. These preview clips were generated separately with en-GB Ryan/Sonia; production uses the configured server TTS endpoint. No device speech-synthesis fallback is used by the active controller. The offline file does not create a live mock, save to the database or grade speech.
