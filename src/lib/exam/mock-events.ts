import 'server-only';
import { randomUUID } from 'node:crypto';
import { db } from '@/lib/auth/db';
import { AuthHttpError } from '@/lib/auth/http';
import { loadExam } from './store';
import { gradeModule } from './result';
import { moduleDeadline, type AttemptSnapshot } from './timeline';
import { settleAttempt } from './attempts';
const validId=(id:string)=>/^\d{1,16}$/.test(id);
export async function mockCatalog(userId:string|null,onlyRegistered=false){
 return db().query(`SELECT e.id::text,e.title,e.description,e.access,e.starts_at,e.ends_at,e.results_published_at,
 r.registered_at,r.attempt_id,e.snapshot->0->'document'->>'durationMinutes' listening_minutes
 FROM public.mock_events e JOIN public.admin_content c ON c.id=e.id
 LEFT JOIN public.mock_registrations r ON r.mock_id=e.id AND r.user_id=$1::uuid
 WHERE c.status='published' AND (NOT $2::boolean OR r.user_id IS NOT NULL) ORDER BY (e.ends_at>now()) DESC,e.starts_at ASC LIMIT 100`,[userId,onlyRegistered]);
}
export async function event(id:string){if(!validId(id))throw new AuthHttpError(404,'Mock not found');const e=(await db().query("SELECT e.* FROM public.mock_events e JOIN public.admin_content c ON c.id=e.id WHERE e.id=$1 AND c.status='published'",[id]))[0];if(!e)throw new AuthHttpError(404,'Mock not found');return e;}
export async function registerMock(id:string,userId:string){
 await event(id);
 // Check schedule and entitlement in the INSERT itself, not a stale client check.
 const rows=await db().query(`INSERT INTO public.mock_registrations(mock_id,user_id)
 SELECT e.id,$2::uuid FROM public.mock_events e JOIN public.admin_content c ON c.id=e.id
 WHERE e.id=$1 AND c.status='published' AND e.starts_at>now() AND (e.access='free' OR EXISTS(
 SELECT 1 FROM public.evaluation_subscriptions s WHERE s.user_id=$2::uuid AND s.status='active' AND s.starts_at<=now() AND s.expires_at>now()))
 ON CONFLICT(mock_id,user_id) DO UPDATE SET user_id=excluded.user_id RETURNING mock_id`,[id,userId]);
 if(!rows.length)throw new AuthHttpError(403,'Registration has closed or this mock requires an active Premium subscription.');
}
export async function joinMock(id:string,userId:string){
 const e=await event(id);const now=Date.now();if(now<new Date(String(e.starts_at)).getTime())throw new AuthHttpError(409,'The mock has not started yet.');
 const r=(await db().query('SELECT attempt_id FROM public.mock_registrations WHERE mock_id=$1 AND user_id=$2',[id,userId]))[0];
 if(!r)throw new AuthHttpError(403,'Register before the scheduled start to join this mock.');if(r.attempt_id)return String(r.attempt_id);
 if(now>=new Date(String(e.ends_at)).getTime())throw new AuthHttpError(409,'This mock has ended.');
 const attempt=randomUUID(),snapshot=e.snapshot as AttemptSnapshot;
 // Registration row lock and one SQL statement make concurrent Join requests idempotent.
 const result=await db().query(`WITH registration AS (SELECT * FROM public.mock_registrations WHERE mock_id=$1 AND user_id=$2::uuid FOR UPDATE),
 made AS (INSERT INTO public.exam_attempts(id,owner_hash,kind,parent_id,title,snapshot,user_id,deadline,scheduled_start,expires_at)
 SELECT $3::uuid,'','mock',$1,$4,$5::jsonb,$2::uuid,$6::timestamptz,$7::timestamptz,$8::timestamptz FROM registration WHERE attempt_id IS NULL RETURNING id)
 UPDATE public.mock_registrations SET attempt_id=(SELECT id FROM made) WHERE mock_id=$1 AND user_id=$2::uuid AND EXISTS(SELECT 1 FROM made) RETURNING attempt_id`,[id,userId,attempt,e.title,JSON.stringify(snapshot),new Date(moduleDeadline(snapshot,new Date(String(e.starts_at)).getTime(),0)).toISOString(),e.starts_at,new Date(new Date(String(e.ends_at)).getTime()+365*86400000).toISOString()]);
 if(result.length)return String(result[0].attempt_id);
 return String((await db().query('SELECT attempt_id FROM public.mock_registrations WHERE mock_id=$1 AND user_id=$2',[id,userId]))[0].attempt_id);
}
export async function prepareMock(id:string,adminId:string){
 if(!validId(id))throw new AuthHttpError(400,'Invalid mock');
 const c=(await db().query("SELECT * FROM public.admin_content WHERE id=$1 AND kind='mock'",[id]))[0];
 if(!c||!c.scheduled_at||new Date(String(c.scheduled_at)).getTime()<=Date.now())throw new AuthHttpError(400,'Choose a future scheduled start.');
 const snapshot:AttemptSnapshot=[];
 for(const module of ['listening','reading','writing'] as const){
 const {document,revision}=await loadExam('mock',id,module);
 if(!revision||!document.parts.length||(module==='writing'?document.parts.length!==2:gradeModule(module,document,{}).total!==40))throw new AuthHttpError(400,'Complete all three modules: Listening and Reading need 40 scored answers each; Writing needs Task 1 and Task 2.');
 if(module==='listening'&&!document.audioUrl&&!document.parts.every((p:any)=>p.audio_url))throw new AuthHttpError(400,'Add audio for every Listening part.');
 snapshot.push({module,document});}
 const start=new Date(String(c.scheduled_at)).getTime(),end=moduleDeadline(snapshot,start,2);
 const rows=await db().query(`WITH made AS (INSERT INTO public.mock_events(id,title,description,access,starts_at,ends_at,snapshot,prepared_by)
 SELECT $1,$2,$3,$4,$5,$6,$7::jsonb,$8 FROM public.admin_content WHERE id=$1 AND updated_at=$9::timestamptz ON CONFLICT(id) DO NOTHING RETURNING id) UPDATE public.admin_content SET status='published',sections='["listening","reading","writing"]'::jsonb WHERE id IN(SELECT id FROM made) RETURNING id`,[id,c.title,c.description,c.access,new Date(start).toISOString(),new Date(end).toISOString(),JSON.stringify(snapshot),adminId,c.updated_at]);
 if(!rows.length)throw new AuthHttpError(409,'Registration is already open. This scheduled paper is frozen. Create another mock to change it.');
}
export async function mockAdminResults(id:string){
 const e=(await db().query('SELECT id,title,starts_at,ends_at,results_published_at,snapshot FROM public.mock_events WHERE id=$1',[id]))[0];if(!e){const draft=(await db().query("SELECT title,scheduled_at,status FROM public.admin_content WHERE id=$1 AND kind='mock'",[id]))[0];if(!draft)throw new AuthHttpError(404,'Mock not found');return {event:null,draft,participants:[],writingTasks:[]};}
 if(Date.now()>=new Date(String(e.ends_at)).getTime()){
 const pending=await db().query("SELECT * FROM public.exam_attempts WHERE kind='mock' AND parent_id=$1 AND current_index<3 LIMIT 50",[id]);
 await Promise.all(pending.map(r=>settleAttempt(r)));
 }
 const participants=await db().query(`SELECT u.name,u.email,r.attempt_id,a.current_index,a.results,a.answers FROM public.mock_registrations r JOIN app_auth.users u ON u.id=r.user_id LEFT JOIN public.exam_attempts a ON a.id=r.attempt_id WHERE r.mock_id=$1 ORDER BY r.registered_at LIMIT 500`,[id]);
 return {event:{id:e.id,title:e.title,starts_at:e.starts_at,ends_at:e.ends_at,results_published_at:e.results_published_at},writingTasks:e.snapshot?.[2]?.document?.parts??[],participants};
}
export async function markMockWriting(id:string,attemptId:string,band:number,feedback:string){
 if(!Number.isFinite(band)||band<0||band>9||band*2%1||feedback.length>2000)throw new AuthHttpError(400,'Use a band from 0 to 9 in half-band steps.');
 const rows=await db().query(`WITH writable_event AS (SELECT id FROM public.mock_events WHERE id=$1 AND ends_at<=now() AND results_published_at IS NULL FOR UPDATE) UPDATE public.exam_attempts a SET results=(SELECT jsonb_agg(CASE WHEN v->>'module'='writing' THEN v||jsonb_build_object('bandScore',$3::numeric,'status','reviewed','feedback',$4::text) ELSE v END ORDER BY n) FROM jsonb_array_elements(a.results) WITH ORDINALITY AS t(v,n))
 FROM writable_event e WHERE a.id=$2::uuid AND a.kind='mock' AND a.parent_id=$1 AND e.id=a.parent_id AND a.current_index=3 RETURNING a.id`,[id,attemptId,band,feedback]);if(!rows.length)throw new AuthHttpError(409,'Finish the mock first; published results cannot be changed.');
}
export async function publishMock(id:string){
 await mockAdminResults(id);
 const rows=await db().query(`UPDATE public.mock_events e SET results_published_at=now() WHERE e.id=$1 AND e.ends_at<=now() AND e.results_published_at IS NULL AND NOT EXISTS(
 SELECT 1 FROM public.exam_attempts a WHERE a.kind='mock' AND a.parent_id=e.id AND (a.current_index<3 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(a.results) v WHERE v->>'module'='writing' AND v->>'status' IN ('reviewed','ai_reviewed')))) RETURNING id`,[id]);
 if(!rows.length)throw new AuthHttpError(409,'Wait until the scheduled end and finish AI evaluation or review every submitted Writing paper before publishing.');
}
