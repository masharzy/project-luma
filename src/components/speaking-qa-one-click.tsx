'use client';

import { useEffect, useRef, useState } from 'react';

type CaseRow = {
 id: string;
 label: string;
 status: string;
 elapsedMs?: number;
 httpStatus?: number;
 error?: string;
 validation?: { passed: boolean; problems: string[]; computedOverall: number | null };
};
type Batch = { id: string; createdAt: string; kind: string; status: string; model: string; sourceClips: number; cases: CaseRow[]; [key: string]: unknown };

export function SpeakingQaOneClick() {
 const [runs,setRuns]=useState<Batch[]>([]);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [loading,setLoading]=useState(true);
 const alive=useRef(true);
 const running=useRef(false);
 const resumedBatch=useRef('');
 async function refreshOnce() {
  const r=await fetch('/api/admin/speaking-qa',{cache:'no-store'});
  if(!r.ok)throw new Error('Could not load the test history');
  const d=await r.json() as {runs:Batch[]};
  if(alive.current)setRuns(d.runs||[]);
  return d.runs||[];
 }
 async function processBatch(batch: Batch) {
  if(running.current||resumedBatch.current===batch.id)return;
  const pending=(batch.cases||[]).map((c,i)=>c.status==='queued'?i:-1).filter(i=>i>=0);
  if(!pending.length)return;
  running.current=true;
  resumedBatch.current=batch.id;
  setBusy(true);
  setMessage('Running '+pending.length+' Speaking QA cases with MiMo Flash. Keep this browser tab open until finished.');
  try{
   const workers=Array.from({length:Math.min(2,pending.length)},(_,worker)=>(async()=>{
    for(let i=worker;i<pending.length;i+=2){
     const index=pending[i];
     try{
      const r=await fetch('/api/admin/speaking-qa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'run_case',batchId:batch.id,index})});
      const d=await r.json();
      if(!r.ok&&r.status!==409)throw Error(d.error||'Case request failed');
      if(!r.ok&&r.status===409)continue;
      if(alive.current)setMessage('Finished '+(index+1)+'/5: '+(d.case?.status==='completed'?'Model response saved':'Model test failed')+'. Results saved automatically.');
      await refreshOnce();
     }catch(e) {if(alive.current)setMessage('A request failed: '+(e instanceof Error?e.message:'Unknown problem')+'. Remaining queued tests can resume when the page is reopened.');}
    }
   })());
   await Promise.all(workers);
   const finalRuns=await refreshOnce();
   if(alive.current&&finalRuns[0]?.status==='completed')setMessage('All five tests finished. Results are saved in AI Lab database.');
  }finally{running.current=false;setBusy(false);}
 }

 useEffect(()=>{
  alive.current=true;
  async function refresh() {
   try{
    const batches=await refreshOnce();
    const latest=batches[0];
    if(latest?.status==='running'&&latest.cases?.some(c=>c.status==='queued')&&!running.current&&resumedBatch.current!==latest.id){
     void processBatch(latest);
    }
   }catch(e){if(alive.current)setMessage(e instanceof Error?e.message:'Could not load QA status');}
   finally{if(alive.current)setLoading(false);}
  }
  void refresh();
  const interval=window.setInterval(()=>void refresh(),5000);
  return ()=>{alive.current=false;window.clearInterval(interval);};
 },[]);

 async function start() {
  setBusy(true);setMessage('');
  try{
   const r=await fetch('/api/admin/speaking-qa',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
   const d=await r.json();
   if(!r.ok)throw new Error(d.error||'Unable to start the batch');
   const batches=await refreshOnce();
   const latest=batches.find(b=>b.id===d.id);
   if(latest)void processBatch(latest);
   else setMessage('QA batch created, reload AI Lab to resume.');
  }catch(e){setMessage(e instanceof Error?e.message:'The test could not start');}
  finally{if(!running.current)setBusy(false);}
 }
 function exportReport(run:Batch) {
  const raw=JSON.stringify(run,null,2);
  const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='jumptonine-speaking-qa-'+run.id+'.json';document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 const current=runs[0];
 const ready=current?.cases?.filter(c=>c.status==='completed'||c.status==='failed').length||0;
 const active=current?.status==='running';
 return <section className="workspace-panel" aria-label="One-click Speaking QA" style={{marginBottom:16}}>
  <div style={{display:'flex',flexWrap:'wrap',gap:12,alignItems:'center',justifyContent:'space-between'}}>
   <div style={{minWidth:0}}>
    <h2 style={{margin:0}}>Speaking AI · One-click QA</h2>
    <p style={{margin:'8px 0 0',maxWidth:660}}>Run five MiMo Flash tests using your most recent saved Speaking recording: original audio, unrelated question, noisy audio, silence, and clipped audio. Uses the OpenRouter secret already saved in AI Lab.</p>
   </div>
   <button type="button" className="adm-primary" onClick={()=>void start()} disabled={busy||active||loading} style={{minHeight:44,padding:'10px 18px',cursor:busy||active?'not-allowed':'pointer'}}>
    {busy?'Starting…':active?'Testing in progress…':'Run 5 Speaking QA Tests'}
   </button>
  </div>
  <p className="adm-note" style={{margin:'12px 0 0'}}>Admin-only · Maximum five paid OpenRouter calls per run · No automatic retries · One new batch per hour · Keep this tab open during testing · Previous Speaking UI unchanged.</p>
  <p role="status" aria-live="polite" style={{margin:'8px 0'}}>{message}</p>
  {current&&<div style={{borderTop:'1px solid var(--border, #dedede)',paddingTop:12,marginTop:12}}>
   <div style={{display:'flex',flexWrap:'wrap',justifyContent:'space-between',gap:8,alignItems:'center'}}>
    <p style={{margin:0}}><strong>{current.status==='running'?'Running':current.status==='completed'?'Completed':'Status: '+current.status}</strong> · {ready}/5 finished · Model: {current.model}</p>
    <button type="button" onClick={()=>exportReport(current)} style={{minHeight:40,padding:'8px 12px'}}>Download QA results JSON</button>
   </div>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:8,marginTop:12}}>
    {current.cases?.map(c=><div key={c.id} style={{border:'1px solid var(--border, #dedede)',borderRadius:6,padding:10,minWidth:0}}>
     <div style={{fontWeight:600}}>{c.label}</div>
     <div style={{fontSize:13,marginTop:6,wordBreak:'break-word'}}>{c.status==='queued'?'Queued':c.status==='completed'?'Response received':c.status==='failed'?'Failed':c.status}{typeof c.elapsedMs==='number'?' · '+(c.elapsedMs/1000).toFixed(1)+'s':''}{c.validation?' · '+(c.validation.passed?'Validation passed':c.validation.problems.length+' checks flagged'):''}{c.error?' · '+c.error:''}</div>
    </div>)}
   </div>
   <p className="adm-note" style={{marginTop:8}}>After completion, send the downloaded JSON report in ChatGPT for a detailed comparison and prompt revision. Synthetic/modified recordings test robustness, not human IELTS scoring accuracy.</p>
  </div>}
 </section>;
}
