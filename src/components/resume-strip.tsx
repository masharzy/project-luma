'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import styles from '@/components/cue-cards/cue-cards.module.css';
import hs from '@/components/resources.module.css';
type Resume={href:string;label:string;sub:string};
function readResume():Resume[]{
 const out:Resume[]=[];const get=(k:string)=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch{return null;}};
 const eb=get('jtn.ebook.v1');
 if(eb?.books){const e=Object.entries(eb.books as Record<string,{last:number;done:number[]}>).filter(([,v])=>v&&v.last>=0).sort((a,b)=>b[1].done.length-a[1].done.length)[0];if(e)out.push({href:`/resources/ebooks#${e[0]}/${e[1].last}`,label:'Continue your ebook',sub:`Chapter ${e[1].last+1}, ${e[1].done.length} chapters done`});}
 const g=get('jtn.grammar.v1');if(g&&Object.keys(g).length)out.push({href:'/grammar',label:'Grammar practice',sub:`${Object.keys(g).length} tests tried`});
 const c=get('jtn.cue.done');if(Array.isArray(c)&&c.length)out.push({href:'/resources/cue-cards',label:'Cue cards',sub:`${c.length} topics done`});
 const w=get('jtn.writing.done');if(Array.isArray(w)&&w.length)out.push({href:'/resources/writing',label:'Writing samples',sub:`${w.length} samples read`});
 return out.slice(0,4);
}
export function ResumeStrip(){
 const [r,setR]=useState<Resume[]>([]);
 useEffect(()=>setR(readResume()),[]);
 if(!r.length)return null;
 return <section className={hs.resumeWrap}><span className={styles.eyebrow}>PICK UP WHERE YOU LEFT OFF</span><div className={hs.resumeRow}>{r.map(x=><Link key={x.label} href={x.href} className={hs.resumeLink}><b>{x.label}</b><span>{x.sub}</span></Link>)}</div></section>;
}
