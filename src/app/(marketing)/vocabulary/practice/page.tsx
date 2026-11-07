import {redirect} from "next/navigation";
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const sp=await searchParams;const p=new URLSearchParams();
 for(const k of["topic","band","use"]){const v=sp[k];if(typeof v==="string")p.set(k,v);}
 p.set("mode","quiz");redirect(`/vocabulary?${p.toString()}`);
}
