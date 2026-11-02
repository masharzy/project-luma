'use client';
import { useCallback, useEffect, useState, useRef } from 'react';
import { BookOpenText, Headphones, LockKeyhole, Layers3, Shuffle, ArrowUpRight, LoaderCircle, CheckCircle2, Check, X } from 'lucide-react';
import { usePracticeSelection } from './practice-selection-provider';
import Link from 'next/link';
import { questionTypeLabel } from '@/lib/exam/question-types';

type ModuleChoice='all'|'listening'|'reading';
type Kind={type:string;label:string;total:number;free:number;premium:number};
type Question={sourceLabel?:string;key?:string;module:'listening'|'reading';type:string;book:number;test:number;number:string;preview:string;premium:boolean;previewKey?:string;questionCount:number};
type Catalog={types:Kind[];items:Question[];total:number;free:number;premium:number;page:number;hasMore:boolean};

type BankProps={collection?:'all'|'cambridge'|'other-books'|'practice'|'recent-tests';book?:string;series?:string};
export function CambridgeQuestionPractice({collection='cambridge',book,series}:BankProps){
 const args=new URLSearchParams({collection:collection==='practice'?'recent-tests':collection});if(book)args.set('book',book);if(series)args.set('series',series);
 return <p className="question-practice-shortcut"><Link href={'/recent-tests?view=questions&'+args}>Type Wise Question Practice ↗</Link></p>;
}
export function QuestionPracticePanel({collection='all',book,series}:BankProps){
 const selection=usePracticeSelection();
 const picked=selection.items.map(g=>g.key);
 const [module,setModule]=useState<ModuleChoice>('listening');
 const [selected,setSelected]=useState<string[]>([]);
 const [manual,setManual]=useState(true);
 const [count,setCount]=useState(1);
 const [catalog,setCatalog]=useState<Catalog|null>(null);
 const [questions,setQuestions]=useState<Question[]>([]);
 const [page,setPage]=useState(0),[loading,setLoading]=useState(true),[starting,setStarting]=useState(false),[error,setError]=useState('');
 const query=useCallback((p:number)=>{
   const args=new URLSearchParams({module,page:String(p),collection});
   if(book)args.set("book",book);if(series)args.set("series",series);
   if(selected.length)args.set('types',selected.join(','));
   return '/api/recent-tests?view=questions&'+args;
 },[module,selected,collection,book,series]);
 const latestQuery=useRef(query(0));latestQuery.current=query(0);
 useEffect(()=>{
   let alive=true;
   setLoading(true);
   setError('');
   void (async()=>{
     try{
       const response=await fetch(query(0),{cache:'no-store'});
       const data=await response.json();
       if(!response.ok)throw Error(data.error||'Unable to load question bank.');
       if(!alive)return;
       setCatalog(data);setQuestions(data.items);setPage(0);setCount(v=>Math.min(v,Math.max(1,data.free)));
     }catch(e){if(alive){setError(e instanceof Error?e.message:'Unable to load questions.');setCatalog(null);setQuestions([]);}}
     finally{if(alive)setLoading(false);}
   })();
   return()=>{alive=false;};
 },[query]);
 const loadMore=async()=>{
   if(loading||!catalog?.hasMore)return;
   setLoading(true);const activeQuery=query(0);
   try{
     const response=await fetch(query(page+1),{cache:'no-store'});
     const data=await response.json();
     if(!response.ok)throw Error(data.error||'Unable to load more questions.');
     if(latestQuery.current!==activeQuery)return;
     setQuestions(v=>[...v,...data.items]);setPage(page+1);
     setCatalog(data);
   }catch(e){setError(e instanceof Error?e.message:'Unable to load more questions.');}
   finally{if(latestQuery.current===activeQuery)setLoading(false);}
 };
 const start=async()=>{
   const size=count;
   if(starting||loading||!catalog||size>catalog.free)return;
   setStarting(true);setError('');
   try{
     const response=await fetch('/api/type-wise-question-practice',{
       method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({collection,book,series,modules:module==='all'?['listening','reading']:[module],types:selected,selectionMode:'groups',count:size}),
     });
     const data=await response.json();
     if(!response.ok)throw Error(data.error||'Unable to start this practice.');
     window.location.assign(data.url);
   }catch(e){setError(e instanceof Error?e.message:'Unable to start practice.');setStarting(false);}
 };
 const selectedQuestionCount=selection.items.reduce((n,q)=>n+q.questionCount,0);
 const enough=Boolean(catalog && catalog.free>=count);
 const selectedTypes=catalog?.types.filter(t=>selected.includes(t.type))||[];
 const activeCollection=collection==='practice'?'recent-tests':collection;
 return <section className="typewise-practice" aria-label="Type Wise Question Practice">
  <div className="typewise-topbar"><div className="typewise-module-switch" role="group" aria-label="Choose a module">{([['listening','Listening'],['reading','Reading']] as const).map(([value,label])=><button key={value} aria-pressed={module===value} onClick={()=>{setModule(value);setSelected([]);}}>{value==='listening'?<Headphones size={19}/>:<BookOpenText size={19}/>}<span>{label}</span><small>{value==='listening'?'Listen with purpose':'Read with focus'}</small></button>)}</div><div className="typewise-modes" role="group" aria-label="Session mode"><button aria-pressed={!manual} onClick={()=>setManual(false)}>Auto-pick sets</button><button aria-pressed={manual} onClick={()=>setManual(true)}>Select questions</button></div></div>
  <nav className="typewise-sources" aria-label="Question sources">{[['all','All collections'],['cambridge','Cambridge'],['other-books','More Books'],['recent-tests','Recent Tests']].map(([key,label])=><Link key={key} href={'/recent-tests?view=questions'+(key==='all'?'':'&collection='+key)} aria-current={activeCollection===key?'page':undefined}>{label}</Link>)}{(book||series)&&<span>{book?'Book '+book:series}</span>}</nav>
  <div className="typewise-layout"><div className="typewise-main"><section className="typewise-types"><header><div><span className="typewise-kicker">01 / YOUR FOCUS</span><h2>Filter by question type</h2><p>একাধিক type বাছতে পারো। নিচের card-এ চাপলে সেটের সব প্রশ্ন select হবে।</p></div>{selected.length>0&&<button className="typewise-clear" onClick={()=>setSelected([])}>Clear types <X size={13}/></button>}</header>
   <div className="typewise-type-grid" aria-busy={loading}>{loading&&!catalog?Array.from({length:6},(_,i)=><div className="typewise-skeleton" aria-hidden="true" key={i}/>):catalog?.types.filter(t=>t.total>0).map(t=><button className="typewise-type" key={t.type} aria-pressed={selected.includes(t.type)} onClick={()=>setSelected(v=>v.includes(t.type)?v.filter(type=>type!==t.type):[...v,t.type])}><span className="typewise-check">{selected.includes(t.type)?<Check size={13}/>:<Layers3 size={15}/>}</span><strong>{t.label}</strong><span className="typewise-type-meta"><b>{t.free}</b> free sets{t.premium>0&&<small><LockKeyhole size={10}/>{t.premium} Premium</small>}</span></button>)}</div>
   {!loading&&!catalog?.types.some(t=>t.total>0)&&!error&&<p className="typewise-note">এই collection-এ এখনো published questions নেই। অন্য collection বেছে দেখো।</p>}
  </section>
  {manual&&<section className="typewise-explorer"><header><div><span className="typewise-kicker">02 / MAKE IT YOURS</span><h2>Select your questions</h2></div><span>{catalog?.total||0} sets · {questions.length} shown</span></header><div className="typewise-question-grid" aria-busy={loading}>{questions.map((item,index)=>{const checked=Boolean(item.key&&picked.includes(item.key));const capped=loading||selection.busy||(!checked&&(picked.length>=10||selectedQuestionCount+item.questionCount>40));const label=(item.sourceLabel||`Cambridge ${item.book} · Test ${item.test}`);return item.premium?<article className="typewise-question locked" key={'locked-'+index}><span className="typewise-kicker">{item.module}</span><h3>{questionTypeLabel(item.type)}</h3><p>{label} · Q {item.number}</p><div><LockKeyhole size={21}/><strong>Premium set</strong><span>Question content stays locked.</span></div><Link href="/pricing">Explore plans ↗</Link></article>:<button className="typewise-question" key={item.key} aria-pressed={checked} disabled={capped} onClick={()=>selection.toggle({key:item.key!,module:item.module,questionCount:item.questionCount,sourceLabel:label.slice(0,220),number:item.number.slice(0,100),type:item.type})}><header><span className="typewise-kicker">{item.module}</span><span className="typewise-pick-indicator">{checked?<span>✓ Selected</span>:<span>Select</span>}</span></header><h3>{questionTypeLabel(item.type)}</h3><p>{label}</p><blockquote>{item.preview||'Open this set in your session to answer the complete question group.'}</blockquote><footer><span>Q {item.number}</span><strong>{item.questionCount} questions</strong></footer></button>})}</div>{!loading&&!questions.length&&!error&&<p className="typewise-note">No sets match these filters. Try another question type.</p>}{catalog?.hasMore&&<button className="typewise-more" disabled={loading} onClick={()=>void loadMore()}>{loading?'Loading…':'Show more sets'} <ArrowUpRight size={14}/></button>}</section>}
  </div><aside className="typewise-session" id="typewise-session"><span className="typewise-kicker">YOUR NEXT SESSION</span><div className="typewise-session-icon">{manual?<CheckCircle2 size={25}/>:<Shuffle size={25}/>}</div><h2>{manual?'Selected questions':'A little focus goes a long way.'}</h2><p>{manual?'Card-এ আবার চাপলে selection উঠে যাবে।':'Question type বেছে ছোট একটা session দিয়ে শুরু করো।'}</p><dl><div><dt>Module</dt><dd>{manual?[...new Set(selection.items.map(i=>i.module))].join(' + ')||'Not selected':module}</dd></div><div><dt>Question types</dt><dd>{manual?new Set(selection.items.map(i=>i.type)).size||'—':selected.length||'All'}</dd></div><div><dt>Available free sets</dt><dd>{loading?'…':catalog?.free||0}</dd></div></dl>
   {!manual?<label className="typewise-size">Question sets<div><button aria-label="Fewer question sets" disabled={count<=1||starting} onClick={()=>setCount(v=>Math.max(1,v-1))}>−</button><input aria-label="Number of question sets" type="number" min={1} max={Math.min(10,catalog?.free||1)} value={count} onChange={e=>setCount(Math.max(1,Math.min(10,catalog?.free||1,Number(e.target.value)||1)))}/><button aria-label="More question sets" disabled={count>=Math.min(10,catalog?.free||1)||starting} onClick={()=>setCount(v=>v+1)}>+</button></div></label>:<div className="typewise-selected-count"><strong>{picked.length}</strong><span>sets selected<small>{selectedQuestionCount} / 40 questions</small></span>{picked.length>0&&<button className="typewise-clear" onClick={selection.clear}>Clear</button>}</div>}
   {manual&&selection.items.length>0&&<ul className="typewise-selection-list">{selection.items.map(item=><li key={item.key}><div><strong>{item.sourceLabel}</strong><span>{item.module} · Q {item.number} · {item.questionCount} questions</span></div><button aria-label={'Remove '+item.sourceLabel+', Q '+item.number} onClick={()=>selection.toggle(item)} disabled={selection.busy}><X size={14}/></button></li>)}</ul>}
   {selectedTypes.length>0&&<div className="typewise-chosen-types">{selectedTypes.map(t=><button key={t.type} onClick={()=>setSelected(v=>v.filter(type=>type!==t.type))}>{t.label}<X size={11}/></button>)}</div>}
   <button className="typewise-start" disabled={manual?!picked.length||selection.busy:starting||loading||!enough||selection.busy} onClick={()=>manual?void selection.start():void start()}>{starting||selection.busy?<LoaderCircle size={16} className="type-spin"/>:null}{starting||selection.busy?'Preparing…':'Start practice'}<ArrowUpRight size={17}/></button>
   <small>একই passage/audio-এর প্রশ্নগুলো একসঙ্গে select হয়। সর্বোচ্চ ১০ সেট / ৪০ প্রশ্ন।</small>{!loading&&!manual&&!enough&&<p className="typewise-note">এই filters-এ free sets পাওয়া যাচ্ছে না। অন্য type বেছে নাও।</p>}
   {(error||selection.error)&&<p className="typewise-error" role="alert">{error||selection.error}</p>}
  </aside></div>
 </section>;
}
