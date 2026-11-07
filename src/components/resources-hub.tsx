'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import styles from '@/components/cue-cards/cue-cards.module.css';
import hs from '@/components/resources.module.css';
export type Tile={href:string;title:string;blurb:string;stats:string[];access:string;icon:'mic'|'pen'|'words'|'check'|'book'|'note';cta:string};
const ICON:Record<Tile['icon'],React.ReactNode>={
 mic:<path d="M12 3a3 3 0 00-3 3v5a3 3 0 006 0V6a3 3 0 00-3-3zM6 11a6 6 0 0012 0M12 17v4M9 21h6" />,
 pen:<path d="M4 20l1-4L16 5l3 3L8 19l-4 1zM14 7l3 3" />,
 words:<path d="M4 6h10M4 12h16M4 18h12" />,
 check:<path d="M5 12.5l4.5 4.5L19 7M4 4h16v16H4z" />,
 book:<path d="M5 4h8a4 4 0 014 4v12a3 3 0 00-3-3H5V4zM17 8h2v12h-2" />,
 note:<path d="M6 3h9l4 4v14H6V3zM14 3v5h5M9 13h7M9 17h5" />,
};
function Icon({k}:{k:Tile['icon']}){return <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{ICON[k]}</svg>;}
type Resume={href:string;label:string;sub:string};
function readResume():Resume[]{
 const out:Resume[]=[];const get=(k:string)=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch{return null;}};
 const eb=get('jtn.ebook.v1');
 if(eb?.books){const e=Object.entries(eb.books as Record<string,{last:number;done:number[]}>).filter(([,v])=>v&&v.last>=0).sort((a,b)=>b[1].done.length-a[1].done.length)[0];if(e)out.push({href:`/resources/ebooks#${e[0]}/${e[1].last}`,label:'Continue your ebook',sub:`Chapter ${e[1].last+1}, ${e[1].done.length} chapters done`});}
 const g=get('jtn.grammar.v1');if(g&&Object.keys(g).length)out.push({href:'/grammar',label:'Grammar practice',sub:`${Object.keys(g).length} tests tried`});
 const c=get('jtn.cue.done');if(Array.isArray(c)&&c.length)out.push({href:'/resources/cue-cards',label:'Cue cards',sub:`${c.length} topics done`});
 const w=get('jtn.writing.done');if(Array.isArray(w)&&w.length)out.push({href:'/resources/writing',label:'Writing samples',sub:`${w.length} samples read`});
 return out.slice(0,3);
}
export function ResourcesHub({tiles}:{tiles:Tile[]}){
 const [resume,setResume]=useState<Resume[]>([]);
 useEffect(()=>setResume(readResume()),[]);
 return <div className={styles.page}>
  <nav className={styles.crumbs}><Link href="/" style={{color:'#c60936',fontWeight:600}}>Home</Link><span>/</span><b>Resources</b></nav>
  <section className={styles.hero} style={{marginTop:0}}>
   <span className={styles.eyebrow}>LEARNING RESOURCES</span>
   <h1>Your IELTS <em>learning toolkit</em></h1>
   <p>Speaking cue card থেকে Writing sample, Vocabulary, Grammar, ebook আর study journal। সবকিছু আমাদের নিজের লেখা, প্রতিটার একটা অংশ সবার জন্য free।</p>
  </section>
  {resume.length>0&&<><div className={styles.sectionHead}><h2>Pick up where you left off</h2></div><div className={hs.feat}>{resume.map(r=><Link key={r.label} href={r.href} className={hs.resumeLink}><b>{r.label}</b><span>{r.sub}</span></Link>)}</div></>}
  <div className={styles.sectionHead}><h2>Choose a resource</h2></div>
  <div className={hs.hubGrid}>{tiles.map(t=><Link key={t.href} href={t.href} className={hs.hubCard}>
   <span className={hs.hubIcon}><Icon k={t.icon}/></span>
   <h3>{t.title}</h3><p>{t.blurb}</p>
   <ul>{t.stats.map(s=><li key={s}>{s}</li>)}</ul>
   <span className={hs.hubFoot}><small>{t.access}</small><b>{t.cta} →</b></span></Link>)}</div>
  <section className={styles.how}>
   <div className={styles.step}><span>1</span><h3>Learn the pattern</h3><p>Cue card, Writing sample বা ebook chapter পড়ে কাঠামোটা বুঝে নাও।</p></div>
   <div className={styles.step}><span>2</span><h3>Fix the gaps</h3><p>Grammar test আর Vocabulary flashcard দিয়ে নিজের দুর্বল জায়গা ঠিক করো।</p></div>
   <div className={styles.step}><span>3</span><h3>Test yourself</h3><p>তারপর Speaking বা Writing evaluation দিয়ে আসল practice করো।</p></div>
  </section>
  <div className={styles.upsell}><div><h3>Ready to practise a full test?</h3><p>Listening, Reading, Writing আর Speaking practice এখানে।</p></div><div className={styles.row}><Link href="/recent-tests" className={styles.primary}>Recent tests</Link><Link href="/writing-evaluation" className={styles.ghost}>Writing evaluation</Link><Link href="/speaking-evaluation" className={styles.ghost}>Speaking evaluation</Link></div></div>
 </div>;
}
