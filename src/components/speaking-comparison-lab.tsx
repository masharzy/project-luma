'use client';

import { useEffect, useRef, useState } from 'react';
import './speaking-comparison.css';

type Mode='full'|'parts';
type Criterion='fluency_coherence'|'lexical_resource'|'grammar'|'pronunciation';
type ClipMeta={step:number;part:number;question:string;seconds:number};
type Correction={original:string;corrected:string;category:'grammar'|'vocabulary'|'coherence';reason:string;confidence:string};
type Pronunciation={word:string;observation:string;confidence:string;timestamp_seconds:number|null};
type Strength={quote:string;why:string};
type Answer={step:number;verbatim:string;speech_status:string;corrections:Correction[];pronunciation:Pronunciation[];strengths:Strength[];uncertain:string[]};
type Criteria={band:number|null;reason:string;evidence:Array<{step:number;quote:string;reason:string}>};
type Assessment={answers:Answer[];criteria:Record<Criterion,Criteria>;accent:{description:string;intelligibility:string;observations:string[]};summary:string;next_steps:string[];limitations:string[];confidence:string};
type CaseResult={index:number;part:number;steps:number[];status:string;error?:string;issues?:string[];elapsedMs?:number;httpStatus?:number;usage?:{costUsd:number|null;promptTokens:number|null;completionTokens:number|null;totalTokens:number|null};assessment?:Assessment;rawModelResponse?:unknown;rawModelText?:string};
type Summary={criteria:Record<Criterion,number|null>;overallBand:number|null;completed:number;failed:number;total:number;costUsd:number|null;estimatedOnly:boolean;method:string;partBreakdown:Record<string,Record<string,number|null>>|null};
type Batch={id:string;createdAt:string;status:string;sourceTitle:string;model:string;runs:Record<Mode,CaseResult[]>;summaries:Record<Mode,Summary>};
type Data={source:{title:string;clips:ClipMeta[]};model:string;runs:Batch[];error?:string};

const modeLabels:Record<Mode,string>={full:'All questions · 1 API call',parts:'Part-wise · 3 API calls'};
const criterionNames:Record<Criterion,string>={fluency_coherence:'Fluency & Coherence',lexical_resource:'Lexical Resource',grammar:'Grammar',pronunciation:'Pronunciation'};
const categories:Record<string,string>={grammar:'Grammar',vocabulary:'Vocabulary',coherence:'Coherence',pronunciation:'Pronunciation',strength:'Strong expression',uncertain:'Unclear'};
const criteriaKeys:Criterion[]=['fluency_coherence','lexical_resource','grammar','pronunciation'];
const modeOrder:Mode[]=['full','parts'];
const money=(v:number|null|undefined)=>v===null||v===undefined?'Not provided':('≈৳'+(v*124.35).toFixed(4));
const score=(v:number|null|undefined)=>typeof v==='number'?v.toFixed(1):'Withheld';
const duration=(seconds:number)=>(seconds/60).toFixed(1)+' min';

function Highlighted({answer}:{answer:Answer}){
 type Spot={start:number;end:number;category:string};
 const text=answer.verbatim||'';
 const spots:Spot[]=[];
 const add=(phrase:string,category:string,ignoreCase=false)=>{
  if(!phrase||!text)return;
  const where=ignoreCase?text.toLowerCase().indexOf(phrase.toLowerCase()):text.indexOf(phrase);
  if(where>=0&&!spots.some(s=>where<s.end&&where+phrase.length>s.start))spots.push({start:where,end:where+phrase.length,category});
 };
 for(const c of answer.corrections||[])add(c.original,c.category);
 for(const p of answer.pronunciation||[])add(p.word,'pronunciation',true);
 for(const u of answer.uncertain||[])add(u,'uncertain');
 for(const s of answer.strengths||[])add(s.quote,'strength');
 spots.sort((a,b)=>a.start-b.start);
 const pieces:React.ReactNode[]=[];let previous=0;
 for(const spot of spots){
  if(spot.start<previous)continue;
  if(spot.start>previous)pieces.push(text.slice(previous,spot.start));
  pieces.push(<mark className={'sc-mark sc-'+spot.category} key={spot.start+'-'+spot.category} title={categories[spot.category]||spot.category}>{text.slice(spot.start,spot.end)}</mark>);
  previous=spot.end;
 }
 pieces.push(text.slice(previous));
 return <p className="sc-verbatim">{pieces.length?pieces:'No clear candidate speech detected.'}</p>;
}

function AnswerBlock({answer,metadata,ordinal}:{answer:Answer;metadata?:ClipMeta;ordinal:number}){
 return <article className="sc-answer">
  <div className="sc-answer-header"><b>Question {ordinal} · Part {metadata?.part??'?'}</b><small>{metadata?duration(metadata.seconds):''} · {answer.speech_status}</small></div>
  {metadata&&<p className="sc-question">{metadata.question}</p>}
  <Highlighted answer={answer}/>
  <div className="sc-legend" aria-label="Transcript highlight categories">
   <span className="sc-key sc-grammar">Grammar</span><span className="sc-key sc-vocabulary">Vocabulary</span><span className="sc-key sc-coherence">Coherence</span><span className="sc-key sc-pronunciation">Pronunciation</span><span className="sc-key sc-strength">Strength</span><span className="sc-key sc-uncertain">Unclear</span>
  </div>
  {(answer.corrections?.length||0)>0&&<div className="sc-detail"><h5>Corrections / Solutions</h5>{answer.corrections.map((c,i)=><div className="sc-correction" key={i}><span className={'sc-pill sc-'+c.category}>{c.category}</span><div><del>{c.original}</del><span aria-hidden="true"> → </span><strong>{c.corrected}</strong><div className="sc-muted">{c.reason} · {c.confidence} confidence</div></div></div>)}</div>}
  {(answer.strengths?.length||0)>0&&<div className="sc-detail"><h5>Strong points</h5>{answer.strengths.map((s,i)=><p key={i} className="sc-evidence"><strong>“{s.quote}”</strong> — {s.why}</p>)}</div>}
  {(answer.pronunciation?.length||0)>0&&<div className="sc-detail"><h5>Pronunciation observations</h5>{answer.pronunciation.map((p,i)=><p key={i} className="sc-evidence"><span className="sc-pill sc-pronunciation">{p.word}</span> {p.observation} {p.timestamp_seconds!==null?'('+Math.round(p.timestamp_seconds)+'s)':''}</p>)}</div>}
  {(answer.uncertain?.length||0)>0&&<p className="sc-muted">Uncertain hearing: {answer.uncertain.join(' · ')}</p>}
 </article>;
}
function Result({item,metadata}:{item:CaseResult;metadata:ClipMeta[]}){
 // Render guard only. Never modify or discard the original AI Lab JSON.
 const candidate=item.assessment as unknown;
 const obj=(candidate&&typeof candidate==='object'?candidate:{}) as Record<string,unknown>;
 const a:Assessment|null=Array.isArray(obj.answers)&&obj.criteria&&typeof obj.criteria==='object'&&
  criteriaKeys.every(k=>{const c=(obj.criteria as Record<string,unknown>)[k] as {reason?:unknown;evidence?:unknown}|undefined;return c&&Array.isArray(c.evidence)&&typeof c.reason==='string';})&&
  obj.accent&&typeof obj.accent==='object'&&typeof (obj.accent as {description?:unknown}).description==='string'
  ?candidate as Assessment:null;
 return <details className="sc-result">
  <summary><span><b>{item.steps.length===14?'Full Speaking Test':item.part&&item.steps.length>1?'Part '+item.part:'Question '+(metadata.findIndex(c=>c.step===item.steps[0])+1)}</b><small> {item.steps.length} recording(s)</small></span><span className={'sc-status '+(item.status==='completed'?'sc-ok':item.status==='failed'?'sc-bad':'')}>{item.status}</span><small>{money(item.usage?.costUsd)} · {typeof item.elapsedMs==='number'?(item.elapsedMs/1000).toFixed(1)+'s':'—'}</small></summary>
  <div className="sc-result-body">
   {item.status==='failed'&&<p role="alert" className="sc-alert">Provider/evaluation error: {item.error||'Unknown'}. No result was invented.</p>}
   {item.status==='running'&&<p className="sc-muted">Request in progress. Do not close this tab. A running request is not retried automatically.</p>}
   {a&&<>
    <div className="sc-evaluation-grid">{criteriaKeys.map(k=><div key={k} className="sc-score-mini"><small>{criterionNames[k]}</small><b>{score(a.criteria[k].band)}</b><p>{a.criteria[k].reason}</p></div>)}</div>
    <div className="sc-accent"><b>Accent & intelligibility</b><p>{a.accent.description} · <strong>{a.accent.intelligibility.replaceAll('_',' ')}</strong></p>{a.accent.observations?.length>0&&<p>{a.accent.observations.join(' · ')}</p>}</div>
    <p className="sc-summary">{a.summary}</p>
    <details className="sc-inner" open><summary>Verbatim transcript, highlighted issues and strengths</summary>{a.answers.map((answer,i)=><AnswerBlock key={answer.step+'-'+i} answer={answer} metadata={metadata.find(m=>m.step===answer.step)} ordinal={metadata.findIndex(m=>m.step===answer.step)+1}/>)}</details>
    <details className="sc-inner"><summary>Criterion evidence, limitations & next steps</summary>{criteriaKeys.map(k=><div key={k} className="sc-detail"><h5>{criterionNames[k]} — {score(a.criteria[k].band)}</h5>{a.criteria[k].evidence.map((e,i)=><p key={i} className="sc-evidence">Question {e.step+1}: <strong>“{e.quote}”</strong> — {e.reason}</p>)}</div>)}{a.limitations?.length>0&&<p><b>Limitations:</b> {a.limitations.join(' ')}</p>}{a.next_steps?.length>0&&<p><b>Next steps:</b> {a.next_steps.join(' · ')}</p>}</details>
   </>}
   {item.rawModelResponse!==undefined&&<details className="sc-inner" open={!a}><summary>Original model JSON · unfiltered</summary><pre className="sc-raw-json">{JSON.stringify(item.rawModelResponse,null,2)}</pre></details>}
   {item.rawModelText!==undefined&&<details className="sc-inner" open><summary>Original model text · unfiltered</summary><pre className="sc-raw-json">{item.rawModelText}</pre></details>}
   {!a&&item.assessment!==undefined&&<details className="sc-inner" open><summary>Model output · unchanged</summary><pre className="sc-raw-json">{JSON.stringify(item.assessment,null,2)}</pre></details>}
   {item.usage&&<div className="sc-muted">Provider usage: {item.usage.promptTokens??'—'} prompt + {item.usage.completionTokens??'—'} completion tokens. OpenRouter billed cost {money(item.usage.costUsd)}.</div>}
  </div>
 </details>;
}

export function SpeakingComparisonLab(){
 const [data,setData]=useState<Data|null>(null),[mode,setMode]=useState<Mode>('full'),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const alive=useRef(true),running=useRef(false),runId=useRef('');
 async function refresh(){
  const r=await fetch('/api/admin/speaking-comparison',{cache:'no-store'});
  const d=await r.json() as Data;
  if(!r.ok)throw new Error(d.error||'Unable to load recordings');
  if(alive.current)setData(d);
  return d;
 }
 async function runPending(batch:Batch){
  if(running.current||runId.current===batch.id)return;
  running.current=true;runId.current=batch.id;
  if(alive.current){setBusy(true);setMessage('Running MiMo Flash comparisons. Keep this tab open; each request is saved independently.');}
  try{
   for(const m of modeOrder){
    for(const c of batch.runs[m]){
     if(c.status!=='queued')continue;
     if(!alive.current)return;
     setMode(m);
     setMessage('Testing '+modeLabels[m]+' · '+(c.index+1)+'/'+batch.runs[m].length);
     try{
      const r=await fetch('/api/admin/speaking-comparison',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'run',batchId:batch.id,mode:m,index:c.index})});
      const d=await r.json() as {case?:CaseResult;error?:string};
      if(!r.ok&&r.status!==409)throw new Error(d.error||'Request failed');
      if(r.ok)setMessage((d.case?.status==='completed'?'Completed':'Saved failure')+' · '+modeLabels[m]+' · '+(c.index+1)+'/'+batch.runs[m].length);
     }catch(e){setMessage('Request error: '+(e instanceof Error?e.message:'unknown')+'. Remaining queued items can resume on reload.');}
     try{await refresh();}catch{}
    }
   }
   setMessage('Comparison requests finished. Check per-mode results, costs and warnings.');
  }finally{running.current=false;if(alive.current)setBusy(false);}
 }
 useEffect(()=>{
  alive.current=true;
  void refresh().then(d=>{const b=d.runs[0];if(b&&modeOrder.some(m=>b.runs[m].some(x=>x.status==='queued')))void runPending(b);}).catch(e=>{if(alive.current)setMessage(e instanceof Error?e.message:'Unable to load comparison');}).finally(()=>{if(alive.current)setLoading(false);});
  const interval=window.setInterval(()=>{if(!running.current)void refresh().catch(()=>{});},12000);
  return ()=>{alive.current=false;window.clearInterval(interval);};
 },[]);
 async function start(){
  if(busy)return;
  setBusy(true);setMessage('');
  try{
   const r=await fetch('/api/admin/speaking-comparison',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'start'})});
   const d=await r.json() as {id?:string;error?:string};
   if(!r.ok)throw new Error(d.error||'Unable to start comparison');
   const current=await refresh();
   const b=current.runs.find(x=>x.id===d.id);
   if(b)void runPending(b);else setMessage('Batch saved. Reload to run pending cases.');
  }catch(e){setMessage(e instanceof Error?e.message:'Unable to start comparison');}finally{if(!running.current)setBusy(false);}
 }
 function exportResults(){
  const b=data?.runs[0];if(!b)return;
  const bytes=new Blob([JSON.stringify({source:data?.source,batch:b},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(bytes),a=document.createElement('a');
  a.href=url;a.download='jumptonine-speaking-14-comparison-'+b.id+'.json';document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 const latest=data?.runs[0],summary=latest?.summaries?.[mode],items=latest?.runs?.[mode]||[];
 const allDone=latest&&modeOrder.every(m=>latest.runs[m].every(x=>x.status==='completed'||x.status==='failed'));
 return <section className="workspace-panel sc-wrap" aria-label="Speaking 14 recording model comparison">
  <div className="sc-head">
   <div><h2>Speaking · 14 recordings comparison</h2><p>Use the existing saved IELTS speaking attempt. Compare MiMo Flash using 1 full-test request or 3 separate Part requests, with official IELTS Speaking criteria and JSON output.</p></div>
   <button type="button" className="sc-primary" onClick={()=>void start()} disabled={busy||loading||Boolean(latest&&!allDone)}>{busy?'Running…':latest&&!allDone?'Running saved comparison…':'Run 2 Methods · 4 Requests'}</button>
  </div>
  {data?.source&&<p className="sc-note"><strong>{data.source.title}</strong> · {data.source.clips.length} original recordings · {new Set(data.source.clips.map(x=>x.part)).size} parts · {data.model}</p>}
  <p className="sc-note">Four potentially billable provider requests (1 full test + 3 parts). No automatic retry. Each result and its actual provider-reported cost are saved in AI Lab. Leave this tab open during testing. BDT costs are approximate at reference rate ৳124.35/USD; original OpenRouter USD costs remain saved.</p>
  <p role="status" aria-live="polite" className="sc-status-message">{message||(!latest?'Ready to start. No paid tests run by opening the page.':'Comparison history loaded.')}</p>
  {latest&&<>
   <div className="sc-switch" role="group" aria-label="Choose evaluation method">{modeOrder.map(m=><button key={m} type="button" onClick={()=>setMode(m)} aria-pressed={mode===m} className={mode===m?'sc-selected':''}>{modeLabels[m]}</button>)}</div>
   {summary&&<div className="sc-metrics">
    <div className="sc-metric"><small>Server-calculated overall</small><strong>{score(summary.overallBand)}</strong><span>Indicative practice estimate only</span></div>
    <div className="sc-metric"><small>Reported API cost</small><strong>{money(summary.costUsd)}</strong><span>Actual billed usage when available</span></div>
    <div className="sc-metric"><small>Requests finished</small><strong>{summary.completed+summary.failed}/{summary.total}</strong><span>{summary.completed} completed · {summary.failed} failed</span></div>
   </div>}
   {summary&&<div className="sc-criteria">{criteriaKeys.map(k=><div className="sc-criterion" key={k}><span>{criterionNames[k]}</span><strong>{score(summary.criteria[k])}</strong></div>)}</div>}
   {summary&&<p className="sc-note">{summary.method}</p>}
   <div className="sc-result-list">{items.map(item=><Result key={mode+'-'+item.index} item={item} metadata={data?.source.clips||[]}/>)}</div>
   <div className="sc-foot"><button type="button" onClick={exportResults}>Export all results · JSON</button><span>Band scores may be withheld where audio evidence is insufficient. Accent is observed separately and is never a penalty by itself.</span></div>
  </>}
 </section>;
}
