'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,Search,ChevronDown} from 'lucide-react';
import type {LearnerTest} from '@/lib/learner/catalog';
function TestCollection({tests,label}:{tests:LearnerTest[];label:string}){
 const [query,setQuery]=useState(''),[kind,setKind]=useState('all'),[page,setPage]=useState(1);
 const filtered=useMemo(()=>tests.filter(t=>(kind==='all'||t.kind===kind)&&(t.title+' '+t.collection).toLowerCase().includes(query.toLowerCase().trim())),[tests,query,kind]);
 const pages=Math.max(1,Math.ceil(filtered.length/12)),current=Math.min(page,pages);
 return <div className="student-library"><div className="student-library-toolbar"><label className="student-test-search"><Search size={16}/><input type="search" aria-label={'Search '+label} placeholder="Search tests or books" value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/></label><select aria-label={'Filter '+label} value={kind} onChange={e=>{setKind(e.target.value);setPage(1);}}><option value="all">All collections</option><option value="cambridge">Cambridge</option><option value="practice">More Books & Practice</option></select><span>{filtered.length} tests</span></div>
 <div className="student-test-library">{filtered.slice((current-1)*12,current*12).map(t=><article className="student-library-test" key={t.kind+t.id}><span className="student-note">{t.collection}</span><h3>{t.title}</h3><div className="student-module-links">{t.modules.map(module=><a key={module} href={`/exam/${t.kind}/${t.id}/${module}`}>{module}<ArrowUpRight size={13}/></a>)}</div>{['listening','reading','writing'].every(m=>t.modules.includes(m))&&<a className="student-full-test" href={`/exam/${t.kind}/${t.id}/full`}>Start Full Test <ArrowUpRight size={14}/></a>}</article>)}</div>
 {!filtered.length&&<p className="student-note">No matching tests.</p>}{pages>1&&<div className="student-pagination"><span>Page {current} / {pages}</span><div><button disabled={current===1} onClick={()=>setPage(current-1)}>Previous</button><button disabled={current===pages} onClick={()=>setPage(current+1)}>Next</button></div></div>}</div>;
}
export function LearnerTestLibrary({included,free,premium}:{included:LearnerTest[];free:LearnerTest[];premium:boolean}){
 return <><section className="student-panel"><div className="student-panel-title"><h2>Your test access</h2><span>{included.length} included</span></div>{included.length?<TestCollection tests={included} label="included tests"/>:<div className="student-access-empty"><p>{premium?'Included tests will appear here when published.':'No active Premium test access.'}</p>{!premium&&<Link className="student-button secondary" href="/dashboard/subscription" prefetch={true}>View plans <ArrowUpRight size={14}/></Link>}</div>}</section>
 <details className="student-panel student-free-tests"><summary><span><strong>Free tests</strong><small>{free.length} available</small></span><ChevronDown size={18}/></summary><TestCollection tests={free} label="free tests"/></details></>;
}
