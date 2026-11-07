'use client';
import { useCallback, useEffect, useState, useRef } from 'react';
import { BookOpenText, Headphones, LockKeyhole, Layers3, ArrowUpRight, Check, X, Library, ListChecks, MousePointerClick, Sparkles } from 'lucide-react';
import { usePracticeSelection } from './practice-selection-provider';
import Link from 'next/link';
import {QuestionPagePreview} from './question-page-preview';
import { questionTypeLabel } from '@/lib/exam/question-types';
import { otherBooks,otherBookSeries } from '@/lib/other-books';
import Image from 'next/image';

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
 const [source,setSource]=useState(collection==='practice'?'recent-tests':collection);
 const [pickedBook,setPickedBook]=useState<string|undefined>(book);
 const [pickedSeries,setPickedSeries]=useState<string|undefined>(series);
 const scopedBook=source==='cambridge'||source==='other-books'?pickedBook:undefined;
 const scopedSeries=source==='other-books'?pickedSeries:undefined;
 const picked=selection.items.map(g=>g.key);
 const [module,setModule]=useState<ModuleChoice>('listening');
 const [selected,setSelected]=useState<string[]>([]);
 const [manual,setManual]=useState(false);
 const [count,setCount]=useState(1);
 const [catalog,setCatalog]=useState<Catalog|null>(null);
 const [questions,setQuestions]=useState<Question[]>([]);
 const [page,setPage]=useState(0),[loading,setLoading]=useState(true),[starting,setStarting]=useState(false),[error,setError]=useState('');
 const query=useCallback((p:number)=>{
   const args=new URLSearchParams({module,page:String(p),collection:source});
   if(scopedBook)args.set("book",scopedBook);if(scopedSeries)args.set("series",scopedSeries);
   if(selected.length)args.set('types',selected.join(','));
   return '/api/type-wise-question-practice?'+args;
 },[module,selected,source,scopedBook,scopedSeries]);
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
       body:JSON.stringify({collection:source,book:scopedBook,series:scopedSeries,modules:module==='all'?['listening','reading']:[module],types:selected,selectionMode:'groups',count:size}),
     });
     const data=await response.json();
     if(!response.ok)throw Error(data.error||'Unable to start this practice.');
     window.location.assign(data.url);
   }catch(e){setError(e instanceof Error?e.message:'Unable to start practice.');setStarting(false);}
 };
 const selectedQuestionCount=selection.items.reduce((n,q)=>n+q.questionCount,0);
 const enough=Boolean(catalog && catalog.free>=count);

 const pick=(item:Question,label:string)=>{if(!item.key)return;selection.toggle({key:item.key,module:item.module,questionCount:item.questionCount,sourceLabel:label.slice(0,220),number:item.number.slice(0,100),type:item.type});};
 const collections=[['all','All collections','',Library],['cambridge','Cambridge IELTS','',BookOpenText],['other-books','More Books','',Layers3],['recent-tests','Recent Tests','',Sparkles]] as const;
 const chooseSource=(key:typeof source)=>{if(key===source)return;setSource(key);setPickedBook(undefined);setPickedSeries(undefined);setSelected([]);};
 const seriesBooks=otherBooks.filter(b=>otherBookSeries.find(s=>s.slug===pickedSeries)?.name===b.series);
 const scopeLabel=source==='cambridge'?(scopedBook?`Cambridge ${scopedBook}`:'All Cambridge books'):source==='other-books'?(scopedBook?otherBooks.find(b=>b.slug===scopedBook)?.series+' · '+otherBooks.find(b=>b.slug===scopedBook)?.volume:pickedSeries?otherBookSeries.find(s=>s.slug===pickedSeries)?.name+' · all volumes':'All More Books'):source==='recent-tests'?'Recent Tests':'All collections';
 const shownSelected=questions.filter(q=>q.key&&picked.includes(q.key)).length;
 const head=(id:string,t:string,hint?:string,extra?:React.ReactNode)=><header className="tw-head"><div><h2 id={id}>{t}</h2>{hint&&<p lang="bn">{hint}</p>}</div>{extra}</header>;
 const typeCount=catalog?.types.filter(t=>t.total>0).length||0;
 return <section className="typewise-practice tw-flow" aria-label="Type Wise Question Practice">
  <section className="tw-panel" aria-labelledby="tw-src-h">
   {head('tw-src-h','Which collection?','কোন collection থেকে প্রশ্ন নেবে বেছে নাও।')}
   <div className="tw-scope-body">
    <div className="tw-seg tw-collections" role="group" aria-label="Question sources">{collections.map(([key,label,,Icon])=><button type="button" key={key} aria-pressed={source===key} onClick={()=>chooseSource(key as typeof source)}><Icon size={15}/>{label}</button>)}</div>
    {source==='cambridge'&&<div className="tw-chips" role="group" aria-label="Cambridge books">{Array.from({length:21},(_,i)=>i+1).map(n=><button type="button" key={n} className="tw-chip" aria-pressed={scopedBook===String(n)} onClick={()=>setPickedBook(scopedBook===String(n)?undefined:String(n))}><span>Cambridge {n}</span></button>)}</div>}
    {source==='other-books'&&<><div className="tw-books" role="group" aria-label="Series">{otherBookSeries.map(sr=><button type="button" key={sr.slug} className="tw-book" aria-pressed={pickedSeries===sr.slug} onClick={()=>{setPickedSeries(pickedSeries===sr.slug?undefined:sr.slug);setPickedBook(undefined);}}><Image src={sr.cover} alt="" width={44} height={60} unoptimized/><span>{sr.name}</span><span className="tw-tick" aria-hidden><Check size={13}/></span></button>)}</div>
     {pickedSeries&&seriesBooks.length>1&&<div className="tw-chips tw-volumes" role="group" aria-label="Volumes">{seriesBooks.map(b=><button type="button" key={b.slug} className="tw-chip" aria-pressed={scopedBook===b.slug} onClick={()=>setPickedBook(scopedBook===b.slug?undefined:b.slug)}>{b.volume}</button>)}</div>}</>}
    {(scopedBook||pickedSeries)&&<button type="button" className="tw-link" onClick={()=>{setPickedBook(undefined);setPickedSeries(undefined);}}>Show all books <X size={13}/></button>}
   </div>
  </section>
  <section className="tw-panel" aria-labelledby="tw-types-h">
   {head('tw-types-h','What do you want to practise?','Module বেছে এক বা একাধিক question type নাও। কিছু না বাছলে সব type আসবে।',selected.length>0&&<button type="button" className="tw-link" onClick={()=>setSelected([])}>Clear types <X size={13}/></button>)}
   <div className="tw-seg" role="group" aria-label="Choose a module">{([['listening','Listening',Headphones],['reading','Reading',BookOpenText]] as const).map(([value,label,Icon])=><button type="button" key={value} aria-pressed={module===value} onClick={()=>{setModule(value);setSelected([]);}}><Icon size={16}/>{label}</button>)}</div>
   <div className="tw-chips tw-types" aria-busy={loading} role="group" aria-label="Question types">{loading&&!catalog?Array.from({length:6},(_,i)=><span className="tw-skel" aria-hidden key={i}/>):catalog?.types.filter(t=>t.total>0).map(t=><button type="button" className="tw-chip tw-type" key={t.type} aria-pressed={selected.includes(t.type)} onClick={()=>setSelected(v=>v.includes(t.type)?v.filter(type=>type!==t.type):[...v,t.type])}>{selected.includes(t.type)&&<Check size={12} aria-hidden/>}<span>{t.label}</span><b title="Free sets">{t.free}</b>{t.premium>0&&<small title="Premium sets"><LockKeyhole size={10} aria-hidden/>{t.premium}</small>}</button>)}</div>
   {!loading&&!typeCount&&!error&&<p className="tw-note" lang="bn">এই source-এ এখনো published questions নেই। নিচের Source থেকে অন্য collection বেছে দেখো।</p>}
  </section>
  <section className="tw-panel" aria-labelledby="tw-how-h">
   {head('tw-how-h','How do you want to start?')}
   <div className="tw-modes" role="radiogroup" aria-label="Start mode">
    <button type="button" role="radio" aria-checked={!manual} className="tw-mode" onClick={()=>setManual(false)}><ListChecks size={18} aria-hidden/><strong>Pick for me</strong><span>নির্বাচিত type থেকে আমরা set বাছব।</span></button>
    <button type="button" role="radio" aria-checked={manual} className="tw-mode" onClick={()=>setManual(true)}><MousePointerClick size={18} aria-hidden/><strong>I'll choose sets</strong><span>Preview দেখে নিজে বাছো।</span></button>
   </div>
   {!manual&&<div className="tw-auto"><span id="tw-count-l">Number of question sets</span><div className="tw-stepper" role="group" aria-labelledby="tw-count-l"><button type="button" aria-label="Fewer sets" disabled={count<=1} onClick={()=>setCount(v=>Math.max(1,v-1))}>−</button><input aria-labelledby="tw-count-l" inputMode="numeric" value={count} onChange={e=>setCount(Math.max(1,Math.min(catalog?.free||1,Number(e.target.value.replace(/\D/g,''))||1)))}/><button type="button" aria-label="More sets" disabled={count>=(catalog?.free||1)} onClick={()=>setCount(v=>Math.min(catalog?.free||1,v+1))}>+</button></div><small lang="bn">{catalog?.free||0}টি free set আছে। প্রতিটি set-এ একাধিক প্রশ্ন থাকতে পারে।</small></div>}
   {manual&&<>
    <p className="tw-status" role="status">{loading?'প্রশ্নগুলো আপডেট হচ্ছে…':`${scopeLabel} · ${catalog?.total||0} sets · ${questions.length} shown${shownSelected>0?` · ${shownSelected} selected here`:''}`}</p>
    {picked.length>0&&<details className="tw-picked"><summary>{picked.length} sets selected · {selectedQuestionCount} questions <small>(সব collection মিলিয়ে)</small></summary><ul>{selection.items.map(item=><li key={item.key}><div><strong>{item.sourceLabel}</strong><span>{item.module} · Q {item.number} · {item.questionCount} questions</span></div><button type="button" aria-label={'Remove '+item.sourceLabel+', Q '+item.number} onClick={()=>selection.toggle(item)} disabled={selection.busy}><X size={16}/></button></li>)}</ul></details>}
    <div className="tw-qgrid" aria-busy={loading}>{questions.map((item,index)=>{const checked=Boolean(item.key&&picked.includes(item.key));const label=(item.sourceLabel||`Cambridge ${item.book} · Test ${item.test}`);return item.premium?<article className="tw-q is-locked" key={'locked-'+index} aria-label={label+' — Premium, locked'}><header><span className="tw-mod">{item.module}</span><span className="tw-state"><LockKeyhole size={12}/>Premium</span></header><h3>{label}</h3><p>{questionTypeLabel(item.type)} · Q {item.number}</p><div className="tw-lock"><span lang="bn">Question content locked।</span><Link href="/pricing">Explore plans ↗</Link></div></article>:<button type="button" className="tw-q" key={item.key} aria-pressed={checked} disabled={selection.busy} onClick={()=>pick(item,label)}><header><span className="tw-mod">{item.module}</span><span className="tw-state">{checked?<><Check size={12}/>Selected</>:'Select'}</span></header><h3>{label}</h3><p>{questionTypeLabel(item.type)} · Q {item.number} · {item.questionCount} questions</p><QuestionPagePreview previewKey={item.previewKey||item.key!} endpoint="/api/type-wise-question-practice"/></button>})}</div>
    {!loading&&!questions.length&&!error&&<p className="tw-note">No sets match these filters. Try another question type.</p>}
    {catalog?.hasMore&&<button type="button" className="tw-more" disabled={loading} onClick={()=>void loadMore()}>{loading?'Loading…':'Show more sets'} <ArrowUpRight size={14}/></button>}
   </>}
  </section>
  <div className="tw-bar typewise-actionbar" aria-label="Practice session controls"><div className="tw-bar-info"><strong>{manual?`${selectedQuestionCount} questions`:`${count} ${count===1?'set':'sets'} · auto-pick`}</strong><span>{manual?`${picked.length} sets selected`:(selected.length?`${selected.length} question ${selected.length===1?'type':'types'}`:'সব question type')}</span></div>{manual&&picked.length>0&&<button type="button" className="tw-link" onClick={()=>selection.clear()}>Clear</button>}<button type="button" className="tw-start" disabled={manual?!picked.length||selection.busy:starting||loading||!enough||selection.busy} onClick={()=>manual?void selection.start():void start()}>{starting||selection.busy?'Preparing…':'Start practice'}<ArrowUpRight size={17}/></button>{(error||selection.error)&&<p role="alert" className="tw-error">{error||selection.error}</p>}</div>
 </section>;
}
