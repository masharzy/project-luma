'use client';
import Link from 'next/link';
import {Fragment,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import type {Book} from '@/lib/ebooks';
import {parseBody} from '@/lib/mdlite';
import styles from '@/components/cue-cards/cue-cards.module.css';
import es from '@/components/resources.module.css';
const KEY='jtn.ebook.v1';
const COVERS=['#c60936','#2f4b7c','#2f7d6d','#7a5ea8','#b5651d','#211e25'];
type Hl={ch:number;b:number;text:string;note:string};
type BookState={last:number;done:number[];marks:number[];hl:Hl[]};
type Store={theme:'light'|'sepia'|'dark';size:number;serif:boolean;books:Record<string,BookState>};
const blank:Store={theme:'light',size:18,serif:true,books:{}};
const bs=(s:Store,slug:string):BookState=>s.books[slug]||{last:-1,done:[],marks:[],hl:[]};
function Lock(){return <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden><rect x="4" y="9" width="12" height="8" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M7 9V6.5a3 3 0 016 0V9" fill="none" stroke="currentColor" strokeWidth="1.8"/></svg>;}
function Check(){return <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden><path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>;}
const mins=(w:number)=>Math.max(1,Math.round(w/200));
function Marked({text,hls,onNote}:{text:string;hls:Hl[];onNote:(h:Hl)=>void}){
 const spans:{s:number;e:number;h:Hl}[]=[];
 hls.forEach(h=>{const s=text.indexOf(h.text);if(s>=0&&!spans.some(x=>s<x.e&&s+h.text.length>x.s))spans.push({s,e:s+h.text.length,h});});
 spans.sort((a,b)=>a.s-b.s);
 const out:React.ReactNode[]=[];let at=0;
 spans.forEach((x,i)=>{out.push(<Fragment key={'t'+i}>{text.slice(at,x.s)}</Fragment>);out.push(<mark key={'m'+i} className={`${es.hl} ${x.h.note?es.hlNote:''}`} title={x.h.note||'Highlight'} onClick={()=>onNote(x.h)}>{text.slice(x.s,x.e)}</mark>);at=x.e;});
 out.push(<Fragment key="end">{text.slice(at)}</Fragment>);
 return <>{out}</>;
}
function Reader({book,ci,store,update,go,exit}:{book:Book;ci:number;store:Store;update:(f:(s:Store)=>Store)=>void;go:(i:number)=>void;exit:()=>void}){
 const ch=book.chapters[ci],st=bs(store,book.slug);
 const [panel,setPanel]=useState<''|'marks'|'notes'|'search'>(''),[showSet,setShowSet]=useState(false),[pct,setPct]=useState(0),[q,setQ]=useState(''),[sel,setSel]=useState<{x:number;y:number;b:number;text:string}|null>(null);
 const ref=useRef<HTMLElement>(null);
 const set=(f:(b:BookState)=>BookState)=>update(s=>({...s,books:{...s.books,[book.slug]:f(bs(s,book.slug))}}));
 useEffect(()=>{set(b=>({...b,last:ci}));window.scrollTo({top:0});setSel(null);/* eslint-disable-next-line */},[ci,book.slug]);
 useEffect(()=>{const f=()=>{const el=ref.current;if(!el)return;const r=el.getBoundingClientRect(),h=r.height-innerHeight;setPct(h<=0?100:Math.min(100,Math.max(0,-r.top/h*100)));};f();addEventListener('scroll',f,{passive:true});return()=>removeEventListener('scroll',f);},[ci]);
 const blocks=useMemo(()=>ch.body?parseBody(ch.body):[],[ch.body]);
 const myHl=st.hl.filter(h=>h.ch===ci);
 const onUp=()=>{const s=getSelection();if(!s||s.isCollapsed){setSel(null);return;}const text=s.toString().trim();if(text.length<3||text.length>400){setSel(null);return;}
  let n:Node|null=s.anchorNode;while(n&&!(n instanceof HTMLElement&&n.dataset.b))n=n.parentNode;
  if(!n)return setSel(null);const b=Number((n as HTMLElement).dataset.b),raw=blocks[b]?.text||(blocks[b]?.items||[]).join(' ');
  if(!raw.includes(text)||blocks[b].t==='ul')return setSel(null);
  const r=s.getRangeAt(0).getBoundingClientRect();setSel({x:Math.max(8,r.left+r.width/2-70),y:Math.max(8,r.top-48),b,text});};
 const addHl=(note:boolean)=>{if(!sel)return;const nt=note?(prompt('Your note')||''):'';if(note&&!nt){return;}set(b=>({...b,hl:[...b.hl,{ch:ci,b:sel.b,text:sel.text,note:nt}]}));setSel(null);getSelection()?.removeAllRanges();};
 const editHl=(h:Hl)=>{const act=prompt(h.note?`Note: ${h.note}\n\nType a new note, or leave empty and press OK to remove this highlight.`:'Leave empty and press OK to remove this highlight, or type a note.',h.note);if(act===null)return;set(b=>({...b,hl:act?b.hl.map(x=>x===h?{...x,note:act}:x):b.hl.filter(x=>x!==h)}));};
 const marked=st.marks.includes(ci);
 const results=useMemo(()=>{const n=q.trim().toLowerCase();if(n.length<3)return[];const r:{ci:number;t:string}[]=[];book.chapters.forEach((c,i)=>{if(!c.body)return;const l=c.body.toLowerCase();let at=l.indexOf(n),k=0;while(at>=0&&k<3){r.push({ci:i,t:'…'+c.body!.slice(Math.max(0,at-40),at+80).replace(/\s+/g,' ')+'…'});at=l.indexOf(n,at+n.length);k++;}});return r.slice(0,30);},[q,book]);
 const fontStyle={fontSize:store.size,fontFamily:store.serif?'Georgia,"Noto Serif",serif':'inherit'};
 const complete=()=>set(b=>({...b,done:b.done.includes(ci)?b.done.filter(x=>x!==ci):[...b.done,ci]}));
 return <div className={es.reader} data-theme={store.theme} onMouseUp={onUp} onKeyUp={onUp}>
  <div className={es.rBar}>
   <button onClick={exit}>Contents</button>
   <span className={es.rTitle}>{book.title} · Chapter {ci+1} of {book.chapters.length}</span>
   <button aria-pressed={marked} onClick={()=>set(b=>({...b,marks:marked?b.marks.filter(x=>x!==ci):[...b.marks,ci]}))}>{marked?'Bookmarked':'Bookmark'}</button>
   <button aria-pressed={panel==='notes'} onClick={()=>setPanel(panel==='notes'?'':'notes')}>Notes {st.hl.length?`(${st.hl.length})`:''}</button>
   <button aria-pressed={panel==='search'} onClick={()=>setPanel(panel==='search'?'':'search')}>Search</button>
   <button aria-pressed={showSet} onClick={()=>setShowSet(!showSet)}>Aa</button>
  </div>
  <div className={es.prog}><i style={{width:`${pct}%`}}/></div>
  {showSet&&<div className={es.settings}>
   <span>Size</span><button onClick={()=>update(s=>({...s,size:Math.max(14,s.size-1)}))}>A−</button><b>{store.size}</b><button onClick={()=>update(s=>({...s,size:Math.min(26,s.size+1)}))}>A+</button>
   <span>Theme</span>{(['light','sepia','dark'] as const).map(t=><button key={t} aria-pressed={store.theme===t} onClick={()=>update(s=>({...s,theme:t}))}>{t}</button>)}
   <span>Font</span><button aria-pressed={store.serif} onClick={()=>update(s=>({...s,serif:true}))}>Serif</button><button aria-pressed={!store.serif} onClick={()=>update(s=>({...s,serif:false}))}>Sans</button>
  </div>}
  <div className={`${es.rBody} ${panel?es.withPanel:''}`}>
   <article ref={ref} className={es.article} style={{...fontStyle,maxWidth:760}}>
    <h1>{ch.title}</h1><div className={es.chMeta}>{mins(ch.words)} min read · {book.title}</div>
    {ch.locked||!ch.body?<div className={styles.lockPanel} style={{margin:'20px 0'}}><Lock/><h2>Chapter locked</h2><p>এই chapter plan-এর সাথে খোলে। প্রতিটা বইয়ের প্রথম ২টা chapter free।</p><div className={styles.row}><Link href="/pricing" className={styles.primary}>See plans</Link></div></div>
    :<>{blocks.map((b,k)=>{
      if(b.t==='h')return <h2 key={k}>{b.text}</h2>;
      if(b.t==='ul')return <ul key={k}>{b.items!.map(i=><li key={i}>{i}</li>)}</ul>;
      const inner=<Marked text={b.text!} hls={myHl.filter(h=>h.b===k)} onNote={editHl}/>;
      if(b.t==='tip'||b.t==='ex')return <div key={k} className={es.callout}><b>{b.t==='tip'?'Tip':'Example'}</b><p data-b={k}>{inner}</p></div>;
      return <p key={k} data-b={k}>{inner}</p>;})}
     {ch.takeaways&&<div className={es.take}><h3>Key takeaways</h3><ul>{ch.takeaways.map(t=><li key={t}>{t}</li>)}</ul></div>}
     {ch.exercise&&<div className={es.callout}><b>Try it</b><p>{ch.exercise}</p></div>}
     <div className={es.nextRow}><button className={st.done.includes(ci)?styles.doneOn:styles.doneBtn} onClick={complete}>{st.done.includes(ci)&&<Check/>}{st.done.includes(ci)?'Chapter completed':'Mark chapter complete'}</button>
      <div className={styles.row}>{ci>0&&<button className={styles.ghost} onClick={()=>go(ci-1)}>Previous</button>}{ci<book.chapters.length-1&&<button className={styles.primary} onClick={()=>{if(!st.done.includes(ci))complete();go(ci+1);}}>Next chapter</button>}</div></div></>}
   </article>
   {panel&&<aside className={es.panel}>
    {panel==='notes'&&<><h4>Highlights and notes</h4>{!st.hl.length&&<small>Select any text in a chapter, then choose Highlight or Add note.</small>}
     {st.hl.map((h,i)=><button key={i} className="item" onClick={()=>go(h.ch)}><b>Ch. {h.ch+1}</b> {h.text.slice(0,110)}{h.note&&<><br/><small>Note: {h.note}</small></>}</button>)}
     <h4>Bookmarks</h4>{!st.marks.length&&<small>No bookmarks yet.</small>}
     {st.marks.slice().sort((a,b)=>a-b).map(m=><button key={m} className="item" onClick={()=>go(m)}>Ch. {m+1}: {book.chapters[m].title}</button>)}</>}
    {panel==='search'&&<><h4>Search this book</h4><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Type at least 3 letters" aria-label="Search in book"/>{q.length>=3&&!results.length&&<small>No matches in unlocked chapters.</small>}
     {results.map((r,i)=><button key={i} className="item" onClick={()=>go(r.ci)}><b>Ch. {r.ci+1}</b> {r.t}</button>)}</>}
   </aside>}
  </div>
  {sel&&<div className={es.floatBtn} style={{left:sel.x,top:sel.y}} onMouseDown={e=>e.preventDefault()}><button onClick={()=>addHl(false)}>Highlight</button><button onClick={()=>addHl(true)}>Add note</button></div>}
 </div>;
}
export function EbookApp({books}:{books:Book[]}){
 const [route,setRoute]=useState({slug:'',ch:-1}),[store,setStore]=useState<Store>(blank),[ready,setReady]=useState(false),[skill,setSkill]=useState('');
 const parse=useCallback(()=>{const [s,c]=decodeURIComponent(location.hash.slice(1)).split('/');const ok=books.some(b=>b.slug===s);setRoute({slug:ok?s:'',ch:ok&&c!==undefined?Number(c):-1});},[books]);
 useEffect(()=>{parse();addEventListener('hashchange',parse);try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(v&&typeof v==='object')setStore({...blank,...v});}catch{}setReady(true);return()=>removeEventListener('hashchange',parse);},[parse]);
 const update=useCallback((f:(s:Store)=>Store)=>setStore(s=>{const n=f(s);try{localStorage.setItem(KEY,JSON.stringify(n));}catch{}return n;}),[]);
 const nav=(slug='',ch=-1)=>{location.hash=slug?`${slug}${ch>=0?'/'+ch:''}`:'';if(!slug)history.replaceState(null,'',location.pathname);parse();window.scrollTo({top:0});};
 const book=books.find(b=>b.slug===route.slug);
 const skills=[...new Set(books.map(b=>b.skill))];
 const pctOf=(b:Book)=>Math.round(bs(store,b.slug).done.filter(i=>i<b.chapters.length).length/b.chapters.length*100);
 if(book&&route.ch>=0&&book.chapters[route.ch])return <div className={styles.page}><nav className={styles.crumbs}><button onClick={()=>nav()}>Ebook shelf</button><span>/</span><button onClick={()=>nav(book.slug)}>{book.title}</button></nav>
  <Reader book={book} ci={route.ch} store={store} update={update} go={i=>nav(book.slug,i)} exit={()=>nav(book.slug)}/></div>;
 if(book){
  const st=bs(store,book.slug),i=books.indexOf(book),start=st.last>=0?st.last:0;
  return <div className={styles.page}>
   <nav className={styles.crumbs}><button onClick={()=>nav()}>Ebook shelf</button><span>/</span><b>{book.title}</b></nav>
   <div className={es.bookHead}>
    <div className={es.cover} style={{background:COVERS[i%COVERS.length]}}><small>{book.skill}</small><b>{book.title}</b><span>{book.level}</span></div>
    <div><span className={styles.eyebrow}>{book.skill.toUpperCase()} · {book.level.toUpperCase()}</span><h1 style={{margin:'8px 0',fontSize:'clamp(26px,3.6vw,38px)',letterSpacing:'-.02em'}}>{book.title}</h1>
     <p style={{margin:'0 0 8px',fontSize:18,color:'#4a4249'}}>{book.subtitle}</p><p style={{margin:'0 0 12px',lineHeight:1.7}}>{book.description}</p>
     <div className={es.chips2}><span>{book.chapters.length} chapters</span><span>{mins(book.chapters.reduce((t,c)=>t+c.words,0))} min total</span><span>{book.audience}</span></div>
     <div className={styles.row} style={{marginTop:14}}><button className={styles.primary} onClick={()=>nav(book.slug,start)}>{st.last>=0?'Continue reading':'Start reading'}</button><span style={{fontSize:13,color:'#4a4249'}}>{pctOf(book)}% complete</span></div></div>
   </div>
   <div className={es.toc}>{book.chapters.map((c,k)=><button key={k} className={es.tocItem} onClick={()=>nav(book.slug,k)}>
    <span className={`${styles.num} ${st.done.includes(k)?styles.numDone:''}`}>{st.done.includes(k)?<Check/>:k+1}</span>
    <span className={es.t}><b>{c.title}</b><small>{c.summary} · {mins(c.words)} min</small></span>{c.locked&&<Lock/>}{st.marks.includes(k)&&<small>Bookmarked</small>}</button>)}</div>
   {book.chapters.some(c=>c.locked)&&<div className={styles.upsell}><div><h3>পুরো বই পড়ো</h3><p>প্রতিটা বইয়ের প্রথম ২টা chapter free। Plan নিলে সব chapter, notes আর bookmark খুলে যায়।</p></div><Link href="/pricing" className={styles.primary}>See plans</Link></div>}
  </div>;
 }
 const cont=ready?books.filter(b=>bs(store,b.slug).last>=0):[];
 const shown=skill?books.filter(b=>b.skill===skill):books;
 return <div className={styles.page}>
  <section className={styles.hero}>
   <span className={styles.eyebrow}>THE EBOOK SHELF</span>
   <h1>IELTS ebooks, <em>read right here</em></h1>
   <p>আমাদের নিজের লেখা {books.length}টা বই, সরাসরি browser-এ পড়ো। Highlight করো, note লেখো, bookmark রাখো, আর কোথায় থেমেছিলে সেখান থেকে আবার শুরু করো। কিছু download করতে হয় না।</p>
   <ul className={styles.stats}><li><b>{books.length}</b>ebooks</li><li><b>{books.reduce((t,b)=>t+b.chapters.length,0)}</b>chapters</li><li><b>{books.reduce((t,b)=>t+b.chapters.filter(c=>!c.locked).length,0)}</b>free chapters</li></ul>
   <div className={es.chips2}>{['Highlights and notes','Bookmarks','Search in book','Light, sepia and dark','Resume where you stopped'].map(f=><span key={f}>{f}</span>)}</div>
  </section>
  {cont.length>0&&<><div className={styles.sectionHead}><h2>Continue reading</h2></div><div className={es.shelf} style={{marginBottom:28}}>{cont.map(b=><button key={b.slug} className={es.book} onClick={()=>nav(b.slug,bs(store,b.slug).last)}><div className={es.cover} style={{background:COVERS[books.indexOf(b)%COVERS.length]}}><small>{b.skill}</small><b>{b.title}</b><span>{pctOf(b)}% complete</span></div></button>)}</div></>}
  <div className={es.chips2} style={{marginBottom:14}}><button className={skill?'':styles.doneOn} style={{border:'1.5px solid #e7e0e2',borderRadius:999,padding:'7px 14px',background:skill?'#fff':undefined,cursor:'pointer',fontWeight:600}} onClick={()=>setSkill('')}>All</button>{skills.map(s=><button key={s} className={skill===s?styles.doneOn:''} style={{border:'1.5px solid #e7e0e2',borderRadius:999,padding:'7px 14px',background:skill===s?undefined:'#fff',cursor:'pointer',fontWeight:600}} onClick={()=>setSkill(s)}>{s}</button>)}</div>
  <div className={es.shelf}>{shown.map(b=><button key={b.slug} className={es.book} onClick={()=>nav(b.slug)}>
   <div className={es.cover} style={{background:COVERS[books.indexOf(b)%COVERS.length]}}><small>{b.skill}</small><b>{b.title}</b><span>{b.level}</span></div>
   <div className={es.bookMeta}><b>{b.title}</b><small>{b.subtitle}</small><small>{b.chapters.length} chapters · {b.chapters.filter(c=>!c.locked).length} free{ready&&pctOf(b)?` · ${pctOf(b)}% done`:''}</small></div></button>)}</div>
 </div>;
}
