import Link from 'next/link';
import {Headphones,BookOpenText,PenLine,Mic2,ArrowUpRight,Lock} from 'lucide-react';
import {defaultDurations} from '@/lib/cambridge-settings';
const practiceModules = ['listening','reading','writing'] as const;
export type PracticeTestCard={id:string;title:string;access?:'free'|'premium';description?:string;durations?:Record<string,number>;modules:string[];sections?:string[];number?:number};
export function PracticeTestCards({tests,moduleFilter,startNumber=1,hrefBase='/exam/recent-tests',notes=false}:{tests:PracticeTestCard[];moduleFilter?:string;startNumber?:number;hrefBase?:string;notes?:boolean}){
 return <div className="cambridge-tests lib-catalog">{tests.map((test,index)=>{
  const locked=test.access==='premium',ready=new Set(test.modules),minutes={...defaultDurations,...test.durations};
  const shownModules=(test.sections?['listening','reading','writing','speaking'].filter(m=>test.sections!.includes(m)):[...practiceModules]).filter(m=>(!moduleFilter||m===moduleFilter)&&(m!=='speaking'||ready.has('speaking'))),no=String(test.number??startNumber+index).padStart(2,'0');
  const fullReady=!locked&&ready.has('listening')&&ready.has('reading')&&ready.has('writing');
  return <article className="cambridge-test-row lib-test" key={test.id}>
   <div className="lib-test-id"><span className="lib-test-no" aria-hidden>{no}</span><div><span className="eyebrow">TEST {no}</span><h2>{test.title}</h2>{test.description&&<p lang="bn">{test.description}</p>}</div></div>
   <div className="lib-test-modules" role="group" aria-label={`${test.title} modules`}>
    {shownModules.map(module=>{
     const Icon=module==='listening'?Headphones:module==='reading'?BookOpenText:module==='speaking'?Mic2:PenLine,available=ready.has(module);
     const content=<><span className={'module-letter module-icon-'+module}><Icon size={20}/></span><span className="lib-mod-text"><strong>{module[0].toUpperCase()+module.slice(1)}</strong><small>{!available?'Coming soon':(minutes as Record<string,number>)[module]+' minutes'}</small></span>{locked?<Lock size={15}/>:<ArrowUpRight size={17}/>}</>;
     return !locked&&available?<Link className="test-module-card lib-mod" key={module} href={`${hrefBase}/${test.id}/${module}`}>{content}</Link>:<div className="test-module-card lib-mod unavailable" key={module} aria-disabled>{content}</div>;
    })}
   </div>
   <div className="lib-test-side"><span className={'access-pill lib-access'+(locked?' is-premium':'')}>{locked?'Premium':'Free access'}</span>
    {!moduleFilter&&<div className="full-test-action"><span>{minutes.listening+minutes.reading+minutes.writing} min · L + R + W</span>{fullReady?<Link className="button lib-btn" href={`${hrefBase}/${test.id}/full`}>Start Full Test ↗</Link>:<button className="button lib-btn" disabled>{locked?'Premium access':'Full test coming soon'}</button>}</div>}
   </div>
  </article>;
 })}</div>;
}
