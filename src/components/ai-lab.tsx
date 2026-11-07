'use client';
import './ai-lab.css';
import { Timer, Download, Play } from 'lucide-react';
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
 const levelChoice=matrix&&reasoning!=='none'?'all':level;
 const stage=busy?'Running':'Run benchmark';
 return <div className="ai-lab">
 <header className="lab-head"><h1>AI lab</h1><p>Run one sample through a model, repeat it, and compare speed and score. Results are saved.</p></header>
 <fieldset disabled={busy} className="lab-card">
 <div className="lab-row lab-row-model">
 <label>Provider<select value={provider} onChange={e=>{setProvider(e.target.value);setModel('');setModels([]);setReasoning('none');}}><option value="google">Google Gemini</option><option value="openrouter">OpenRouter (free models)</option></select></label>
 <label>Model<select value={model} onChange={e=>chooseModel(e.target.value)}><option value="">{models.length?'Choose a model':'Load models first'}</option>{models.map(m=><option key={m.id} value={m.id}>{m.id} · {m.note}</option>)}</select></label>
 <button type="button" onClick={()=>action(async()=>{const d=await request({action:'models',provider});setModels(d.models);chooseModel(d.models[0]?.id||'',d.models);})}>Load models</button>
 </div>
 <details className="lab-key"><summary><span className={status[provider]?'lab-dot is-ok':'lab-dot'}/>{status[provider]?'API key saved':'No API key'}{!status.vaultReady&&' · storage unavailable'}</summary>
 <div className="lab-row lab-row-key"><label>API key<input type="password" autoComplete="new-password" value={key} onChange={e=>setKey(e.target.value)}/></label><button type="button" disabled={key.trim().length<15} onClick={()=>action(async()=>{await request({action:'save-key',provider,key});setKey('');await refresh();setMessage('Key saved securely.');})}>Save key</button></div></details>
 <div className="lab-sep"/>
 <div className="lab-row lab-row-sample">
 <div className="lab-seg" role="group" aria-label="Skill">{(['writing','speaking'] as const).map(k=><button type="button" key={k} aria-pressed={skill===k} onClick={()=>setSkill(k)}>{k==='writing'?'Writing':'Speaking'}</button>)}</div>
 <label>Sample ID<input value={sampleId} onChange={e=>setSampleId(e.target.value)}/></label>
 </div>
 <label>Question<textarea rows={3} value={question} onChange={e=>setQuestion(e.target.value)} placeholder={skill==='writing'?'Task text. For Task 1, describe the chart data here.':'The exact Speaking question(s) asked.'}/></label>
 {skill==='writing'?<label>Candidate answer<textarea rows={9} value={answer} onChange={e=>setAnswer(e.target.value)}/></label>:<label>Recording<input type="file" accept="audio/*" onChange={e=>setFile(e.target.files?.[0]||null)}/><small>Original audio, under 2.9 MB. MP3 or WAV for OpenRouter.</small></label>}
 <div className="lab-row lab-row-opts">
 <label>Examiner band<input type="number" min="0" max="9" step="0.5" value={reference} onChange={e=>setReference(e.target.value)} placeholder="optional"/></label>
 <label>Reasoning<select value={reasoning} onChange={e=>setReasoning(e.target.value)}><option value="none">Provider default</option>{supportedReasoning==='effort'&&<option value="effort">Effort levels</option>}{supportedReasoning==='budget'&&<option value="budget">Token budget</option>}</select></label>
 <label>Depth<select value={levelChoice} onChange={e=>{const v=e.target.value;setMatrix(v==='all');if(v!=='all')setLevel(v);}}>{reasoning!=='none'&&<option value="all">Normal, Deep, Maximum</option>}{['normal','deep','maximum'].map(l=><option key={l} value={l}>{l[0].toUpperCase()+l.slice(1)}</option>)}</select></label>
 <label>Repeats<input type="number" min="1" max="5" value={repeats} onChange={e=>setRepeats(Math.max(1,Math.min(5,Number(e.target.value)||1)))}/></label>
 {reasoning==='budget'&&<label>Thinking budget<input type="number" min="1024" max="32768" value={maxThinking} onChange={e=>setMaxThinking(Number(e.target.value))}/></label>}
 </div>
 <div className="lab-actions"><button type="button" className="lab-primary" disabled={!model||!question||!status[provider]} onClick={()=>action(run)}>{busy?<Timer size={16}/>:<Play size={16}/>} {stage}</button>{busy&&<button type="button" disabled={false} onClick={()=>{stop.current=true;setMessage('Will stop after the current request completes.');}}>Stop after this run</button>}<span className="lab-count">{successes.length} of {runs.length} saved runs succeeded</span></div>
 </fieldset>
 <p role="status" className={message?'lab-status':'lab-status-empty'}>{message}</p>
 <section className="lab-results">
 <div className="lab-results-head"><h2>Results</h2><button type="button" onClick={()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(runs,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='ai-benchmark-results.json';a.click();URL.revokeObjectURL(url);}}><Download size={15}/> Export JSON</button></div>
 <div className="lab-table"><table><thead><tr>{['Model','Ok','First text','Total p50','Total p95','Band','Avg error'].map(t=><th key={t}>{t}</th>)}</tr></thead><tbody>{runs.length===0&&<tr><td colSpan={7} className="lab-empty">No runs yet. Pick a model and a sample above.</td></tr>}{Object.entries(groups).map(([name,items])=>{const all=items||[],ok=all.filter(r=>r.ok),bands=ok.map(r=>r.assessment?.estimatedBand).filter((x):x is number=>typeof x==='number'),errors=ok.map(r=>r.assessment?.absoluteBandError).filter((x):x is number=>typeof x==='number');return <tr key={name}><td><strong>{all[0]?.model}</strong><small>{all[0]?.skill} · {all[0]?.level} · {all[0]?.reasoning}</small><small>{all[0]?.sampleId} · {all[0]?.contentHash?.slice(0,8)}</small></td><td>{ok.length}/{all.length}</td><td>{percentile(ok.map(r=>r.firstTextMs).filter((x):x is number=>x!==null),.5)}</td><td>{percentile(ok.map(r=>r.totalMs),.5)}</td><td>{percentile(ok.map(r=>r.totalMs),.95)}</td><td>{bands.length?`${Math.min(...bands)}–${Math.max(...bands)}`:'—'}</td><td>{errors.length?(errors.reduce((a,b)=>a+b,0)/errors.length).toFixed(2):'—'}</td></tr>;})}</tbody></table></div>
 <details className="adm-help"><summary>How timings are measured</summary><p>First text excludes reasoning. Total includes validation and has no retries. P95 needs enough samples. Use a new sample ID when you change an answer.</p></details>
 <details className="adm-help"><summary>Recent runs</summary><div className="lab-history">{runs.slice(0,20).map(r=><button type="button" key={r.id} onClick={()=>setLatest(r)}>{r.model} · {r.sampleId} · {r.level} · {r.ok?`${(r.totalMs/1000).toFixed(2)}s`:r.error}{r.diagnostic&&<small>{r.diagnostic.hint}{r.diagnostic.retryAfterSeconds!==null?` Retry after ${r.diagnostic.retryAfterSeconds}s.`:''}</small>}</button>)}</div></details>
 <details className="adm-help"><summary>Latest response</summary><pre>{JSON.stringify(latest,null,2)}</pre></details>
 </section>
 </div>;
}
