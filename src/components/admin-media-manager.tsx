"use client";
import {useEffect,useState} from "react";
import {WorkspaceHeading} from "@/components/page-parts";
type Asset={id:string;original_name:string;content_type:string;bytes:number;access:string;created_at:string};
export function AdminMediaManager(){
 const [items,setItems]=useState<Asset[]>([]),[file,setFile]=useState<File|null>(null),[access,setAccess]=useState("free"),[configured,setConfigured]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function refresh(){const r=await fetch("/api/admin/media",{cache:"no-store"}),d=await r.json();if(!r.ok)throw Error(d.error||"Media library unavailable");setItems(d.assets);setConfigured(d.configured);}
 useEffect(()=>{void refresh().catch(e=>setMessage(e.message));},[]);
 async function upload(){
  if(!file)return;setBusy(true);setMessage("");
  try{const form=new FormData();form.set("file",file);form.set("access",access);
   const r=await fetch("/api/admin/media",{method:"POST",body:form}),d=await r.json();if(!r.ok)throw Error(d.error||"Upload failed");
   await refresh();setFile(null);setMessage("Uploaded to Cloudflare R2. Use "+window.location.origin+d.url+" in your exam editor.");
  }catch(e){setMessage(e instanceof Error?e.message:"Upload failed");}finally{setBusy(false);}
 }
 return <div className="admin-refactor"><WorkspaceHeading eyebrow="MEDIA / CLOUDFLARE" title="Audio & image library" description="Manage admin-uploaded media stored privately in R2. Copy stable URLs into IELTS questions."/>
  <section className="workspace-panel admin-editor"><h2>Upload media</h2><p>Supported: MP3, M4A, WAV, JPEG, PNG and WebP, up to 2.5 MB per upload. Larger Listening recordings require direct-to-R2 multipart upload, not the Vercel function upload route.</p>
   <label>Choose file<input type="file" accept="audio/mpeg,audio/mp4,audio/wav,image/png,image/jpeg,image/webp,.mp3,.m4a,.wav" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
   <label>Access<select value={access} onChange={e=>setAccess(e.target.value)}><option value="free">Free / public</option><option value="premium">Premium / authenticated subscribers</option></select></label>
   <button className="button" disabled={!file||busy||!configured} onClick={()=>void upload()}>{busy?"Uploading…":"Upload to Cloudflare R2 ↗"}</button>
   <p role="status">{message||(!configured?"Storage credentials unavailable in this environment.":"Cloudflare R2 configured.")}</p>
  </section>
  <section className="workspace-panel"><h2>Uploaded assets ({items.length})</h2><div className="table-scroll"><table className="admin-users-table"><thead><tr><th>FILE</th><th>TYPE</th><th>SIZE</th><th>ACCESS</th><th>MEDIA URL</th></tr></thead><tbody>{items.map(i=>{const url="/api/media/"+i.id;return <tr key={i.id}><td>{i.original_name}</td><td>{i.content_type}</td><td>{Math.round(i.bytes/1024)} KB</td><td>{i.access}</td><td><button type="button" onClick={()=>void navigator.clipboard.writeText(window.location.origin+url).then(()=>setMessage("URL copied")).catch(()=>setMessage(url))}>Copy URL ↗</button></td></tr>})}{!items.length&&<tr><td colSpan={5}>No uploaded media yet.</td></tr>}</tbody></table></div></section>
 </div>;
}
