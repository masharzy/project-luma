'use client';
import {useCallback,useEffect,useMemo,useState,type ReactNode} from 'react';
import {ArrowDown,ArrowUpRight,Check,ChevronDown,Headphones,MessageSquare,Quote,Sparkles} from 'lucide-react';
import type {SpeakingAssessment} from '@/lib/products/speaking-provider';
import {feedbackAnswers,feedbackSpans,transcriptLines,type FeedbackAnswer} from '@/lib/products/speaking-feedback-data';
import styles from './speaking-feedback.module.css';
type Question={step:number;part:number;question:string};
type Job={status:string;result:SpeakingAssessment|null;error_code?:string};
const number=(v:number|null|undefined)=>typeof v==='number'&&Number.isFinite(v)?v.toFixed(1):'—';
const criteria=[['Fluency & coherence','FC','fluency'],['Lexical resource','LR','lexicalResource'],['Grammar & accuracy','GRA','grammar'],['Pronunciation','PR','pronunciation']] as const;
function Transcript({answer}:{answer:FeedbackAnswer}){
 const spans=feedbackSpans(answer);
 return <div className={styles.transcript}>{transcriptLines(answer.verbatim).map((line,i)=>{
  const nodes:ReactNode[]=[];let at=line.start;
  for(const span of spans.filter(s=>s.start<line.end&&s.end>line.start)){const start=Math.max(span.start,line.start),end=Math.min(span.end,line.end);if(start>at)nodes.push(answer.verbatim.slice(at,start));const id=`answer-${answer.step}-${span.kind}-${span.index}`;nodes.push(<a href={'#'+id} className={styles[span.kind]} key={id} aria-label={`${span.kind==='correction'?'Suggested edit':span.kind==='strength'?'Effective language':'Uncertain hearing'}: ${answer.verbatim.slice(start,end)}`}><mark>{answer.verbatim.slice(start,end)}</mark></a>);at=end;}
  if(at<line.end)nodes.push(answer.verbatim.slice(at,line.end));return <div className={styles.transcriptLine} key={line.start}><span aria-hidden="true">{String(i+1).padStart(2,'0')}</span><p>{nodes}</p></div>;
 })}</div>;
}
function AnswerCard({answer,question,index,audio}:{answer:FeedbackAnswer;question?:Question;index:number;audio?:string}){
 const anchored=new Set(feedbackSpans(answer).filter(s=>s.kind==='correction').map(s=>s.index));
 return <article className={styles.answer} id={'answer-'+answer.step}>
  <div className={styles.answerHeading}><div><span className={styles.eyebrow}>Answer {String(index+1).padStart(2,'0')}{question?` / Part ${question.part}`:''}</span><h3>{question?.question||'Your recorded response'}</h3></div><span className={styles.answerNumber} aria-hidden="true">{String(index+1).padStart(2,'0')}</span></div>
  {audio&&<details className={styles.audio}><summary><Headphones size={15}/> Listen to your answer <ChevronDown size={14}/></summary><audio controls preload="none" src={audio} aria-label={'Original recording for answer '+(index+1)}/></details>}
  <div className={styles.labelRow}><span>Your original words</span><span>{anchored.size?`${anchored.size} marked ${anchored.size===1?'suggestion':'suggestions'}`:'No marked edits'}</span></div>
  {answer.verbatim.trim()?<Transcript answer={answer}/>:<p className={styles.emptyTranscript}>No reliable transcript was returned for this answer.</p>}
  {(answer.corrections.length>0||answer.strengths.length>0||answer.uncertain.length>0||answer.pronunciation.length>0)&&<div className={styles.annotations}>
   {answer.corrections.map((c,i)=><div className={styles.annotation} id={`answer-${answer.step}-correction-${i}`} key={'c'+i} data-kind="correction"><span className={styles.noteIcon}><ArrowUpRight size={15}/></span><div><span className={styles.noteLabel}>{c.category||'Language'} · {anchored.has(i)?'Suggested edit':'Review suggestion'}</span><p className={styles.edit}><del>{c.original||'Unanchored wording'}</del><span aria-hidden="true"> → </span><ins>{c.corrected||'No replacement supplied'}</ins></p><p>{c.reason}</p>{!anchored.has(i)&&<small>This proposal is unchanged, overlaps another note, or cannot be linked confidently to these words.</small>}</div></div>)}
   {answer.strengths.map((s,i)=><div className={styles.annotation} id={`answer-${answer.step}-strength-${i}`} key={'s'+i} data-kind="strength"><span className={styles.noteIcon}><Check size={15}/></span><div><span className={styles.noteLabel}>Effective language</span><p className={styles.goodQuote}>“{s.quote}”</p><p>{s.why}</p></div></div>)}
   {answer.uncertain.map((word,i)=><div className={styles.annotation} id={`answer-${answer.step}-uncertain-${i}`} key={'u'+i} data-kind="uncertain"><span className={styles.noteIcon}>?</span><div><span className={styles.noteLabel}>Uncertain hearing</span><p>“{word}”</p><small>Check the recording before treating this wording as an error.</small></div></div>)}
   {answer.pronunciation.map((p,i)=><div className={styles.annotation} key={'p'+i} data-kind="pronunciation"><span className={styles.noteIcon}><Headphones size={14}/></span><div><span className={styles.noteLabel}>Pronunciation · {p.word}</span><p>{p.observation}</p><small>Audio-based model observation.</small></div></div>)}
  </div>}
 </article>;
}
export function SpeakingFeedback({id,questions=[]}:{id:string;questions?:Question[]}){
 const [clips,setClips]=useState<{step:number;url:string}[]>([]),[job,setJob]=useState<Job|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[part,setPart]=useState(0);
 const refresh=useCallback(async()=>{const response=await fetch('/api/products/speaking/evaluate?attemptId='+id,{cache:'no-store'}),data=await response.json();if(!response.ok)throw Error(data.error||'Unable to load feedback');setJob(data.evaluation);},[id]);
 useEffect(()=>{let active=true;setLoading(true);setJob(null);setPart(0);void refresh().catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[refresh]);
 useEffect(()=>{if(!job||!['pending','running'].includes(job.status))return;const timer=setInterval(()=>void refresh().catch(e=>setError(e.message)),5000);return()=>clearInterval(timer);},[job?.status,refresh]);
 useEffect(()=>{let active=true;setClips([]);void fetch('/api/products/speaking/recording/'+id).then(async response=>{if(response.ok){const data=await response.json();if(active)setClips(data.clips);}}).catch(()=>{});return()=>{active=false;};},[id]);
 const retry=async()=>{setBusy(true);setError('');try{const response=await fetch('/api/products/speaking/evaluate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({attemptId:id})}),data=await response.json();if(!response.ok)throw Error(data.error||'Unable to submit');setJob(data.evaluation);}catch(e){setError(e instanceof Error?e.message:'Unable to submit');}finally{setBusy(false);}};
 const result=job?.result,answers=useMemo(()=>result?feedbackAnswers(result.assessmentDetails,result.transcripts):[],[result]),questionByStep=useMemo(()=>new Map(questions.map(q=>[q.step,q])),[questions]);
 const parts=[...new Set(questions.map(q=>q.part))].sort((a,b)=>a-b),corrections=answers.reduce((n,a)=>n+feedbackSpans(a).filter(s=>s.kind==='correction').length,0),shown=answers.filter(a=>!part||questionByStep.get(a.step)?.part===part);
 return <section className={styles.root} aria-label="Speaking feedback">
  {error&&<div className={styles.notice} role="alert">{error}</div>}
  {loading&&<div className={styles.loading} role="status"><span className={styles.eyebrow}>Your speaking review</span><h2>Loading your feedback…</h2></div>}
  {!loading&&(!job||job.status==='pending')&&<div className={styles.notice}><h2>Your recordings are ready.</h2><p>Submit your saved answers for a complete review.</p><button className={styles.button} disabled={busy} onClick={()=>void retry()}>{busy?'Submitting…':'Submit / resume evaluation'} <ArrowUpRight size={16}/></button></div>}
  {job&&['pending','running'].includes(job.status)&&<div className={styles.notice} role="status"><h2>Your speaking is being reviewed.</h2><p>You can leave this page and return from Dashboard Results. Your saved recordings will stay with your attempt.</p></div>}
  {job?.status==='failed'&&<div className={styles.notice}><h2>{job.error_code==='INCOMPLETE_ANSWER_COVERAGE'?'Some answers were not fully transcribed.':'Your evaluation could not be completed.'}</h2><p>{job.error_code==='INCOMPLETE_ANSWER_COVERAGE'?'The incomplete response was not accepted as a full-test result. ':''}Your recordings are saved and the evaluation allowance has been returned.</p></div>}
  {job?.status==='completed'&&result&&<>
   <div className={styles.hero}><div className={styles.heroCopy}><span className={styles.heroEyebrow}><Sparkles size={14}/> Your speaking review</span><h2>Your voice.<br/>A clearer next step.</h2><p>{result.summary}</p><a href="#speaking-transcript">Explore your transcript <ArrowDown size={15}/></a></div><div className={styles.overall}><span>Overall band estimate</span><strong>{number(result.estimatedBand)}</strong><span className={styles.bandScale}>/ 9.0</span><p>{result.estimatedBand===null?'Limited evidence · no full-test band':'IELTS Speaking · practice estimate'}</p><small>AI feedback · not an official IELTS result</small></div></div>
   <div className={styles.scoreGrid}>{criteria.map(([name,code,key])=>{const c=result[key];return <a href={'#criterion-'+key} className={styles.scoreCard} key={key}><div><span>{code}</span><ArrowUpRight size={16}/></div><strong>{number(c.band)}</strong><h3>{name}</h3><meter min={0} max={9} value={c.band??0} aria-label={`${name}: ${number(c.band)} out of 9`}/></a>;})}</div>
   <div className={styles.overview}><div><span className={styles.eyebrow}>From speaking to progress</span><h2>Understand every answer.</h2><p lang="bn">চিহ্নিত কথায় ক্লিক করলে নিচে suggested correction ও কারণ পাবে। সবুজ অংশে ভালো ব্যবহারের ব্যাখ্যা আছে।</p></div><div className={styles.reviewStats}><div><strong>{answers.length}</strong><span>Answers reviewed</span></div><div><strong>{corrections}</strong><span>Marked suggestions</span></div></div></div>
   {result.limitation&&<details className={styles.limitations}><summary><MessageSquare size={15}/> Assessment notes & limitations <ChevronDown size={14}/></summary><p>{result.limitation}</p></details>}
   <div className={styles.sectionTitle} id="speaking-transcript"><div><span className={styles.eyebrow}>01 / Your words, in focus</span><h2>Transcript & feedback</h2></div><div className={styles.legend}><span data-kind="correction">Suggested edit</span><span data-kind="strength">Effective language</span><span data-kind="uncertain">Uncertain</span></div></div>
   {parts.length>1&&<div className={styles.filters} role="group" aria-label="Filter answers by part"><button aria-pressed={part===0} onClick={()=>setPart(0)}>All answers <span>{answers.length}</span></button>{parts.map(p=><button key={p} aria-pressed={part===p} onClick={()=>setPart(p)}>Part {p} <span>{answers.filter(a=>questionByStep.get(a.step)?.part===p).length}</span></button>)}</div>}
   <div className={styles.answers}>{shown.map(answer=><AnswerCard key={answer.step} answer={answer} index={answers.findIndex(a=>a.step===answer.step)} question={questionByStep.get(answer.step)} audio={clips.find(c=>c.step===answer.step)?.url}/>)}</div>
   <div className={styles.sectionTitle}><div><span className={styles.eyebrow}>02 / Behind your bands</span><h2>The four criteria</h2></div><p>What supported each estimate.</p></div>
   <div className={styles.criteria}>{criteria.map(([name,code,key])=>{const c=result[key];return <article id={'criterion-'+key} className={styles.criterion} key={key}><div className={styles.criterionHeading}><span>{code}</span><h3>{name}</h3><strong>{number(c.band)}<small> / 9</small></strong></div><p>{c.feedback}</p>{c.evidence.length>0&&<details><summary><Quote size={14}/> Evidence from your answers <ChevronDown size={14}/></summary><ul>{c.evidence.map((e,i)=><li key={i}>{e}</li>)}</ul></details>}</article>;})}</div>
   {result.nextSteps.length>0&&<div className={styles.next}><div><span className={styles.eyebrow}>03 / Make your next answer stronger</span><h2>Your practice priorities.</h2></div><ol>{result.nextSteps.map((step,i)=><li key={i}><span>{String(i+1).padStart(2,'0')}</span><p>{step}</p></li>)}</ol></div>}
  </>}
 </section>;
}
