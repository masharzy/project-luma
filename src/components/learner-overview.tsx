import Link from 'next/link';
import {ArrowUpRight,ArrowRight,PenLine,Headphones,BookOpen,Layers,CalendarDays,Mic,BookText} from 'lucide-react';
import {AttemptsList} from "./learner-panels";
import {StudyGoals} from "./learner-preferences";
import type {learnerData,evaluationHistory} from "@/lib/learner/data";
type Data=Awaited<ReturnType<typeof learnerData>>;type History=Awaited<ReturnType<typeof evaluationHistory>>;
const half=(n:number)=>Math.round(n*2)/2;
function latestBands(data:Data,history:History){
 const from=(m:string)=>{for(const a of data.attempts){const r=a.results.find(x=>x.module===m&&x.bandScore!==null&&x.bandScore!==undefined);if(r)return Number(r.bandScore);}return null;};
 return {Listening:from('listening'),Reading:from('reading'),Writing:history.writing.find(e=>e.band!==null)?.band??from('writing'),Speaking:history.speaking.find(e=>e.band!==null)?.band??null} as Record<string,number|null>;
}
function Stairs({band,target}:{band:number|null;target:number}){
 const steps=[4,5,6,7,8,9],w=76,gap=6,base=292,h=(i:number)=>46+i*40;
 const reached=band===null?-1:steps.filter(s=>s<=band).length-1;
 const tIdx=Math.max(0,Math.min(5,steps.filter(s=>s<=target).length-1));
 return <svg className="dv-stairs" viewBox="0 0 520 320" role="img" aria-label={band===null?`Target band ${target}`:`Current band ${band}, target ${target}`}>
  {steps.map((s,i)=>{const x=i*(w+gap)+8,y=base-h(i);return <g key={s} className={i<=reached?'is-on':''}><rect className="dv-step" x={x} y={y} width={w} height={h(i)}/><text x={x+w/2} y={base-12} textAnchor="middle" className="dv-step-n">{s}</text></g>;})}
  {reached>=0&&<circle className="dv-you" cx={reached*(w+gap)+8+w/2} cy={base-h(reached)-14} r="8"/>}
  <g className="dv-flag" transform={`translate(${tIdx*(w+gap)+8+w/2} ${base-h(tIdx)-28})`}><line y2="26"/><path d="M0 0h34l-8 8 8 8H0z"/></g>
 </svg>;
}
export function LearnerOverview({firstName,data,history}:{firstName:string;data:Data;history:History}){
 const bands=latestBands(data,history),known=Object.values(bands).filter((v):v is number=>v!==null),overall=known.length?half(known.reduce((a,b)=>a+b,0)/known.length):null;
 const target=data.goals.targetBand,weekly=data.counts.weekly,weeklyTarget=Math.min(data.goals.weeklyTarget,12);
 const days=data.goals.examDate?Math.ceil((new Date(data.goals.examDate+'T00:00:00+06:00').getTime()-Date.now())/86400000):null;
 const open=data.attempts.find(a=>!a.complete&&a.available);
 const recent=[...history.writing.map(e=>({...e,skill:'Writing'})),...history.speaking.map(e=>({...e,skill:'Speaking'}))].sort((a,b)=>new Date(String(b.created_at)).getTime()-new Date(String(a.created_at)).getTime()).slice(0,4);
 const skills:[string,string,typeof BookOpen][]=[['Listening','/dashboard/my-tests',Headphones],['Reading','/dashboard/my-tests',BookText],['Writing','/dashboard/writing',PenLine],['Speaking','/dashboard/speaking',Mic]];
 return <>
 <section className="dv-hero">
  <div className="dv-hero-copy">
   <span className="student-eyebrow">{new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',timeZone:'Asia/Dhaka'}).format(new Date())}</span>
   <h1><span>Welcome back,</span><b>{firstName}</b></h1>
   <div className="dv-hero-cta">
    <Link className="student-button" href={open?'/exam/attempt/'+open.id:'/dashboard/my-tests'} prefetch={true}>{open?'Resume test':'Start a test'} <ArrowRight size={17}/></Link>
    {open&&<span className="dv-hero-sub">{open.title}</span>}
   </div>
   <dl className="dv-facts">
    <div><dt>Overall band</dt><dd>{overall??'—'}<small>/ {target}</small></dd></div>
    <div><dt>Exam in</dt><dd>{days!==null&&days>=0?days:'—'}<small>{days!==null&&days>=0?'days':''}</small></dd></div>
    <div><dt>This week</dt><dd>{weekly}<small>/ {weeklyTarget}</small></dd><div className="dv-dots" aria-hidden="true">{Array.from({length:weeklyTarget},(_,i)=><i key={i} className={i<weekly?'on':''}/>)}</div></div>
   </dl>
  </div>
  <div className="dv-hero-art"><Stairs band={overall} target={target}/></div>
 </section>
 <section aria-label="Band by skill"><div className="dv-skills">{skills.map(([name,href,Icon])=>{const v=bands[name];return <Link key={name} href={href} className="dv-skill"><div className="dv-skill-top"><Icon size={18}/><span>{name}</span><ArrowUpRight size={16}/></div><strong>{v??'—'}</strong><svg className="dv-bar" viewBox="0 0 100 4" preserveAspectRatio="none" aria-hidden="true"><rect className="dv-bar-bg" width="100" height="4"/><rect className="dv-bar-fill" width={v?Math.min(100,v/9*100):0} height="4"/><rect className="dv-bar-tick" x={target/9*100-.6} y="-3" width="1.2" height="10"/></svg><small>{v===null?'No score yet':v>=target?'Target reached':`${(target-v).toFixed(1)} to target`}</small></Link>})}</div></section>
 <div className="student-split"><section className="student-panel"><div className="student-panel-title"><h2>Continue learning</h2><Link href="/dashboard/my-tests">My tests ↗</Link></div><AttemptsList items={data.attempts.filter(a=>!a.complete&&a.available).slice(0,3)} empty="Ready for your next test?"/></section>
 <section className="student-panel"><div className="student-panel-title"><h2>Recent feedback</h2><Link href="/dashboard/writing?view=feedback">All ↗</Link></div>{recent.length?recent.map(e=><Link className="student-list-row" href={e.skill==='Speaking'?'/speaking-evaluation/results/'+e.id:'/dashboard/writing?view=feedback#writing-'+e.id} key={e.skill+String(e.id)}><span>{e.skill}</span><span className="student-tag">{e.band!==null?'Band '+e.band:String(e.status)}</span><ArrowUpRight size={16}/></Link>):<p className="student-note">Evaluation শেষ হলে এখানে feedback পাবে।</p>}</section></div>
 <div className="dv-quick">{[['Writing','/dashboard/writing',PenLine],['Speaking','/dashboard/speaking',Headphones],['Mock exams','/dashboard/mocks',CalendarDays],['Saved resources','/dashboard/saved',Layers],['Test library','/dashboard/my-tests',BookOpen]].map(([t,h,I])=>{const Ic=I as typeof BookOpen;return <Link key={String(h)} href={String(h)} prefetch={true}><Ic size={20}/><span>{String(t)}</span><ArrowUpRight size={15}/></Link>})}</div>
 <StudyGoals initial={data.goals} weekly={weekly}/>
 </>;
}
