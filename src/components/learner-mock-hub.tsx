'use client';
import {useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,CalendarDays,Clock3,Check,ArrowRight} from 'lucide-react';
import {MockCard} from '@/components/mock-card';
import {mockPhase} from '@/lib/mock-phase';
export type LearnerMock={id:string;title:string;description:string;access:string;starts_at:string;ends_at:string;registered_at:string|null;attempt_id:string|null;results_published_at:string|null;modules:string[]};
export function LearnerMockHub({items,now}:{items:LearnerMock[];now:number}){
 const [tab,setTab]=useState('upcoming');
 const upcoming=items.filter(e=>new Date(e.ends_at).getTime()>now),registered=items.filter(e=>e.registered_at),past=items.filter(e=>new Date(e.ends_at).getTime()<=now);
 const order={live:0,upcoming:1,completed:2},shown=[...(tab==='upcoming'?upcoming:tab==='registered'?registered:past)].sort((a,b)=>order[mockPhase(a,now)]-order[mockPhase(b,now)]);
 return <><div className="study-summary"><div><span>Upcoming & live</span><strong>{upcoming.length}</strong></div><div><span>My registrations</span><strong>{registered.length}</strong></div><div><span>Past exams</span><strong>{past.length}</strong></div></div><div className="study-tabs" role="group" aria-label="Mock exam filters">{[['upcoming','Upcoming',CalendarDays],['registered','My registrations',Check],['past','Past exams',Clock3]].map(([key,label,Icon])=>{const I=Icon as typeof CalendarDays;return <button key={String(key)} aria-pressed={tab===key} onClick={()=>setTab(String(key))}><I size={17}/>{String(label)}</button>})}</div>
 {shown.length?<div className="mk-list mk-dash">{shown.map(e=><MockCard key={e.id} item={e} now={now} basePath="/dashboard/mocks"/>)}</div>:<section className="study-empty"><CalendarDays size={32}/><h2>{tab==='registered'?'Your calendar is open':tab==='past'?'Your story is just beginning':'Make room for your next mock'}</h2><p>{tab==='registered'?'Upcoming tab থেকে mock বেছে register করো।':'নতুন published mock এখানে দেখা যাবে।'}</p>{tab==='registered'?<button className="student-button" onClick={()=>setTab('upcoming')}>Browse upcoming mocks <ArrowRight size={14}/></button>:<Link className="student-button secondary" href="/dashboard/my-tests">Practice in the meantime <ArrowUpRight size={14}/></Link>}</section>}</>;
}
