'use client';
import { useCallback,useEffect,useState } from 'react';
import type { SpeakingAssessment } from '@/lib/products/speaking-provider';

type Job={status:string;result:SpeakingAssessment|null};
type ModelAnswer={
 step:number;
 corrections?:Array<{original:string;corrected:string;reason?:string;category?:string}>;
 strengths?:Array<{quote:string;why:string}>;
 pronunciation?:Array<{word:string;observation:string}>;
};
export function SpeakingFeedback({id}:{id:string}){
 const [clips,setClips]=useState<{step:number;url:string}[]>([]);
 const [job,setJob]=useState<Job|null>(null);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const refresh=useCallback(async()=>{
  const resp=await fetch('/api/products/speaking/evaluate?attemptId='+id,{cache:'no-store'});
  const data=await resp.json();
  if(!resp.ok)throw Error(data.error);
  setJob(data.evaluation);
 },[id]);
 useEffect(()=>{void refresh().catch(e=>setError(e.message));},[refresh]);
 useEffect(()=>{
  if(!job||!['pending','running'].includes(job.status))return;
  const timer=setInterval(()=>void refresh().catch(e=>setError(e.message)),5000);
  return ()=>clearInterval(timer);
 },[job?.status,refresh]);
 const retry=async()=>{
  setBusy(true);setError('');
  try{
   const resp=await fetch('/api/products/speaking/evaluate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({attemptId:id})});
   const data=await resp.json();
   if(!resp.ok)throw Error(data.error);
   setJob(data.evaluation);
  }catch(e){setError(e instanceof Error?e.message:'Unable to submit');}
  finally{setBusy(false);}
 };
 useEffect(()=>{
  void fetch('/api/products/speaking/recording/'+id).then(async r=>{if(r.ok)setClips((await r.json()).clips);}).catch(()=>{});
 },[id]);
 const r=job?.result;
 const details=r?.assessmentDetails as {answers?:ModelAnswer[]}|undefined;
 const answers=Array.isArray(details?.answers)?details.answers:[];
 return <section className="speaking-feedback">
  {error&&<p role="alert">{error}</p>}
  {(!job||job.status==='pending')&&<button className="button" disabled={busy} onClick={()=>void retry()}>{busy?'Submitting…':'Submit / resume evaluation ↗'}</button>}
  {job&&['pending','running'].includes(job.status)&&<p role="status">Your Speaking evaluation is processing. You can close this page and return from Dashboard Results.</p>}
  {job?.status==='failed'&&<p>Evaluation could not be completed. Its allowance has been returned.</p>}
  {job?.status==='completed'&&r&&<>
   <h2>{r.estimatedBand===null?'Speaking performance feedback':'Estimated Speaking band '+r.estimatedBand.toFixed(1)}</h2>
   <p>Practice estimate, not an official IELTS result.</p>
   <p>{r.summary}</p>
   {r.limitation&&<p>{r.limitation}</p>}
   {([['Fluency and Coherence',r.fluency],['Lexical Resource',r.lexicalResource],['Grammatical Range and Accuracy',r.grammar],['Pronunciation',r.pronunciation]] as const).map(([name,c])=>
    <article key={name}><h3>{name}{c.band!==null?' · '+c.band.toFixed(1):''}</h3><p>{c.feedback}</p>{c.evidence.length>0&&<ul>{c.evidence.map((e,i)=><li key={i}>{e}</li>)}</ul>}</article>)}
   <h3>Your next steps</h3>
   <ul>{r.nextSteps.map((step,i)=><li key={i}>{step}</li>)}</ul>
   <h3>Your original words</h3>
   {r.transcripts.map(t=>{
    const answer=answers.find(a=>a.step===t.step);
    const audio=clips.find(c=>c.step===t.step);
    return <details key={t.step}>
     <summary>Answer {t.step+1}</summary>
     <p>{t.verbatim||'No audible words were transcribed.'}</p>
     {audio&&<audio controls src={audio.url} aria-label={'Your recording for answer '+(t.step+1)}/>}
     {t.uncertain.length>0&&<p>Uncertain words: {t.uncertain.join(', ')}</p>}
     {(answer?.corrections?.length||0)>0&&<><h4>Suggested corrections</h4><ul>{answer?.corrections?.map((c,i)=><li key={i}><strong>{c.original}</strong> → {c.corrected}{c.reason?' — '+c.reason:''}</li>)}</ul></>}
     {(answer?.strengths?.length||0)>0&&<><h4>What went well</h4><ul>{answer?.strengths?.map((c,i)=><li key={i}><strong>{c.quote}</strong> — {c.why}</li>)}</ul></>}
     {(answer?.pronunciation?.length||0)>0&&<><h4>Pronunciation observations</h4><ul>{answer?.pronunciation?.map((c,i)=><li key={i}><strong>{c.word}</strong> — {c.observation}</li>)}</ul></>}
    </details>;
   })}
  </>}
 </section>;
}
