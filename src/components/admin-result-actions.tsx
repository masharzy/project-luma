"use client";
import {useState} from "react";
export function AdminResultActions({id,ready}:{id:string;ready:boolean}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function publish(){
  if(!ready||!window.confirm("Publish this mock's completed and reviewed results to all candidates?"))return;
  setBusy(true);setMessage("");
  try{
   const response=await fetch("/api/admin/mocks/"+encodeURIComponent(id),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"publish"})});
   const data=await response.json();
   if(!response.ok)throw Error(data.error||"Unable to publish results");
   window.location.reload();
  }catch(e){setMessage(e instanceof Error?e.message:"Publication failed");setBusy(false);}
 }
 return <><button className="button" disabled={busy||!ready} onClick={()=>void publish()}>{busy?"Publishing…":ready?"Publish all results ↗":"Not ready"}</button>{message&&<p role="alert">{message}</p>}</>;
}
