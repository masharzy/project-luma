'use client';
import './ai-lab.css';
import { FlaskConical, ShieldCheck, Timer, Download, Play, FileText } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
type Run={contentHash:string;reasoning:string;maxThinking:number;id:string;provider:string;model:string;level:string;skill:string;sampleId:string;ok:boolean;firstTextMs:number|null;totalMs:number;assessment?:{estimatedBand:number|null;absoluteBandError:number|null};error?:string;diagnostic?:{category:string;hint:string;retryAfterSeconds:number|null}};
export function AiLab(){
 const [provider,setProvider]=useState('google'),[key,setKey]=useState(''),[status,setStatus]=useState<Record<string,boolean>>({}),[models,setModels]=useState<{id:string;note:string;reasoning?:string}[]>([]),[model,setModel]=useState('');
 const [skill,setSkill]=useState('writing'),[reasoning,setReasoning]=useState('none'),[maxThinking,setMaxThinking]=useState(8192),[sampleId,setSampleId]=useState('sample-001'),[question,setQuestion]=useState(''),[answer,setAnswer]=useState(''),[reference,setReference]=useState(''),[file,setFile]=useState<File|null>(null),[repeats,setRepeats]=useState(3),[matrix,setMatrix]=useState(true),[level,setLevel]=useState('normal');
 const [runs,setRuns]=useState<Run[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[latest,setLatest]=useState<unknown>(null);const stop=useRef(false);
 async function request(body:object){const r=await fetch('/api/admin/ai-lab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error||'Request failed');return d;}
 async function refresh(){const r=await fetch('/api/admin/ai-lab');const d=await r.json();if(!r.ok)throw Error(d.error);setStatus(d.status);setRuns(d.runs.map((x:{id:string;result:Run})=>({...x.result,id:x.id})));}
 useEffect(()=>{refresh().catch(e=>setMessage(e.message));},[]);
 async function action(task:()=>Promise<void>){setBusy(true);setMessage('');try{await task();}catch(e){setMessage(e instanceof Error?e.message:'Request failed');}finally{setBusy(false);}}
 async function run(){
  stop.current=false;let audio;
  if(skill==='speaking'){if(!file)throw Error('Upload original speaking audio');if(file.size>2900000)throw Error('Audio must be under 2.9 MB. Use a compressed recording.');const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('Unable to read audio'));reader.readAsDataURL(file);});const ext=file.name.split('.').pop()?.toLowerCase();const mime=({'mp3':'audio/mpeg','wav':'audio/wav','webm':'audio/webm','ogg':'audio/ogg','m4a':'audio/mp4','flac':'audio/flac'} as Record<string,string>)[ext||'']||file.type;audio={data,mime};}
  const levels=matrix&&reasoning!=='none'?['normal','deep','maximum']:[level];
  for(const current of levels)for(let i=0;i<repeats;i++){if(stop.current){setMessage('Stopped. Completed runs are saved.');return;}setMessage(`${current}: run ${i+1}/${repeats}`);const d=await request({provider,model,skill,reasoning,maxThinking,sampleId,question,answer:skill==='writing'?answer:'',referenceBand:reference===''?null:Number(reference),audio,level:current});setLatest(d);setRuns(old=>[d,...old]);if(!d.ok){setMessage(`Stopped: ${d.error}. ${d.diagnostic?.hint||''}${d.diagnostic?.retryAfterSeconds!=null?` Retry after ${d.diagnostic.retryAfterSeconds}s.`:''}`);return;}}
  setMessage('Benchmark complete. Results saved.');
 }
 const selected=models.find(m=>m.id===model);
 const supportedReasoning=selected?.reasoning||'none';
 function chooseModel(id:string,list=models){setModel(id);setReasoning(list.find(m=>m.id===id)?.reasoning||'none');}
 const successes=runs.filter(r=>r.ok);
 const groups=Object.groupBy(runs,r=>`${r.provider} / ${r.model} / ${r.skill} / ${r.level} / ${r.reasoning} / ${r.maxThinking} / ${r.sampleId} / ${r.contentHash?.slice(0,8)}`);
 function percentile(values:number[],p:number){if(!values.length)return '—';const v=[...values].sort((a,b)=>a-b);return (v[Math.max(0,Math.ceil(v.length*p)-1)]/1000).toFixed(2)+'s';}
 return <div className="ai-lab">
 <header className="lab-header"><div><span className="lab-eyebrow"><FlaskConical size={15}/> LUMA / MODEL WORKBENCH</span><h1>AI evaluation lab<span>Find the right evaluator.</span></h1><p>One sample. Different models. Clear evidence on quality, consistency and speed.</p></div><span className="lab-badge"><ShieldCheck size={16}/> Admin workspace</span></header>
 <div className="lab-metrics"><div><Timer size={19}/><span>Successful runs<strong>{successes.length}<small> / {runs.length} requests</small></strong></span></div><div><FileText size={19}/><span>Writing &amp; Speaking<strong>Two skills<small> · original audio required</small></strong></span></div><div><ShieldCheck size={19}/><span>OpenRouter policy<strong>Free models only<small> · paid fallback off</small></strong></span></div></div>
 <div className="lab-workbench">
 <fieldset disabled={busy} className="lab-provider"><legend><span>01</span> Provider &amp; model</legend><p className="lab-muted">Connect once. Your keys stay encrypted on the server.</p>
 <label>Provider <select value={provider} onChange={e=>{setProvider(e.target.value);setModel('');setModels([]);setReasoning('none');}}><option value="google">Google Gemini</option><option value="openrouter">OpenRouter — free models only</option></select></label>
 <p>{status[provider]?'Key configured':'No key configured'} · {status.vaultReady?'Encrypted key storage ready':'Server needs AI_LAB_MASTER_KEY to save keys'}</p>
 <label>API key <input type="password" autoComplete="new-password" value={key} onChange={e=>setKey(e.target.value)} /></label><button onClick={()=>action(async()=>{await request({action:'save-key',provider,key});setKey('');await refresh();setMessage('Key saved securely.');})}>Save secret</button>
 <button onClick={()=>action(async()=>{const d=await request({action:'models',provider});setModels(d.models);chooseModel(d.models[0]?.id||'',d.models);})}>Load available models</button>
 <label>Model <select value={model} onChange={e=>chooseModel(e.target.value)}><option value="">Choose model</option>{models.map(m=><option key={m.id} value={m.id}>{m.id} — {m.note}</option>)}</select></label>
 </fieldset>
 <fieldset disabled={busy} className="lab-sample"><legend><span>02</span> Sample &amp; experiment</legend>
 <label>Skill <select value={skill} onChange={e=>setSkill(e.target.value)}><option value="writing">Writing</option><option value="speaking">Speaking — audio required</option></select></label>
 <label>Sample ID <input value={sampleId} onChange={e=>setSampleId(e.target.value)}/></label>
 <label>Question / task instructions <textarea rows={4} value={question} onChange={e=>setQuestion(e.target.value)} /></label>
 {skill==='writing'?<label>Original answer <textarea rows={10} value={answer} onChange={e=>setAnswer(e.target.value)} /></label>:<label>Original recording (under 2.9 MB; MP3/WAV for OpenRouter)<input type="file" accept="audio/*" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>}
 <p>For chart-based Writing, describe the source chart in the question for this pilot; do not treat a missing chart as a valid full assessment. Speaking should include a complete answer, with the question and part number above.</p>
 <label>Examiner reference band (optional) <input type="number" min="0" max="9" step="0.5" value={reference} onChange={e=>setReference(e.target.value)}/></label>
 <label>Reasoning API <select value={reasoning} onChange={e=>setReasoning(e.target.value)}><option value="none">Provider default — no controlled reasoning comparison</option>{supportedReasoning==='effort'&&<option value="effort">Effort levels · Low / Medium / High</option>}{supportedReasoning==='budget'&&<option value="budget">Token budget · Gemini 2.5</option>}</select></label>
 {reasoning==='budget'&&<label>Maximum thinking budget<input type="number" min="1024" max="32768" value={maxThinking} onChange={e=>setMaxThinking(Number(e.target.value))}/></label>}
 <label><input type="checkbox" checked={matrix} onChange={e=>setMatrix(e.target.checked)}/> Test Normal → Deep → Maximum</label>
 {!matrix&&<label>Level <select value={level} onChange={e=>setLevel(e.target.value)}>{['normal','deep','maximum'].map(l=><option key={l}>{l}</option>)}</select></label>}
 <label>Repetitions per level <input type="number" min="1" max="5" value={repeats} onChange={e=>setRepeats(Math.max(1,Math.min(5,Number(e.target.value))))}/></label>
 <button className="lab-primary" disabled={!model||!question||!status[provider]} onClick={()=>action(run)}><Play size={16}/> {busy?'Running…':'Run benchmark'}</button>
 </fieldset>
 </div>
 {busy&&<button onClick={()=>{stop.current=true;setMessage('Will stop after the current request completes.');}}>Stop after current request</button>}
 <p role="status" className={message?'lab-status':'lab-status-empty'}>{message}</p>
 <div className="lab-section-heading"><div><span className="lab-eyebrow">RESULTS / SERVER TIMING</span><h2>Latency &amp; consistency</h2></div><Timer size={21}/></div><p>Seconds measured from the application server. First text excludes reasoning and keep-alives. Total includes generation and validation, excludes database storage and catalog lookup. No retries. P95 is provisional with small samples. Change sample ID when changing the answer.</p>
 <div style={{overflowX:'auto'}}><table><thead><tr>{['Model / skill / level / sample','Success / total','First text p50','Total p50','Total p95','Band range','Mean reference error'].map(t=><th key={t}>{t}</th>)}</tr></thead><tbody>{runs.length===0&&<tr><td colSpan={7} className="lab-empty">Your first comparison starts here. Choose a model and add a sample above.</td></tr>}{Object.entries(groups).map(([name,items])=>{const all=items||[],ok=all.filter(r=>r.ok),bands=ok.map(r=>r.assessment?.estimatedBand).filter((x):x is number=>typeof x==='number'),errors=ok.map(r=>r.assessment?.absoluteBandError).filter((x):x is number=>typeof x==='number');return <tr key={name}><td><strong>{all[0]?.model}</strong><small>{all[0]?.skill} · {all[0]?.level} · {all[0]?.reasoning}</small><small>{all[0]?.sampleId} · {all[0]?.contentHash?.slice(0,8)}</small></td><td>{ok.length}/{all.length}</td><td>{percentile(ok.map(r=>r.firstTextMs).filter((x):x is number=>x!==null),.5)}</td><td>{percentile(ok.map(r=>r.totalMs),.5)}</td><td>{percentile(ok.map(r=>r.totalMs),.95)}</td><td>{bands.length?`${Math.min(...bands)}–${Math.max(...bands)}`:'—'}</td><td>{errors.length?(errors.reduce((a,b)=>a+b,0)/errors.length).toFixed(2):'—'}</td></tr>;})}</tbody></table></div>
 <button onClick={()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(runs,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='ai-benchmark-results.json';a.click();URL.revokeObjectURL(url);}}><Download size={16}/> Export results JSON</button>
 <details><summary>Inspect latest response</summary><pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(latest,null,2)}</pre></details>
 <h2>Recent requests</h2><div className="lab-history">{runs.slice(0,20).map(r=><button key={r.id} onClick={()=>setLatest(r)}>{r.model} · {r.sampleId} · {r.level} · {r.ok?`${(r.totalMs/1000).toFixed(2)}s`:r.error}{r.diagnostic&&<small>{r.diagnostic.hint}{r.diagnostic.retryAfterSeconds!==null?` Retry after ${r.diagnostic.retryAfterSeconds}s.`:''}</small>}</button>)}</div>
 </div>;
}
