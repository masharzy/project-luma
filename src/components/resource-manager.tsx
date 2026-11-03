"use client";
import {useCallback,useEffect,useState,type FormEvent} from "react";
import {AdminModal} from "./admin-modal";
import {BookOpen,Search,Plus,Pencil,Trash2} from "lucide-react";
type Item={id:string;title:string;category:string;body:string;source_url:string|null;access:string;status:string;updated_at:string};
const categories:Record<string,string>={writing:"Writing Samples",ebook:"Ebooks",journal:"Study journal",grammar:"Grammar"};
const empty=()=>({title:"",category:"writing",body:"",sourceUrl:"",access:"free",status:"draft"});
export function ResourceManager(){
 const [open,setOpen]=useState(false);
 const [items,setItems]=useState<Item[]>([]),[form,setForm]=useState(empty),[editing,setEditing]=useState<string|null>(null);
 const [query,setQuery]=useState(""),[category,setCategory]=useState("all"),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 const refresh=useCallback(async()=>{const r=await fetch("/api/admin/resources",{cache:"no-store"});const d=await r.json();if(!r.ok)throw Error(d.error||"Cannot load resources");setItems(d.items);},[]);
 useEffect(()=>{void refresh().catch(e=>setError(e.message));},[refresh]);
 async function save(e:FormEvent){e.preventDefault();setBusy(true);setError("");setMessage("");try{
  const url=editing?"/api/admin/resources/"+editing:"/api/admin/resources";
  const r=await fetch(url,{method:editing?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
  const d=await r.json();if(!r.ok)throw Error(d.error||"Could not save resource");
  await refresh();setEditing(null);setForm(empty());setOpen(false);setMessage("Resource saved.");
 }catch(e){setError(e instanceof Error?e.message:"Could not save");}finally{setBusy(false);}}
 function edit(r:Item){setEditing(r.id);setForm({title:r.title,category:r.category,body:r.body,sourceUrl:r.source_url||"",access:r.access,status:r.status});setOpen(true);}
 async function remove(r:Item){if(!confirm("Permanently delete "+r.title+"?"))return;setBusy(true);setError("");try{const response=await fetch("/api/admin/resources/"+r.id,{method:"DELETE"});const d=await response.json();if(!response.ok)throw Error(d.error||"Delete failed");await refresh();setMessage("Resource deleted.");}catch(e){setError(e instanceof Error?e.message:"Delete failed");}finally{setBusy(false);}}
 const filtered=items.filter(i=>(category==="all"||i.category===category)&&(!query||i.title.toLowerCase().includes(query.toLowerCase())));
 return <div className="admin-refactor admin-resource-library"><header className="adm-library-heading"><div><h1>Learning resources</h1><p>রিসোর্স যোগ করুন, সম্পাদনা করুন ও প্রকাশ করুন।</p></div><div className="adm-section-actions"><button className="button" onClick={()=>{setEditing(null);setForm(empty());setOpen(true);}}><Plus size={15}/> Add resource</button></div></header><AdminModal open={open} title={editing?'Edit resource':'Add resource'} onClose={()=>setOpen(false)} busy={busy}><form className="workspace-panel admin-editor" onSubmit={save}>
   <div className="form-two"><label>Title<input required minLength={3} maxLength={180} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
   <label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option value="writing">Writing Samples</option><option value="ebook">Ebooks</option><option value="journal">Study journal</option><option value="grammar">Grammar</option></select></label></div>
   <label>Resource content (plain text)<textarea rows={5} maxLength={50000} value={form.body} onChange={e=>setForm({...form,body:e.target.value})}/></label>
   <label>Optional external HTTPS document/source link<input type="url" maxLength={2000} placeholder="https://…" value={form.sourceUrl} onChange={e=>setForm({...form,sourceUrl:e.target.value})}/></label>
   <div className="form-two"><label>Access<select value={form.access} onChange={e=>setForm({...form,access:e.target.value})}><option value="free">Free</option><option value="premium">Premium</option></select></label>
   <label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label></div>
   <div className="admin-user-filters"><button className="button" disabled={busy}>{busy?"Saving…":"Save resource ↗"}</button>{editing&&<button type="button" onClick={()=>{setEditing(null);setForm(empty());}}>Cancel editing</button>}</div>
   <p className="adm-note">Only published, free resources are public.</p>
  {error&&<p role="alert">{error}</p>}</form></AdminModal>
  {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
  <section className="workspace-panel admin-resource-list"><div className="adm-content-filters"><label><span>Search resources</span><div className="adm-search-input"><Search size={16}/><input type="search" maxLength={100} placeholder="Find a resource…" value={query} onChange={e=>setQuery(e.target.value)}/></div></label><label><span>Category</span><select value={category} onChange={e=>setCategory(e.target.value)}><option value="all">All categories</option>{Object.entries(categories).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><strong>{filtered.length} {filtered.length===1?'resource':'resources'}</strong></div>
   <div className="admin-resource-grid">{filtered.map(r=><article className="admin-resource-card" key={r.id}><div className="admin-resource-card-head"><BookOpen size={20}/><span>{categories[r.category]||r.category}</span><span className="adm-state">{r.status}</span></div><h2>{r.title}</h2><p>{r.body||'External document resource'}</p><div className="admin-resource-card-meta"><span>{r.access==='premium'?'Premium':'Free'}</span><span>Updated {new Date(r.updated_at).toLocaleDateString('en-GB',{timeZone:'Asia/Dhaka'})}</span></div><footer><button className="adm-text-action" type="button" disabled={busy} onClick={()=>edit(r)}><Pencil size={14}/> Edit resource</button><button className="adm-text-action" type="button" disabled={busy} onClick={()=>void remove(r)}><Trash2 size={14}/> Delete</button></footer></article>)}{!filtered.length&&<div className="adm-content-empty"><BookOpen size={32}/><h2>{items.length?'No matching resources':'No resources yet'}</h2><p>{items.length?'অন্য নাম বা category দিয়ে খুঁজুন।':'প্রথম রিসোর্সটি যোগ করে আপনার learning library শুরু করুন।'}</p>{!items.length&&<button className="adm-text-action" onClick={()=>{setEditing(null);setForm(empty());setOpen(true);}}><Plus size={14}/> Add resource</button>}</div>}</div>
  </section></div>;
}
