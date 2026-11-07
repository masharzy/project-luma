import 'server-only';
import {readSession} from '@/lib/auth/session';
import {premiumResourceLimit} from '@/lib/learner/member-access';
import t1 from '@/data/writing-task1.json';
import t2 from '@/data/writing-task2.json';
export const FREE_PER_TASK=4;
type Lang={p:string;m:string};
type Level={comment:string}&({answer:string}|{essay:string});
export type Sample={task:1|2;id:number;type:string;topic?:string;title:string;locked:boolean;instruction?:string;unit?:string;data?:unknown;overview?:string;keyFeatures?:string[];outline?:string[];structure?:{para:string;note:string}[];band7?:{text:string;comment:string};band8?:{text:string;comment:string};language?:Lang[]};
const lvl=(x:Level)=>({text:'answer' in x?x.answer:x.essay,comment:x.comment});
// First FREE_PER_TASK samples of each task are free; a plan can open more. Locked samples send only the prompt.
export async function writingSamples(){
 const userId=(await readSession().catch(()=>null))?.user?.id??null;
 const extra=await premiumResourceLimit(userId,'writing');
 const open=(i:number)=>i<FREE_PER_TASK+extra;
 const a:Sample[]=(t1 as any[]).map((x,i)=>open(i)
  ?{task:1,id:x.id,type:x.type,title:x.title,instruction:x.instruction,locked:false,unit:x.unit,data:x.data,overview:x.overview,keyFeatures:x.key_features,band7:lvl(x.band7),band8:lvl(x.band8),language:x.language}
  :{task:1,id:x.id,type:x.type,title:x.title,locked:true});
 const b:Sample[]=(t2 as any[]).map((x,i)=>open(i)
  ?{task:2,id:x.id,type:x.type,topic:x.topic,title:x.prompt,locked:false,outline:x.outline,structure:x.structure,band7:lvl(x.band7),band8:lvl(x.band8),language:x.vocab}
  :{task:2,id:x.id,type:x.type,topic:x.topic,title:x.prompt,locked:true});
 return[...a,...b];
}
