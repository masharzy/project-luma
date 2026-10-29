import 'server-only';
import { db } from '@/lib/auth/db';
import { AuthHttpError } from '@/lib/auth/http';
import { moduleDeadline } from './timeline';
export async function mockSpeakingContext(id:string,userId:string):Promise<any|null>{
 const r=(await db().query("SELECT a.snapshot,a.current_index,a.locked_index,a.scheduled_start,e.ends_at,e.results_published_at FROM public.exam_attempts a JOIN public.mock_events e ON e.id=a.parent_id WHERE a.id=$1::uuid AND a.user_id=$2::uuid AND a.kind='mock'",[id,userId]))[0];
 if(!r||r.snapshot.length!==4)return null;
 return {...r,start:moduleDeadline(r.snapshot,new Date(r.scheduled_start).getTime(),2),deadline:moduleDeadline(r.snapshot,new Date(r.scheduled_start).getTime(),3)};
}
export function requireSpeakingWindow(context:any){if(context&&(Date.now()<context.start||Date.now()>=context.deadline||Number(context.locked_index)===3))throw new AuthHttpError(409,'Speaking is not open or has already been submitted.');}
export async function ensureMockSpeaking(id:string,userId:string){
 const r=(await db().query("SELECT title,snapshot FROM public.exam_attempts WHERE id=$1::uuid AND user_id=$2::uuid AND kind='mock'",[id,userId]))[0];
 if(!r||r.snapshot.length!==4)return;
 const d=r.snapshot[3].document;
 await db().query(`INSERT INTO public.speaking_attempts(id,user_id,set_id,title,snapshot,minutes) VALUES($1::uuid,$2::uuid,$3::bigint,$4,$5::jsonb,$6) ON CONFLICT(id) DO NOTHING`,[id,userId,d.speakingSetId,r.title,JSON.stringify(d.speakingSet),d.durationMinutes]);
}
