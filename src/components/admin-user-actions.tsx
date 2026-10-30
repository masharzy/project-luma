"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
export function AdminUserActions({id,role,banned,isSelf}:{id:string;role:string;banned:boolean;isSelf:boolean}){
 const router=useRouter(),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function act(action:string,nextRole?:string){
  if(isSelf)return;
  const question=action==="ban"?"Block this account and invalidate its sessions?":action==="unban"?"Unblock this account?":action==="revoke_sessions"?"Sign out all sessions for this account?":"Change this account's role to "+nextRole+"?";
  if(!window.confirm(question))return;
  setBusy(true);setMessage("");
  try{
   const res=await fetch("/api/admin/users/"+encodeURIComponent(id),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,...(nextRole?{role:nextRole}:{})})});
   const data=await res.json();if(!res.ok)throw Error(data.error||"Update failed");
   router.refresh();
  }catch(e){setMessage(e instanceof Error?e.message:"Unable to update");}finally{setBusy(false);}
 }
 return <div className="admin-user-actions"><button type="button" disabled={busy||isSelf} onClick={()=>void act(banned?"unban":"ban")}>{banned?"Unblock":"Block"}</button><button type="button" disabled={busy||isSelf} onClick={()=>void act("revoke_sessions")}>Sign out devices</button><button type="button" disabled={busy||isSelf} onClick={()=>void act("role",role==="admin"?"user":"admin")}>{role==="admin"?"Remove admin":"Make admin"}</button>{isSelf&&<small>Current account</small>}{message&&<small role="alert">{message}</small>}</div>;
}
