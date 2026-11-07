import 'server-only';
import {readSession} from '@/lib/auth/session';
import {memberPlan} from '@/lib/learner/member-access';
import b1 from '@/data/ebooks/task-2-essay-playbook.json';
import b2 from '@/data/ebooks/task-1-data-description.json';
import b3 from '@/data/ebooks/speaking-fluency-framework.json';
import b4 from '@/data/ebooks/reading-question-types.json';
import b5 from '@/data/ebooks/listening-accuracy.json';
import b6 from '@/data/ebooks/thirty-day-study-plan.json';
export const FREE_CHAPTERS=2;
export type Chapter={title:string;summary:string;locked:boolean;body?:string;takeaways?:string[];exercise?:string;words:number};
export type Book={slug:string;title:string;subtitle:string;skill:string;level:string;description:string;audience:string;chapters:Chapter[]};
// The first FREE_CHAPTERS chapters of every book are free; the rest need a plan with ebooks. Locked chapters send no text.
export async function ebooksFor(){
 const userId=(await readSession().catch(()=>null))?.user?.id??null;
 const plan=await memberPlan(userId);
 const all=plan?.access.ebooks===true;
 return ([b1,b2,b3,b4,b5,b6] as any[]).map((b):Book=>({slug:b.slug,title:b.title,subtitle:b.subtitle,skill:b.skill,level:b.level,description:b.description,audience:b.audience,
  chapters:b.chapters.map((c:any,i:number)=>{const words=String(c.body).trim().split(/\s+/).length;return all||i<FREE_CHAPTERS?{title:c.title,summary:c.summary,locked:false,body:c.body,takeaways:c.takeaways,exercise:c.exercise,words}:{title:c.title,summary:c.summary,locked:true,words};})}));
}
