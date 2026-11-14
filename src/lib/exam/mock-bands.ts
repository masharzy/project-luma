// Mock-exam band rules for papers the candidate did not finish. Pure functions (no I/O) so they are unit tested.
// Rule agreed for scheduled mocks: what was answered is assessed by the AI on the IELTS rubric; what was not
// answered scores 0. A paper is held for an admin only when the AI could not judge a substantial answer.
export const roundHalf = (n: number) => Math.round(n * 2) / 2;
const words = (text: string) => (text.replace(/<[^>]*>/g, ' ').match(/[\p{L}\p{N}'’-]+/gu) || []).length;
type Criterion = { band: number | null };
type WritingTask = { task: number; scorable: boolean; taskAchievement: Criterion; coherence: Criterion; lexicalResource: Criterion; grammar: Criterion };
/** Words below which an unscorable Writing answer is treated as no meaningful response (band 0) instead of needing review. */
export const WRITING_REVIEW_WORDS = 50;
export type MockBand = { band: number | null; note: string };
/**
 * Writing: Task 2 counts twice. A blank task scores 0. An answered task the AI marked unscorable scores 0 when it is
 * very short (e.g. two lines), otherwise the paper is held for an admin (chart unreadable, possible platform issue).
 */
export function mockWritingBand(paper: { task: number; answer: string }[], assessed: WritingTask[]): MockBand {
  let total = 0, weight = 0;
  const notes: string[] = [];
  for (const p of paper) {
    const w = p.task === 2 ? 2 : 1;
    weight += w;
    if (!p.answer.trim()) { notes.push(`Task ${p.task} was not answered (0).`); continue; }
    const a = assessed.find(t => t.task === p.task);
    if (!a) return { band: null, note: `Task ${p.task} was not assessed.` };
    const bands = [a.taskAchievement.band, a.coherence.band, a.lexicalResource.band, a.grammar.band];
    if (!a.scorable || bands.some(b => b === null)) {
      if (words(p.answer) < WRITING_REVIEW_WORDS) { notes.push(`Task ${p.task} is too short to assess (0).`); continue; }
      return { band: null, note: `Task ${p.task} could not be assessed by AI and needs an admin review.` };
    }
    total += w * (bands as number[]).reduce((s, b) => s + b, 0) / 4;
  }
  if (!weight) return { band: 0, note: 'No Writing tasks.' };
  return { band: roundHalf(total / weight), note: notes.join(' ') };
}
/**
 * Speaking: the three parts weigh the same; inside a part every question counts the same. The AI band of the
 * answered questions is scaled by the share of the test that was answered, so unanswered questions score 0.
 * A complete test keeps the AI band unchanged.
 */
export function speakingCoverage(expectedByPart: Record<number, number>, answeredSteps: { part: number }[]) {
  const parts = Object.entries(expectedByPart).filter(([, n]) => n > 0);
  if (!parts.length) return 0;
  let share = 0;
  for (const [part, n] of parts) share += Math.min(n, answeredSteps.filter(s => s.part === Number(part)).length) / n;
  return share / parts.length;
}
export function mockSpeakingBand(assessment: { estimatedBand: number | null; scorable: boolean; transcripts: { verbatim: string }[]; fluency: Criterion; lexicalResource: Criterion; grammar: Criterion; pronunciation: Criterion },
  expectedByPart: Record<number, number>, clips: { part: number }[]): MockBand {
  const coverage = speakingCoverage(expectedByPart, clips);
  const answered = clips.length, expected = Object.values(expectedByPart).reduce((s, n) => s + n, 0);
  if (!assessment.transcripts.some(t => t.verbatim.trim())) return { band: 0, note: 'No intelligible speech was recorded (0).' };
  if (coverage >= 1) {
    if (assessment.estimatedBand !== null) return { band: assessment.estimatedBand, note: '' };
    return { band: null, note: 'The AI could not give a reliable band for this complete test; an admin review is needed.' };
  }
  const values = [assessment.fluency.band, assessment.lexicalResource.band, assessment.grammar.band, assessment.pronunciation.band];
  const base = values.every(v => v !== null) ? roundHalf((values as number[]).reduce((s, v) => s + v, 0) / 4) : 0;
  return { band: roundHalf(base * coverage), note: `Incomplete test: ${answered} of ${expected} questions answered; unanswered questions score 0 (AI band of the answered part ${base.toFixed(1)}).` };
}
