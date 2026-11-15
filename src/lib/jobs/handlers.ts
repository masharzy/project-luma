import 'server-only';
// Job handlers for the self-hosted worker. They call the same functions as the Vercel queue routes
// (src/app/api/queues/*), with the same validation, visibility timeouts and retry delays.
import { processWritingEvaluation } from '@/lib/evaluation/worker';
import { processSpeaking } from '@/lib/products/speaking-worker';
import { processMockEvaluation } from '@/lib/exam/mock-evaluation';
import { deliverMockReminder } from '@/lib/exam/mock-reminders';
type Handler = { run: (message: Record<string, unknown>) => Promise<void>; visibilityTimeoutSeconds: number; retryAfterSeconds: number };
const id = (m: Record<string, unknown>, key: string, re: RegExp) => { const v = m[key]; if (typeof v !== 'string' || !re.test(v)) throw Error('Invalid job payload'); return v; };
const uuid = /^[a-f0-9-]{36}$/;
export const jobHandlers: Record<string, Handler> = {
  'luma-writing-evaluation': { run: m => processWritingEvaluation(id(m, 'id', uuid)), visibilityTimeoutSeconds: 180, retryAfterSeconds: 190 },
  // No duration limit on a server: Speaking always runs in-process (no external worker hand-off).
  'luma-speaking-evaluation': { run: m => processSpeaking(id(m, 'id', uuid)), visibilityTimeoutSeconds: 360, retryAfterSeconds: 370 },
  'jumptonine-mock-evaluation': {
    run: m => processMockEvaluation(id(m, 'attemptId', uuid), m.module === 'speaking' || m.module === 'settle' ? m.module : 'writing'),
    visibilityTimeoutSeconds: 360, retryAfterSeconds: 370,
  },
  'jumptonine-mock-reminders': { run: m => deliverMockReminder(id(m, 'mockId', /^\d{1,16}$/), id(m, 'userId', uuid)), visibilityTimeoutSeconds: 120, retryAfterSeconds: 120 },
};
