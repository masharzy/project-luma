import 'server-only';
import {readSession} from '@/lib/auth/session';
import {memberPlan} from '@/lib/learner/member-access';
import cards from '@/data/cue-cards.json';
export const FREE_PER_CATEGORY=3;
export type Cue={id:number;category:string;title:string;prompts:string[];part3:string[];ideas:string[];level:string};
export type CueCard={id:number;category:string;title:string;locked:boolean;prompts?:string[];part3?:string[];ideas?:string[];level?:string};
// The first FREE_PER_CATEGORY cards of every category are free; the rest need a plan with cue cards.
export async function cueCardsFor(){
 const userId=(await readSession().catch(()=>null))?.user?.id??null;
 const plan=await memberPlan(userId);
 const all=plan?.access.cueCards===true;
 const seen:Record<string,number>={};
 const list:CueCard[]=(cards as Omit<Cue,'id'>[]).map((c,i)=>{
  seen[c.category]=(seen[c.category]||0)+1;
  const open=all||seen[c.category]<=FREE_PER_CATEGORY;
  return open?{id:i+1,...c,locked:false}:{id:i+1,category:c.category,title:c.title,locked:true};
 });
 return{cards:list,authed:!!userId,categories:[...new Set(list.map(c=>c.category))]};
}
