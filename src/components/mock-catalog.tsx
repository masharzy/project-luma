'use client';
import Link from 'next/link';
import { useState } from 'react';
import { MockCard } from '@/components/mock-card';
import { mockPhase, type MockPhase } from '@/lib/mock-phase';

const tabs=[['all','All exams'],['upcoming','Upcoming'],['registered','My registrations'],['results','Published results']] as const;
const groups:[MockPhase,string][]=[['live','Live now'],['upcoming','Upcoming'],['completed','Completed']];
export function MockCatalog({items}:{items:any[]}){
 const [tab,setTab]=useState<string>('all'),now=Date.now();
 const shown=items.filter(e=>tab==='all'||(tab==='upcoming'?mockPhase(e,now)==='upcoming':tab==='registered'?Boolean(e.registered_at):Boolean(e.results_published_at)));
 return <section className="mk-wrap">
  <div className="mk-toolbar"><div className="mk-tabs" role="group" aria-label="Filter mock exams">{tabs.map(([key,label])=><button type="button" key={key} aria-pressed={tab===key} onClick={()=>setTab(key)}>{label}</button>)}</div><span className="mk-count" role="status">{shown.length} exams</span></div>
  {groups.map(([phase,title])=>{const list=shown.filter(e=>mockPhase(e,now)===phase);return list.length?<section className="mk-group" key={phase} aria-label={title}><header><h2>{title}</h2></header><div className="mk-list">{list.map(e=><MockCard key={e.id} item={e} now={now} basePath="/mocks"/>)}</div></section>:null})}
  {!shown.length&&<div className="lib-empty"><h2>{items.length?'No exams in this view':'No mock exams scheduled yet'}</h2><Link className="lib-btn" href="/recent-tests">Practice while you wait ↗</Link></div>}
 </section>;
}
