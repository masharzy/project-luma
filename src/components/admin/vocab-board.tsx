'use client';
import {useCallback,useEffect,useState} from 'react';
import {Badge,Card} from './ui';
import {field,labelText,primaryButton,ghostButton,smallGhost} from './form-classes';
import {TOPICS,USES} from '@/lib/vocab-constants';
import type {AdminWord} from '@/lib/vocab-admin';
const POS=['noun','verb','adjective','adverb','preposition'];
const empty:Omit<AdminWord,'id'|'position'>&{position?:number}={word:'',pos:['noun'],tier:'core',band:7,topics:[TOPICS[0]],use:['Writing Task 2'],meaningEn:'',meaningBn:'',examples:{writing:'',speaking:''},collocations:[],wordFamily:[],synonyms:[],antonyms:[],test:{sentence:'',answer:'',distractors:['','','']},published:true};
const csv=(v:string)=>v.split(',').map(s=>s.trim()).filter(Boolean);
function Toggle({list,all,onChange}:{list:string[];all:readonly string[];onChange:(v:string[])=>void}){
 return <div className="flex flex-wrap gap-1.5">{all.map(a=>{const on=list.includes(a);return <button type="button" key={a} onClick={()=>onChange(on?list.filter(x=>x!==a):[...list,a])} className={'h-8 cursor-pointer rounded-lg border px-2.5 text-[12px] '+(on?'border-ink bg-ink text-bg':'border-line bg-transparent text-ink hover:bg-soft')}>{a}</button>;})}</div>;
}
export function VocabBoard({freeLimit}:{freeLimit:number}){
 const [items,setItems]=useState<AdminWord[]>([]),[total,setTotal]=useState(0),[all,setAll]=useState(0),[pages,setPages]=useState(1),[page,setPage]=useState(1);
 const [q,setQ]=useState(''),[tier,setTier]=useState(''),[topic,setTopic]=useState(''),[status,setStatus]=useState(''),[band,setBand]=useState('');
 const [editing,setEditing]=useState<(typeof empty&{id?:number})|null>(null),[busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[err,setErr]=useState('');
 const load=useCallback(async()=>{
  const p=new URLSearchParams({page:String(page)});if(q)p.set('q',q);if(tier)p.set('tier',tier);if(topic)p.set('topic',topic);if(status)p.set('status',status);if(band)p.set('band',band);
  const r=await fetch('/api/admin/vocab-words?'+p,{cache:'no-store'});if(!r.ok)return;
  const d=await r.json();setItems(d.items);setTotal(d.total);setAll(d.all);setPages(d.pages);
 },[page,q,tier,topic,status,band]);
 useEffect(()=>{const t=setTimeout(()=>void load(),q?250:0);return()=>clearTimeout(t);},[load,q]);
 async function save(){
  if(!editing)return;setBusy(true);setErr('');
  try{
   const {id,...body}=editing as typeof editing&{id?:number};
   const res=await fetch(id?`/api/admin/vocab-words/${id}`:'/api/admin/vocab-words',{method:id?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const d=await res.json().catch(()=>({}));if(!res.ok)throw new Error(d.error||'Could not save');
   setEditing(null);setMsg('Saved.');await load();
  }catch(e){setErr(e instanceof Error?e.message:'Could not save');}finally{setBusy(false);}
 }
 async function toggle(w:AdminWord){await fetch(`/api/admin/vocab-words/${w.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({published:!w.published})});await load();}
 async function remove(w:AdminWord){if(!confirm(`Delete "${w.word}" permanently? Later words move up by one.`))return;await fetch(`/api/admin/vocab-words/${w.id}`,{method:'DELETE'});setMsg('Deleted.');await load();}
 const set=<K extends keyof typeof empty>(k:K,v:(typeof empty)[K])=>setEditing(e=>e&&({...e,[k]:v}));
 const th='px-4 py-3 text-left text-[12px] font-medium text-muted';
 return <div className="grid gap-6">
  <Card>
   <div className="flex flex-wrap items-end gap-3">
    <label className="min-w-[180px] flex-1"><span className={labelText}>Search word or meaning</span><input className={field} value={q} onChange={e=>{setQ(e.target.value);setPage(1);}} placeholder="e.g. mitigate"/></label>
    <label><span className={labelText}>Tier</span><select className={field} value={tier} onChange={e=>{setTier(e.target.value);setPage(1);}}><option value="">All</option><option value="core">Core</option><option value="advanced">Advanced</option><option value="niche">Niche</option></select></label>
    <label><span className={labelText}>Band</span><select className={field} value={band} onChange={e=>{setBand(e.target.value);setPage(1);}}><option value="">All</option><option value="6">6</option><option value="7">7</option><option value="8">8+</option></select></label>
    <label><span className={labelText}>Topic</span><select className={field} value={topic} onChange={e=>{setTopic(e.target.value);setPage(1);}}><option value="">All</option>{TOPICS.map(t=><option key={t}>{t}</option>)}</select></label>
    <label><span className={labelText}>Status</span><select className={field} value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}><option value="">All</option><option value="published">Published</option><option value="draft">Hidden</option></select></label>
    <button className={primaryButton} onClick={()=>{setErr('');setEditing({...empty});}}>＋ Add word</button>
   </div>
   <p className="m-0 mt-3 text-[12px] text-muted">{total} of {all} words. Words at position 1–{freeLimit} are free for everyone; the rest open by plan. Change a word&apos;s position to move it in or out of the free group.</p>
   {msg&&<p role="status" className="m-0 mt-3 rounded-xl bg-ok-soft px-3 py-2 text-[12px] text-ok">{msg}</p>}
  </Card>
  <Card className="!p-0 overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[960px] border-collapse text-[13px]">
   <thead><tr className="border-b border-line"><th className={th}>#</th><th className={th}>Word</th><th className={th}>Meaning</th><th className={th}>Tier / band</th><th className={th}>Topics</th><th className={th}>Status</th><th className={th}></th></tr></thead>
   <tbody>{items.map(w=><tr key={w.id} className={'border-b border-line '+(w.position<=freeLimit?'bg-ok-soft/30':'')}>
    <td className="px-4 py-3 text-muted">{w.position}</td>
    <td className="whitespace-nowrap px-4 py-3 font-semibold text-ink">{w.word} <span className="font-normal text-muted">{w.pos.join('/')}</span></td>
    <td className="max-w-[320px] px-4 py-3 text-muted"><div className="truncate">{w.meaningEn}</div><div className="truncate">{w.meaningBn}</div></td>
    <td className="px-4 py-3"><Badge tone={w.tier==='core'?'good':w.tier==='advanced'?'info':'neutral'}>{w.tier}</Badge> <span className="text-muted">B{w.band}</span></td>
    <td className="max-w-[200px] px-4 py-3 text-muted"><div className="truncate">{w.topics.join(', ')}</div></td>
    <td className="whitespace-nowrap px-4 py-3"><button className={smallGhost} onClick={()=>void toggle(w)}>{w.published?'Published':'Hidden'}</button></td>
    <td className="whitespace-nowrap px-4 py-3"><button className={smallGhost} onClick={()=>{setErr('');setEditing({...w});}}>Edit</button> <button className={smallGhost} onClick={()=>void remove(w)}>Delete</button></td>
   </tr>)}{!items.length&&<tr><td colSpan={7} className="px-4 py-8 text-center text-muted">No words match.</td></tr>}</tbody>
  </table></div>
  <div className="flex items-center justify-between gap-3 p-4"><button className={smallGhost} disabled={page<=1} onClick={()=>setPage(page-1)}>← Previous</button><span className="text-[12px] text-muted">Page {page} of {pages}</span><button className={smallGhost} disabled={page>=pages} onClick={()=>setPage(page+1)}>Next →</button></div></Card>
  {editing&&<div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={e=>{if(e.target===e.currentTarget)setEditing(null);}}>
   <form className="h-full w-full max-w-[720px] overflow-y-auto bg-bg p-6" onSubmit={e=>{e.preventDefault();void save();}}>
    <div className="mb-5 flex items-center justify-between"><h2 className="m-0 text-[20px] font-semibold text-ink">{editing.id?'Edit word':'Add word'}</h2><button type="button" className={smallGhost} onClick={()=>setEditing(null)}>Close</button></div>
    <div className="grid gap-4">
     <div className="grid gap-3 sm:grid-cols-3">
      <label><span className={labelText}>Word</span><input className={field} required value={editing.word} onChange={e=>set('word',e.target.value.toLowerCase())}/></label>
      <label><span className={labelText}>Tier</span><select className={field} value={editing.tier} onChange={e=>set('tier',e.target.value)}><option value="core">Core</option><option value="advanced">Advanced</option><option value="niche">Niche</option></select></label>
      <label><span className={labelText}>Band</span><select className={field} value={editing.band} onChange={e=>set('band',Number(e.target.value))}><option value={6}>6</option><option value={7}>7</option><option value={8}>8+</option></select></label>
     </div>
     {editing.id&&<label><span className={labelText}>Position (1–{freeLimit} = free)</span><input className={field+' max-w-[160px]'} type="number" min={1} value={editing.position??''} onChange={e=>set('position',Number(e.target.value))}/></label>}
     <div><span className={labelText}>Part of speech</span><Toggle list={editing.pos} all={POS} onChange={v=>set('pos',v)}/></div>
     <div><span className={labelText}>Topics (1–3)</span><Toggle list={editing.topics} all={TOPICS} onChange={v=>set('topics',v)}/></div>
     <div><span className={labelText}>Best used in</span><Toggle list={editing.use} all={USES} onChange={v=>set('use',v)}/></div>
     <label><span className={labelText}>Meaning (English)</span><input className={field} required value={editing.meaningEn} onChange={e=>set('meaningEn',e.target.value)}/></label>
     <label><span className={labelText}>Meaning (বাংলা)</span><input className={field} required value={editing.meaningBn} onChange={e=>set('meaningBn',e.target.value)}/></label>
     <label><span className={labelText}>Writing example</span><textarea className={field+' h-auto py-2'} rows={2} required value={editing.examples.writing} onChange={e=>set('examples',{...editing.examples,writing:e.target.value})}/></label>
     <label><span className={labelText}>Speaking example</span><textarea className={field+' h-auto py-2'} rows={2} required value={editing.examples.speaking} onChange={e=>set('examples',{...editing.examples,speaking:e.target.value})}/></label>
     <div className="grid gap-3 sm:grid-cols-2">
      <label><span className={labelText}>Collocations (comma separated)</span><input className={field} value={editing.collocations.join(', ')} onChange={e=>set('collocations',csv(e.target.value))}/></label>
      <label><span className={labelText}>Word family</span><input className={field} value={editing.wordFamily.join(', ')} onChange={e=>set('wordFamily',csv(e.target.value))}/></label>
      <label><span className={labelText}>Synonyms</span><input className={field} value={editing.synonyms.join(', ')} onChange={e=>set('synonyms',csv(e.target.value))}/></label>
      <label><span className={labelText}>Antonyms</span><input className={field} value={editing.antonyms.join(', ')} onChange={e=>set('antonyms',csv(e.target.value))}/></label>
     </div>
     <fieldset className="grid gap-3 rounded-xl border border-line p-4"><legend className="px-1 text-[12px] font-medium text-muted">Quiz question</legend>
      <label><span className={labelText}>Sentence with one blank (_____)</span><input className={field} value={editing.test.sentence} onChange={e=>set('test',{...editing.test,sentence:e.target.value})}/></label>
      <div className="grid gap-3 sm:grid-cols-2">
       <label><span className={labelText}>Correct answer (exact form)</span><input className={field} value={editing.test.answer} onChange={e=>set('test',{...editing.test,answer:e.target.value})}/></label>
       <label><span className={labelText}>3 wrong options (comma separated)</span><input className={field} value={editing.test.distractors.join(', ')} onChange={e=>set('test',{...editing.test,distractors:csv(e.target.value)})}/></label>
      </div>
     </fieldset>
     <label className="flex items-center gap-2 text-[13px] text-ink"><input type="checkbox" checked={editing.published} onChange={e=>set('published',e.target.checked)}/> Published (visible to learners)</label>
     {err&&<p role="alert" className="m-0 rounded-xl bg-warn-soft px-3 py-2 text-[12px] text-warn">{err}</p>}
     <div className="flex gap-2"><button className={primaryButton} disabled={busy}>{busy?'Saving…':'Save word'}</button><button type="button" className={ghostButton} onClick={()=>setEditing(null)}>Cancel</button></div>
    </div>
   </form></div>}
 </div>;
}
