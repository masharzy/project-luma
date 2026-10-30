"use client";
import {useCallback,useEffect,useState,type FormEvent} from "react";
import {WorkspaceHeading} from "@/components/page-parts";
type Item={id:string;title:string;category:string;body:string;source_url:string|null;access:string;status:string;updated_at:string};
const empty=()=>({title:"",category:"writing",body:"",sourceUrl:"",access:"free",status:"draft"});
export function ResourceManager(){
 const [items,setItems]=useState<Item[]>([]),[form,setForm]=useState(empty),[editing,setEditing]=useState<string|null>(null);
 const [query,setQuery]=useState(""),[category,setCategory]=useState("all"),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 const refresh=useCallback(async()=>{const r=await fetch("/api/admin/resources",{cache:"no-store"});const d=await r.json();if(!r.ok)throw Error(d.error||"Cannot load resources");setItems(d.items);},[]);
 useEffect(()=>{void refresh().catch(e=>setError(e.message));},[refresh]);
 async function save(e:FormEvent){e.preventDefault();setBusy(true);setError("");setMessage("");try{
  const url=editing?"/api/admin/resources/"+editing:"/api/admin/resources";
  const r=await fetch(url,{method:editing?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
  const d=await r.json();if(!r.ok)throw Error(d.error||"Could not save resource");
  await refresh();setEditing(null);setForm(empty());setMessage("Resource saved.");
 }catch(e){setError(e instanceof Error?e.message:"Could not save");}finally{setBusy(false);}}
 function edit(r:Item){setEditing(r.id);setForm({title:r.title,category:r.category,body:r.body,sourceUrl:r.source_url||"",access:r.access,status:r.status});window.scrollTo({top:0,behavior:"smooth"});}
 async function remove(r:Item){if(!confirm("Permanently delete "+r.title+"?"))return;setBusy(true);setError("");try{const response=await fetch("/api/admin/resources/"+r.id,{method:"DELETE"});const d=await response.json();if(!response.ok)throw Error(d.error||"Delete failed");await refresh();setMessage("Resource deleted.");}catch(e){setError(e instanceof Error?e.message:"Delete failed");}finally{setBusy(false);}}
 const filtered=items.filter(i=>(category==="all"||i.category===category)&&(!query||i.title.toLowerCase().includes(query.toLowerCase())));
 return <div className="admin-refactor"><WorkspaceHeading eyebrow="CONTENT / RESOURCES" title="Learning resources" description="Create and publish Writing guides, ebooks, journal articles and grammar notes. Published free resources appear on the website."/>
  <form className="workspace-panel admin-editor" onSubmit={save}><h2>{editing?"Edit":"Create"} resource</h2>
   <div className="form-two"><label>Title<input required minLength={3} maxLength={180} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
   <label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option value="writing">Writing samples & guides</option><option value="ebook">Ebooks</option><option value="journal">Study journal</option><option value="grammar">Grammar</option></select></label></div>
   <label>Resource content (plain text)<textarea rows={8} maxLength={50000} value={form.body} onChange={e=>setForm({...form,body:e.target.value})}/></label>
   <label>Optional external HTTPS document/source link<input type="url" maxLength={2000} placeholder="https://…" value={form.sourceUrl} onChange={e=>setForm({...form,sourceUrl:e.target.value})}/></label>
   <div className="form-two"><label>Access<select value={form.access} onChange={e=>setForm({...form,access:e.target.value})}><option value="free">Free</option><option value="premium">Premium</option></select></label>
   <label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label></div>
   <div className="admin-user-filters"><button className="button" disabled={busy}>{busy?"Saving…":"Save resource ↗"}</button>{editing&&<button type="button" onClick={()=>{setEditing(null);setForm(empty());}}>Cancel editing</button>}</div>
   <p>Only free published resources are public. Premium bodies remain private pending a resource entitlement system. External links are not stored on JumpToNine.</p>
  </form>
  {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
  <section className="workspace-panel"><div className="admin-user-filters"><label>Find<input type="search" maxLength={100} value={query} onChange={e=>setQuery(e.target.value)}/></label><select aria-label="Filter category" value={category} onChange={e=>setCategory(e.target.value)}><option value="all">All categories</option>{["writing","ebook","journal","grammar"].map(x=><option key={x} value={x}>{x}</option>)}</select></div><h2>{filtered.length} resources</h2>
   <div className="admin-item-grid">{filtered.map(r=><article className="workspace-panel admin-item-card" key={r.id}><span className="access-pill">{r.status} · {r.access} · {r.category}</span><h3>{r.title}</h3><p>{r.body.slice(0,200)}{r.body.length>200?"…":""}</p><div className="admin-user-filters"><button type="button" disabled={busy} onClick={()=>edit(r)}>Edit</button><button type="button" disabled={busy} onClick={()=>void remove(r)}>Delete</button></div></article>)}{!filtered.length&&<p>No resources found.</p>}</div>
  </section></div>;
}
