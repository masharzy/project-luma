'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { WritingAssessment } from '@/lib/evaluation/schema';

type Job = { id: string; status: string; result: WritingAssessment | null; model: string };
type AnswerTask = { task: number; answer: string };
type TaskFeedback = WritingAssessment['tasks'][number];
type Highlight = { start: number; end: number; kind: 'grammar' | 'improve' | 'good'; title: string; detail: string };

function AnnotatedAnswer({ answer, feedback }: { answer: string; feedback?: TaskFeedback }) {
  if (!answer.trim()) return <p className="writing-empty-response">No response was submitted for this task.</p>;

  const highlights: Highlight[] = [];
  for (const correction of feedback?.corrections ?? []) {
    const start = answer.indexOf(correction.original);
    if (start < 0 || !correction.original) continue;
    const grammar = correction.category === 'grammar'
      || (!correction.category && /grammar|tense|article|agreement|punctuation|preposition|plural|spelling/i.test(correction.reason));
    highlights.push({
      start, end: start + correction.original.length, kind: grammar ? 'grammar' : 'improve',
      title: grammar ? 'Grammar / accuracy' : 'Suggested improvement',
      detail: correction.reason + ' Suggested: ' + correction.improved,
    });
  }
  for (const strength of feedback?.strengths ?? []) {
    const start = answer.indexOf(strength.original);
    if (start < 0 || !strength.original) continue;
    highlights.push({ start, end: start + strength.original.length, kind: 'good', title: 'Strong writing', detail: strength.reason });
  }

  // All evidence must be an exact substring of the original answer; never replace submitted text.
  highlights.sort((a, b) => a.start - b.start || (a.kind === 'good' ? 1 : -1) || b.end - a.end);
  const fragments: ReactNode[] = [];
  let position = 0;
  highlights.forEach((item, index) => {
    if (item.start < position) return; // Do not draw overlapping, conflicting annotations.
    if (position < item.start) fragments.push(answer.slice(position, item.start));
    fragments.push(
      <mark key={index} tabIndex={0} className={'writing-highlight ' + item.kind} title={item.title + ': ' + item.detail}>
        {answer.slice(item.start, item.end)}
        <span className="writing-inline-tip">{item.title}: {item.detail}</span>
      </mark>
    );
    position = item.end;
  });
  if (position < answer.length) fragments.push(answer.slice(position));

  return <div className="writing-original" aria-label="Your submitted response with highlighted feedback">{fragments}</div>;
}

export function WritingEvaluation({ attemptId, source = 'attempt', tasks = [] }: {
  attemptId: string;
  source?: 'attempt' | 'submission';
  tasks?: AnswerTask[];
}) {
  const api = source === 'submission' ? '/api/products/writing' : '/api/evaluations/writing';
  const query = (source === 'submission' ? 'submissionId=' : 'attemptId=') + encodeURIComponent(attemptId);
  const autoRequested = useRef(false), resumed = useRef('');
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);

  const evaluate = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(api, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(source === 'submission' ? { submissionId: attemptId } : { attemptId }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.code === 'EVALUATION_LIMIT') throw Error('Monthly limit reached. Upgrade your plan or wait for your quota to reset on the first day of the next UTC month.');
        if (data.code === 'EVALUATION_ACCESS_REQUIRED') throw Error('Your current plan does not include Writing Evaluation. Choose a plan to unlock feedback.');
        throw Error(data.error || 'Unable to start Writing Evaluation.');
      }
      setJob(data.evaluation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to request AI feedback.');
    } finally { setBusy(false); }
  }, [attemptId, api, source]);

  const check = useCallback(async () => {
    const response = await fetch(api + '?' + query, { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw Error(data.error || 'Unable to load Writing feedback.');
    setJob(data.evaluation ?? null);
    return data.evaluation as Job | null;
  }, [api, query]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch(api + '?' + query, { cache: 'no-store' });
        const data = await response.json();
        if (!active) return;
        if (!response.ok) throw Error(data.error || 'Unable to load Writing feedback.');
        setJob(data.evaluation ?? null);
        if (!data.evaluation && !autoRequested.current) {
          autoRequested.current = true;
          await evaluate();
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load Writing feedback.');
      }
    })();
    return () => { active = false; };
  }, [api, query, evaluate]);

  useEffect(() => {
    if (!job || !['pending', 'running'].includes(job.status)) return;
    const timer = setInterval(() => void check().catch(err => setError(err instanceof Error ? err.message : 'Unable to refresh feedback.')), 5000);
    return () => clearInterval(timer);
  }, [job?.id, job?.status, check]);

  // Re-publish a queued job once if the queue didn't pick it up. No manual "Evaluate" button.
  useEffect(() => {
    if (!job || job.status !== 'pending' || resumed.current === job.id) return;
    const timer = setTimeout(() => { resumed.current = job.id; void evaluate(); }, 25000);
    return () => clearTimeout(timer);
  }, [job?.id, job?.status, evaluate]);

  const result = job?.status === 'completed' ? job.result : null;
  return <section className="writing-evaluation" aria-label="Writing AI evaluation">
    <div className="writing-eval-heading">
      <div><span className="session-eyebrow">IELTS WRITING / AUTOMATIC FEEDBACK</span><h2>Your writing, explained.</h2><p>Your original Task 1 and Task 2 responses are preserved below.</p></div>
      <div className="writing-band-badge" aria-live="polite"><span>Estimated band</span><strong>{result?.estimatedBand === null || result?.estimatedBand === undefined ? '—' : result.estimatedBand.toFixed(1)}</strong><small>{result ? 'IELTS practice estimate' : 'Awaiting feedback'}</small></div>
    </div>
    <div className="writing-feedback-legend" aria-label="Annotation legend">
      <span><i className="legend-grammar" /> Grammar / accuracy</span>
      <span><i className="legend-improve" /> Suggested improvement</span>
      <span><i className="legend-good" /> Strong writing</span>
    </div>
    {(!job || ['pending', 'running'].includes(job.status)) && !error && <p className="writing-feedback-progress" role="status">{busy || !job ? 'Preparing your automatic assessment…' : job.status === 'pending' ? 'Your writing is queued for automatic evaluation…' : 'AI is reviewing your writing and band descriptors…'} Your responses stay saved while feedback is prepared.</p>}
    {job?.status === 'failed' && <p role="alert" className="writing-feedback-error">We could not complete this evaluation. Your allowance has been returned and your original writing remains saved.</p>}
    {error && <div className="writing-feedback-error" role="alert"><strong>Evaluation unavailable</strong><p>{error}</p><a href="/dashboard/subscription">View your plan and monthly allowance ↗</a></div>}
    {result && <><p className="writing-assessment-summary">{result.summary}</p>{result.estimatedBand === null && <p className="writing-feedback-warning">Not enough reliable evidence to estimate a band. See the task limitations below.</p>}</>}
    {tasks.map(answerTask => {
      const feedback = result?.tasks.find(item => item.task === answerTask.task);
      return <article className="writing-task-feedback" key={answerTask.task}>
        <header className="writing-task-heading"><div><span className="session-eyebrow">YOUR SUBMISSION</span><h3>Task {answerTask.task}</h3></div>{feedback && <span className="writing-task-band">{feedback.scorable ? 'Feedback ready' : 'Limited assessment'}</span>}</header>
        <p className="writing-original-label">Your original answer · {answerTask.answer.trim() ? answerTask.answer.trim().split(/\s+/).length : 0} words</p>
        <AnnotatedAnswer answer={answerTask.answer} feedback={feedback} />
        {feedback && <TaskAssessment feedback={feedback} />}
      </article>;
    })}
    {result?.tasks.filter(feedback => !tasks.some(task => task.task === feedback.task)).map(feedback => <article className="writing-task-feedback" key={feedback.task}><h3>Task {feedback.task}</h3><TaskAssessment feedback={feedback} /></article>)}
    {result && <p className="session-note">AI band estimates are for practice, not official IELTS scores. Highlighted passages are evidence-based suggestions, not automatic changes to your answer.</p>}
  </section>;
}

function TaskAssessment({ feedback }: { feedback: TaskFeedback }) {
  return <div className="writing-assessment-details">
    {feedback.limitation && <p className="writing-feedback-warning">{feedback.limitation}</p>}
    <h4>Band criteria</h4>
    <div className="writing-criteria-grid">
      {([
        [feedback.task === 1 ? 'Task Achievement' : 'Task Response', feedback.taskAchievement],
        ['Coherence & Cohesion', feedback.coherence],
        ['Lexical Resource', feedback.lexicalResource],
        ['Grammar & Accuracy', feedback.grammar],
      ] as const).map(([label, criterion]) =>
        <div className="writing-criterion" key={label}>
          <div><strong>{label}</strong>{feedback.scorable && <b>{criterion.band.toFixed(1)}</b>}</div>
          <p>{criterion.feedback}</p>
          {criterion.evidence.length > 0 && <ul>{criterion.evidence.map((evidence, index) => <li key={index}>{evidence}</li>)}</ul>}
        </div>
      )}
    </div>
    {feedback.corrections.length > 0 && <><h4>Highlighted corrections</h4><div className="writing-corrections">{feedback.corrections.map((correction, index) => <div key={index}><span className="writing-correction-label">{correction.category === 'grammar' ? 'Grammar / accuracy' : 'Suggested improvement'}</span><p><strong>Your text:</strong> {correction.original}</p><p><strong>Try:</strong> {correction.improved}</p><p>{correction.reason}</p></div>)}</div></>}
    {(feedback.strengths?.length ?? 0) > 0 && <><h4>What you did well</h4><ul>{feedback.strengths?.map((strength, index) => <li key={index}><strong>{strength.original}</strong> — {strength.reason}</li>)}</ul></>}
    <h4>Next steps</h4><ul>{feedback.nextSteps.map((step, index) => <li key={index}>{step}</li>)}</ul>
  </div>;
}
