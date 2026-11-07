import 'server-only';
import {readSession} from '@/lib/auth/session';
import {memberPlan} from '@/lib/learner/member-access';
import cards from '@/data/cue-cards.json';
export const FREE_PER_CATEGORY=3;
export type Step={n:number;label:string;time:string;anchor:string;sentences:string[]};
export type Part3={q:string;a:string};
export type Phrase={p:string;m:string};
export type Cue={category:string;title:string;prompts:string[];angles:string[];target:string;steps:Step[];part3:Part3[];phrases:Phrase[]};
export type CueCard={id:number;category:string;title:string;no:number;locked:boolean}&Partial<Omit<Cue,'category'|'title'>>;
// The first FREE_PER_CATEGORY topics of every category are free; the rest need a plan with cue cards.
// Locked topics send only their title: no prompts, answers or phrases reach the client.
export async function cueCardsFor(){
 const userId=(await readSession().catch(()=>null))?.user?.id??null;
 const plan=await memberPlan(userId);
 const all=plan?.access.cueCards===true;
 const seen:Record<string,number>={};
 const list:CueCard[]=(cards as Cue[]).map((c,i)=>{
  const no=(seen[c.category]=(seen[c.category]||0)+1);
  const open=all||no<=FREE_PER_CATEGORY;
  return open?{id:i+1,no,locked:false,...c}:{id:i+1,no,category:c.category,title:c.title,locked:true};
 });
 return{cards:list,authed:!!userId,categories:[...new Set(list.map(c=>c.category))]};
}
