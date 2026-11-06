import Link from 'next/link';
import {Headphones,BookOpenText,PenLine,ArrowUpRight,Lock} from 'lucide-react';
import {defaultDurations} from '@/lib/cambridge-settings';
const practiceModules = ['listening','reading','writing'] as const;
export type PracticeTestCard={id:string;title:string;access?:'free'|'premium';description?:string;durations?:Record<string,number>;modules:string[]};
export function PracticeTestCards({tests,moduleFilter,startNumber=1}:{tests:PracticeTestCard[];moduleFilter?:string;startNumber?:number}){
 return <div className="cambridge-tests lib-catalog">{tests.map((test,index)=>{
  const locked=test.access==='premium',ready=new Set(test.modules),minutes={...defaultDurations,...test.durations};
  const fullReady=!locked&&ready.has('listening')&&ready.has('reading')&&ready.has('writing');
  return <article className="cambridge-test-row lib-test" key={test.id}>
   <div className="lib-test-id"><span className="lib-test-no" aria-hidden>{String(startNumber+index).padStart(2,'0')}</span><div><span className="eyebrow">TEST {String(startNumber+index).padStart(2,'0')}</span><h2>{test.title}</h2>{test.description&&<p lang="bn">{test.description}</p>}</div></div>
   <div className="lib-test-modules" role="group" aria-label={`${test.title} modules`}>
    {practiceModules.filter(module=>!moduleFilter||module===moduleFilter).map(module=>{
     const Icon=module==='listening'?Headphones:module==='reading'?BookOpenText:PenLine,available=ready.has(module);
     const content=<><span className={'module-letter module-icon-'+module}><Icon size={20}/></span><span className="lib-mod-text"><strong>{module[0].toUpperCase()+module.slice(1)}</strong><small>{minutes[module]} minutes{!available?' · Coming soon':locked?' · Premium':''}</small></span>{locked?<Lock size={15}/>:<ArrowUpRight size={17}/>}</>;
     return !locked&&available?<Link className="test-module-card lib-mod" key={module} href={`/exam/recent-tests/${test.id}/${module}`}>{content}</Link>:<div className="test-module-card lib-mod unavailable" key={module} aria-disabled>{content}</div>;
    })}
   </div>
   <div className="lib-test-side"><span className={'access-pill lib-access'+(locked?' is-premium':'')}>{locked?'Premium':'Free access'}</span>
    {!moduleFilter&&<div className="full-test-action"><span>{minutes.listening+minutes.reading+minutes.writing} min · L + R + W</span>{fullReady?<Link className="button lib-btn" href={`/exam/recent-tests/${test.id}/full`}>Start Full Test ↗</Link>:<button className="button lib-btn" disabled>{locked?'Premium access':'Full test coming soon'}</button>}</div>}
   </div>
  </article>;
 })}</div>;
}
