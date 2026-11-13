'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,Search,RotateCcw,Layers,BookOpen,Clock3,History} from 'lucide-react';
import type {Attempt} from '@/lib/learner/data';
import {LearnerScoreCard} from './learner-score-card';
import {AttemptsList} from './learner-panels';
import type {LearnerTest} from '@/lib/learner/catalog';
function TestCollection({tests,label,attempts}:{tests:LearnerTest[];label:string;attempts:Attempt[]}){
 const [query,setQuery]=useState(''),[kind,setKind]=useState('all'),[page,setPage]=useState(1);
 const filtered=useMemo(()=>tests.filter(t=>(kind==='all'||t.kind===kind)&&(t.title+' '+t.collection).toLowerCase().includes(query.toLowerCase().trim())),[tests,query,kind]);
 const pages=Math.max(1,Math.ceil(filtered.length/12)),current=Math.min(page,pages);
 return <div className="student-library"><div className="student-library-toolbar"><label className="student-test-search"><Search size={16}/><input type="search" aria-label={'Search '+label} placeholder="Search tests or books" value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/></label><select aria-label={'Filter '+label} value={kind} onChange={e=>{setKind(e.target.value);setPage(1);}}><option value="all">All collections</option><option value="cambridge">Cambridge</option><option value="practice">More Books & Practice</option></select><span>{filtered.length} tests</span></div>
 <div className="student-test-library">{filtered.slice((current-1)*12,current*12).map(t=><article className="student-library-test" key={t.kind+t.id}><span className="student-note">{t.collection}</span><h3>{t.title}</h3><div className="student-module-links">{t.modules.map(module=><a key={module} href={`/exam/${t.kind==='practice'?'recent-tests':t.kind}/${t.id}/${module}`}>{module}{attempts.some(a=>a.complete&&a.kind===t.kind&&a.parentId===t.id&&a.modules.includes(module))?<><RotateCcw size={12}/><span>Retake</span></>:<ArrowUpRight size={13}/>}</a>)}</div>{['listening','reading','writing'].every(m=>t.modules.includes(m))&&<a className="student-full-test" href={`/exam/${t.kind==='practice'?'recent-tests':t.kind}/${t.id}/full`}>{attempts.some(a=>a.complete&&a.kind===t.kind&&a.parentId===t.id&&a.modules.length>=3)?'Retake Full Test':'Start Full Test'} <ArrowUpRight size={14}/></a>}</article>)}</div>
 {!filtered.length&&<p className="student-note">No matching tests.</p>}{pages>1&&<div className="student-pagination"><span>Page {current} / {pages}</span><div><button disabled={current===1} onClick={()=>setPage(current-1)}>Previous</button><button disabled={current===pages} onClick={()=>setPage(current+1)}>Next</button></div></div>}</div>;
}
export function LearnerTestLibrary({included,free,premium,attempts,initialTab='premium'}:{initialTab?:string;included:LearnerTest[];free:LearnerTest[];premium:boolean;attempts:Attempt[]}){
 const [tab,setTab]=useState(['premium','free','active','history'].includes(initialTab)?initialTab:'premium');
 const active=attempts.filter(a=>a.kind!=='mock'&&!a.complete&&a.available),history=attempts.filter(a=>a.kind!=='mock'&&a.complete);
 const tabs=[['premium','Premium',included.length,Layers],['free','Free tests',free.length,BookOpen],['active','In progress',active.length,Clock3],['history','History',history.length,History]] as const;
 return <><div className="study-tabs" role="tablist" aria-label="My tests">{tabs.map(([key,label,count,Icon])=><button key={key} role="tab" id={'tests-tab-'+key} aria-selected={tab===key} aria-controls={'tests-panel-'+key} tabIndex={tab===key?0:-1} onKeyDown={e=>{if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();const i=tabs.findIndex(t=>t[0]===key),n=e.key==='Home'?0:e.key==='End'?3:(i+(e.key==='ArrowRight'?1:3))%4;setTab(tabs[n][0]);document.getElementById('tests-tab-'+tabs[n][0])?.focus();}}} onClick={()=>setTab(key)}><Icon size={17}/><span>{label}</span><b>{count}</b></button>)}</div>
 <div role="tabpanel" tabIndex={0} id={'tests-panel-'+tab} aria-labelledby={'tests-tab-'+tab}>
 {tab==='premium'&&(included.length?<TestCollection tests={included} label="Premium tests" attempts={attempts}/>:<section className="study-empty"><Layers size={30}/><h2>{premium?'Your collection is being prepared':'Your Premium collection'}</h2><p>{premium?'Published tests included in your plan will appear here.':'Active Premium access brings your included tests together here.'}</p>{!premium&&<Link className="student-button" href="/dashboard/subscription">Explore plans <ArrowUpRight size={14}/></Link>}</section>)}
 {tab==='free'&&<TestCollection tests={free} label="Free tests" attempts={attempts}/>}
 {tab==='active'&&<section className="student-panel"><AttemptsList items={active} empty="Nothing in progress"/></section>}
 {tab==='history'&&(history.length?<div className="study-results-grid">{history.map(a=><LearnerScoreCard key={a.id} attempt={a} retake/>)}</div>:<section className="study-empty"><History size={30}/><h2>No results yet</h2><p>Finished tests and their scores will appear in History.</p><button className="student-button" onClick={()=>setTab('free')}>Browse free tests <ArrowUpRight size={14}/></button></section>)}
 </div></>;
}
