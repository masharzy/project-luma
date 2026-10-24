'use client';
import { useCallback,useEffect,useState,useRef } from 'react';
import type { WritingAssessment } from '@/lib/evaluation/schema';
type Job={id:string;status:string;result:WritingAssessment|null;model:string};
export function WritingEvaluation({attemptId}:{attemptId:string}){
 const autoRequested=useRef(false);
 const [job,setJob]=useState<Job|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const check=useCallback(async()=>{const response=await fetch('/api/evaluations/writing?attemptId='+attemptId,{cache:'no-store'});if(response.ok)setJob((await response.json()).evaluation);},[attemptId]);
 
 useEffect(()=>{if(!job||!['pending','running'].includes(job.status))return;const timer=setInterval(()=>void check().catch(()=>{}),5000);return()=>clearInterval(timer);},[job,check]);
 const evaluate=useCallback(async()=>{setBusy(true);setError('');try{const r=await fetch('/api/evaluations/writing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({attemptId})});const d=await r.json();if(!r.ok)throw Error(d.error||'Unable to request feedback');setJob(d.evaluation);}catch(e){setError(e instanceof Error?e.message:'Please try again.');}finally{setBusy(false);}},[attemptId]);
 useEffect(()=>{let active=true;void (async()=>{const response=await fetch('/api/evaluations/writing?attemptId='+attemptId,{cache:'no-store'});if(!active||!response.ok)return;const d=await response.json();if(!active)return;setJob(d.evaluation);if(!d.evaluation&&!autoRequested.current){autoRequested.current=true;await evaluate();}})().catch(()=>{});return()=>{active=false};},[attemptId,evaluate]);
 const pending=job&&['pending','running'].includes(job.status);
 return <section className="writing-evaluation" aria-label="Writing AI evaluation"><span className="session-eyebrow">WRITING / AI FEEDBACK</span><h2>Make your next answer stronger.</h2>
 {!job&&<p>Use your Cambridge or Practice Writing allowance. Separate Writing Evaluation product credits are never used here.</p>}
 {(!job||job.status==='pending')&&<button className="session-primary" disabled={busy} onClick={()=>void evaluate()}>{busy?'Sending…':job?'Resume evaluation':'Evaluate my writing ↗'}</button>}
 {pending&&<p role="status">Your answers are queued for evaluation. You can close this page and return to this attempt later.</p>}
 {job?.status==='failed'&&<p role="alert">We could not complete this evaluation. Its allowance has been returned. Your original answers are still available.</p>}
 {error&&<p role="alert">{error}</p>}
 {job?.status==='completed'&&job.result&&<><p><strong>{job.result.estimatedBand===null?'Not enough evidence for a band':'Estimated Writing band '+job.result.estimatedBand.toFixed(1)}</strong> · Practice estimate, not an official IELTS result.</p><p>{job.result.summary}</p>{job.result.tasks.map(t=><article className="writing-task-feedback" key={t.task}><h3>Task {t.task}{!t.scorable?' · Limited assessment':''}</h3>{t.limitation&&<p>{t.limitation}</p>}{([['Task '+(t.task===1?'Achievement':'Response'),t.taskAchievement],['Coherence and Cohesion',t.coherence],['Lexical Resource',t.lexicalResource],['Grammatical Range and Accuracy',t.grammar]] as const).map(([label,c])=><div key={label}><h4>{label}{t.scorable?' · '+c.band.toFixed(1):''}</h4><p>{c.feedback}</p><ul>{c.evidence.map((e,i)=><li key={i}>{e}</li>)}</ul></div>)}{t.corrections.length>0&&<><h4>Corrections to practise</h4>{t.corrections.map((c,i)=><div key={i}><p><strong>Original:</strong> {c.original}</p><p><strong>Try:</strong> {c.improved}</p><p>{c.reason}</p></div>)}</>}<h4>Your next steps</h4><ul>{t.nextSteps.map((s,i)=><li key={i}>{s}</li>)}</ul></article>)}</>}
 </section>;
}
