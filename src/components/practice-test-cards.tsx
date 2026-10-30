import Link from 'next/link';
import {Headphones,BookOpenText,PenLine,ArrowUpRight} from 'lucide-react';
import {defaultDurations} from '@/lib/cambridge-settings';
const practiceModules = ['listening','reading','writing'] as const;
export type PracticeTestCard={id:string;title:string;access?:'free'|'premium';description?:string;durations?:Record<string,number>;modules:string[]};
export function PracticeTestCards({tests,moduleFilter}:{tests:PracticeTestCard[];moduleFilter?:string}){
 return <div className="cambridge-tests">{tests.map((test,index)=>{
  const locked=test.access==='premium',ready=new Set(test.modules),minutes={...defaultDurations,...test.durations};
  return <article className="cambridge-test-row" key={test.id}>
   <div className="test-row-heading"><div><span className="eyebrow">TEST {String(index+1).padStart(2,'0')}</span><h2>{test.title}</h2>{test.description&&<p>{test.description}</p>}</div><span className="access-pill">{locked?'Premium':'Free access'}</span></div>
   <div className="test-row-body"><div className="test-module-area"><p className="module-caption">Take the test by module</p><div className="test-module-grid">
    {practiceModules.filter(module=>!moduleFilter||module===moduleFilter).map(module=>{
     const Icon=module==='listening'?Headphones:module==='reading'?BookOpenText:PenLine,available=ready.has(module);
     const content=<><span className={'module-letter module-icon-'+module}><Icon size={25}/></span><span><strong>{module[0].toUpperCase()+module.slice(1)}</strong><small>{minutes[module]} minutes{!available?' · Coming soon':locked?' · Premium':''}</small></span><ArrowUpRight size={19}/></>;
     return !locked&&available?<Link className="test-module-card" key={module} href={`/exam/practice/${test.id}/${module}`}>{content}</Link>:<div className="test-module-card unavailable" key={module} aria-disabled>{content}</div>;
    })}
   </div></div>{!moduleFilter&&<div className="full-test-action"><span>{minutes.listening+minutes.reading} min · Listening + Reading</span>{!locked&&ready.has('listening')&&ready.has('reading')?<Link className="button" href={`/exam/practice/${test.id}/full`}>Listening + Reading ↗</Link>:<button className="button" disabled>{locked?'Premium access':'Full test coming soon'}</button>}</div>}</div>
  </article>;
 })}</div>;
}
