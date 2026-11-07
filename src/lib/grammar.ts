import 'server-only';
import {readSession} from '@/lib/auth/session';
import {memberPlan} from '@/lib/learner/member-access';
import data from '@/data/grammar.json';
export type Q={q:string;options:string[];answer:number;why:string};
export type GTest={name:string;locked:boolean;questions?:Q[]};
export type GCat={slug:string;title:string;summary:string;rules:{rule:string;example:string}[];mistakes:{wrong:string;right:string;why:string}[];tip:string;tests:GTest[]};
// The first (Foundation) test of every category is free; the other tests need a plan with grammar access.
// Locked tests send no questions to the client.
export async function grammarFor(){
 const userId=(await readSession().catch(()=>null))?.user?.id??null;
 const plan=await memberPlan(userId);
 const all=plan?.access.grammar===true;
 const cats:GCat[]=(data as any[]).map(c=>({slug:c.slug,title:c.title,summary:c.summary,rules:c.rules,mistakes:c.mistakes,tip:c.tip,
  tests:c.tests.map((t:any,i:number)=>all||i===0?{name:t.name,locked:false,questions:t.questions}:{name:t.name,locked:true})}));
 return cats;
}
