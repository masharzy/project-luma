import 'server-only';
import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { readSession } from '@/lib/auth/session';
import { db } from '@/lib/auth/db';
import { digest, randomToken, validToken } from '@/lib/auth/crypto';
import { AuthHttpError } from '@/lib/auth/http';
import { moduleOrder, selectedModules } from '@/lib/cambridge-settings';
import { examParent, loadExam, learnerDocument } from './store';
import { gradeModule } from './result';
import { cleanAnswers, moduleDeadline } from './timeline';
import type { ExamDocument, Module } from './document';
export const ownerCookie = 'luma_exam_owner';
type Snapshot = {
    module: Module;
    document: ExamDocument;
}[];
export async function startAttempt(kind: string, parentId: string, selection: string, owner: string, userId: string | null) {
    if (!['cambridge', 'practice'].includes(kind) || !/^\d{1,16}$/.test(parentId) || ![...moduleOrder, 'full'].includes(selection as any))
        throw new AuthHttpError(400, 'Invalid test');
    const k = kind as 'cambridge' | 'practice';
    const parent = await examParent(k, parentId);
    if (!parent || parent.status !== 'published' || parent.access !== 'free')
        throw new AuthHttpError(404, 'Test unavailable');
    const chosen = selectedModules(parent.modules, selection);
    if (!chosen.length)
        throw new AuthHttpError(404, 'Module unavailable');
    const snapshot: Snapshot = await Promise.all(chosen.map(async module => {
        const { document, revision } = await loadExam(k, parentId, module);
        if (!revision || !document.parts.length || (module !== 'writing' && !document.questions.length))
            throw new AuthHttpError(409, 'This test is not ready yet');
        return { module, document };
    }));
    const id = randomUUID();
    await db().query("INSERT INTO public.exam_attempts(id,owner_hash,kind,parent_id,title,snapshot,user_id,deadline) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::uuid,now()+($8::integer * interval '1 second'))", [id, digest(owner), kind, parentId, parent.title, JSON.stringify(snapshot), userId, snapshot[0].document.durationMinutes * 60]);
    return id;
}
async function attemptRow(id:string){return (await db().query(`SELECT a.*,e.results_published_at FROM public.exam_attempts a LEFT JOIN public.mock_events e ON a.kind='mock' AND e.id=a.parent_id WHERE a.id=$1`,[id]))[0];}
// A browser timer is advisory. Expired modules are graded from the last server save.
export async function settleAttempt(initial:any){
 let r=initial;
 for(let n=0;n<4;n++){
  const index=Number(r.current_index),snapshot=r.snapshot as Snapshot;
  if(index>=snapshot.length||!r.deadline||new Date(r.deadline).getTime()>Date.now())return r;
  const answers=r.answers?.[String(index)]||{},result=gradeModule(snapshot[index].module,snapshot[index].document,answers);
  const next=index+1<snapshot.length?(r.kind==='mock'?new Date(moduleDeadline(snapshot,new Date(r.scheduled_start).getTime(),index+1)).toISOString():new Date(Date.now()+snapshot[index+1].document.durationMinutes*60000).toISOString()):null;
  await db().query(`UPDATE public.exam_attempts SET current_index=current_index+1,deadline=$4::timestamptz,locked_index=NULL,results=results||$3::jsonb WHERE id=$1 AND current_index=$2 AND deadline<=now()`,[r.id,index,JSON.stringify([result]),next]);
  r=await attemptRow(r.id);
 }
 return r;
}
export async function readAttempt(id: string) {
 if(!/^[a-f0-9-]{36}$/.test(id))throw new AuthHttpError(404,'Attempt not found');
 const session=await readSession(),token=(await cookies()).get(ownerCookie)?.value;
 if(!session?.user.id&&!validToken(token))throw new AuthHttpError(404,'Attempt not found');
 const rows=await db().query(`SELECT a.*,e.results_published_at FROM public.exam_attempts a LEFT JOIN public.mock_events e ON a.kind='mock' AND e.id=a.parent_id
 WHERE a.id=$1 AND (a.expires_at>now() OR a.kind='mock') AND ((a.user_id IS NOT NULL AND a.user_id=$2::uuid) OR (a.user_id IS NULL AND a.owner_hash=$3))`,[id,session?.user.id??null,validToken(token)?digest(token):'']);
 if(!rows.length)throw new AuthHttpError(404,'This attempt has expired or belongs to another account');
 return settleAttempt(rows[0]);
}
export function publicAttempt(r:any){
 const snapshot=r.snapshot as Snapshot,index=Number(r.current_index),complete=index>=snapshot.length;
 const resultPublished=r.kind!=='mock'||Boolean(r.results_published_at),moduleSubmitted=r.locked_index===index;
 return {id:r.id,title:r.title,kind:r.kind,parentId:String(r.parent_id),index,complete,deadline:r.deadline,serverNow:Date.now(),resultPublished,moduleSubmitted,
 modules:snapshot.map(s=>({module:s.module,minutes:s.document.durationMinutes})),
 savedAnswers:!complete&&!moduleSubmitted?(r.answers?.[String(index)]||{}):{},
 current:!complete&&!moduleSubmitted?{module:snapshot[index].module,document:learnerDocument(snapshot[index].document)}:null,
 results:complete&&resultPublished?r.results:[]};
}
export async function advanceAttempt(id:string,body:Record<string,unknown>){
 const r=await readAttempt(id),index=Number(r.current_index),snapshot=r.snapshot as Snapshot;
 if(index>=snapshot.length)return publicAttempt(r);
 if(body.index!==index)throw new AuthHttpError(409,'This module has already changed. Reload the test.');
 if(body.action==='start'){
  if(r.kind==='mock')return publicAttempt(r);
  if(!r.deadline)await db().query("UPDATE public.exam_attempts SET deadline=now()+($3::integer*interval '1 second') WHERE id=$1 AND current_index=$2 AND deadline IS NULL",[id,index,snapshot[index].document.durationMinutes*60]);
 }else if(body.action==='save'||body.action==='submit'){
  if(!r.deadline)throw new AuthHttpError(409,'Start the module first');
  if(r.locked_index===index)throw new AuthHttpError(409,'This module has been submitted.');
  let answers:Record<string,string>;try{answers=cleanAnswers(snapshot,index,body.answers);}catch{throw new AuthHttpError(400,'Invalid answers');}
  if(body.action==='save'||r.kind==='mock'){
   const rows=await db().query(`UPDATE public.exam_attempts SET answers=jsonb_set(answers,ARRAY[$2::text],$3::jsonb),locked_index=CASE WHEN $4::boolean THEN current_index ELSE locked_index END WHERE id=$1 AND current_index=$2 AND deadline>now() AND locked_index IS DISTINCT FROM current_index RETURNING id`,[id,index,JSON.stringify(answers),body.action==='submit']);
   if(!rows.length)throw new AuthHttpError(409,'The module deadline has passed.');
   if(body.action==='save')return publicAttempt(r);
  }else{
   const result=gradeModule(snapshot[index].module,snapshot[index].document,answers);
   const rows=await db().query(`UPDATE public.exam_attempts SET current_index=current_index+1,deadline=CASE WHEN current_index+1<$5::integer THEN now()+($6::integer*interval '1 second') ELSE NULL END,results=results||$3::jsonb,answers=jsonb_set(answers,ARRAY[$2::text],$4::jsonb) WHERE id=$1 AND current_index=$2 AND deadline>now() RETURNING id`,[id,index,JSON.stringify([result]),JSON.stringify(answers),snapshot.length,(snapshot[index+1]?.document.durationMinutes??0)*60]);
   if(!rows.length)throw new AuthHttpError(409,'The module deadline has passed.');
  }
 }else throw new AuthHttpError(400,'Invalid action');
 return publicAttempt(await readAttempt(id));
}
export function newOwner(existing:string|undefined){return validToken(existing)?existing:randomToken();}
