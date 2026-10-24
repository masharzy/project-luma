'use client';
import { useState } from 'react';
import type { SpeakingSet } from '@/lib/speaking/schema';
export function SpeakingEditor({kind,id,initial,published}:{kind:string;id:string;initial:SpeakingSet|null;published:boolean}){
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);

 return <form onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage('');const f=new FormData(e.currentTarget);const lines=(key:string)=>String(f.get(key)||'').split('\n').map(v=>v.trim()).filter(Boolean);try{const r=await fetch('/api/admin/speaking',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,id,published:f.get('published')==='on',document:{part1:lines('part1'),cueCard:{topic:f.get('topic'),points:lines('points'),explain:f.get('explain')},rounding:lines('rounding'),part3:lines('part3')}})});const d=await r.json();setMessage(r.ok?'Speaking questions saved.':d.error||'Unable to save')}catch{setMessage('Connection failed. Please retry.')}finally{setBusy(false)}}} className="speaking-editor">
 <label>Part 1 questions — one per line<textarea required name="part1" rows={7} defaultValue={initial?.part1.join('\n')}/></label>
 <label>Part 2 cue-card topic<input required name="topic" defaultValue={initial?.cueCard.topic}/></label>
 <label>Cue-card points — one per line<textarea required name="points" rows={4} defaultValue={initial?.cueCard.points.join('\n')}/></label>
 <label>Explain prompt<input required name="explain" defaultValue={initial?.cueCard.explain}/></label>
 <label>Rounding-off questions — one per line<textarea name="rounding" rows={3} defaultValue={initial?.rounding.join('\n')}/></label>
 <label>Part 3 questions — one per line<textarea required name="part3" rows={6} defaultValue={initial?.part3.join('\n')}/></label>
 <label><input type="checkbox" name="published" defaultChecked={published}/> Publish speaking module</label>
 <button type="submit" disabled={busy}>{busy?'Saving…':'Save speaking questions'}</button><p role="status">{message}</p>
 </form>
}
