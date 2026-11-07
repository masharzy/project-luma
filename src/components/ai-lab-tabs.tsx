'use client';
import { useState } from 'react';
import { AiLab } from './ai-lab';
import { SpeakingComparisonLab } from './speaking-comparison-lab';
import { SpeakingQaOneClick } from './speaking-qa-one-click';
import './ai-lab-tabs.css';
const tabs=[{key:'bench',label:'Benchmark'},{key:'compare',label:'Speaking comparison'},{key:'qa',label:'Speaking QA'}] as const;
type Key=typeof tabs[number]['key'];
export function AiLabTabs(){
 const [active,setActive]=useState<Key>('bench'),[seen,setSeen]=useState<Key[]>(['bench']);
 const pick=(k:Key)=>{setActive(k);setSeen(s=>s.includes(k)?s:[...s,k]);};
 return <div className="ai-lab-tabs">
  <div className="ai-tabs" role="tablist" aria-label="AI lab sections">{tabs.map(t=><button key={t.key} type="button" role="tab" id={'tab-'+t.key} aria-selected={active===t.key} aria-controls={'panel-'+t.key} onClick={()=>pick(t.key)}>{t.label}</button>)}</div>
  <div role="tabpanel" id="panel-bench" aria-labelledby="tab-bench" hidden={active!=='bench'}><AiLab/></div>
  {seen.includes('compare')&&<div role="tabpanel" id="panel-compare" aria-labelledby="tab-compare" hidden={active!=='compare'}><SpeakingComparisonLab/></div>}
  {seen.includes('qa')&&<div role="tabpanel" id="panel-qa" aria-labelledby="tab-qa" hidden={active!=='qa'}><SpeakingQaOneClick/></div>}
 </div>;
}
