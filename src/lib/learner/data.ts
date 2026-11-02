import 'server-only';
import {cache} from 'react';
import {db} from '@/lib/auth/db';
export type Attempt={id:string;title:string;kind:string;created_at:string;complete:boolean;available:boolean;published:boolean;modules:string[];results:{module:string;bandScore:number|null;scorePercent?:number;correct?:number;total?:number}[]};
export const learnerData=cache(async(userId:string)=>{
 const sql=db();
 const [attempts,counts,goals,saved]=await Promise.all([
 sql.query(`SELECT a.id::text,a.title,a.kind,a.created_at,a.current_index>=jsonb_array_length(a.snapshot) AS complete,
 (a.expires_at>now() OR a.kind='mock') AS available,(a.kind<>'mock' OR e.results_published_at IS NOT NULL) AS published,
 ARRAY(SELECT s->>'module' FROM jsonb_array_elements(a.snapshot) s) AS modules,
 CASE WHEN a.current_index>=jsonb_array_length(a.snapshot) AND (a.kind<>'mock' OR e.results_published_at IS NOT NULL)
 THEN (SELECT coalesce(jsonb_agg(jsonb_build_object('module',v->>'module','bandScore',v->'bandScore','scorePercent',v->'scorePercent','correct',v->'correct','total',v->'total')),'[]') FROM jsonb_array_elements(a.results) v) ELSE '[]'::jsonb END AS results
 FROM public.exam_attempts a LEFT JOIN public.mock_events e ON a.kind='mock' AND e.id=a.parent_id
 WHERE a.user_id=$1 ORDER BY a.created_at DESC LIMIT 100`,[userId]),
 sql.query(`SELECT count(*)::int AS attempts,count(*) FILTER(WHERE current_index>=jsonb_array_length(snapshot))::int AS completed,
 count(*) FILTER(WHERE created_at>=date_trunc('week',now() AT TIME ZONE 'Asia/Dhaka') AT TIME ZONE 'Asia/Dhaka')::int AS weekly
 FROM public.exam_attempts WHERE user_id=$1`,[userId]),
 sql.query('SELECT target_band,exam_date::text,weekly_target FROM public.learner_goals WHERE user_id=$1',[userId]),
 sql.query('SELECT path,title FROM public.learner_saved_resources WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',[userId])]);
 return {attempts:attempts as Attempt[],counts:counts[0] as {attempts:number;completed:number;weekly:number},goals:goals[0]?{targetBand:Number(goals[0].target_band),examDate:goals[0].exam_date||'',weeklyTarget:Number(goals[0].weekly_target)}:{targetBand:7,examDate:'',weeklyTarget:3},saved:saved as {path:string;title:string}[]};
});
export const evaluationHistory=cache(async(userId:string)=>{
 const [writing,speaking]=await Promise.all([
 db().query(`SELECT coalesce(w.attempt_id,w.submission_id)::text AS id,w.product,w.status,w.created_at
 FROM public.writing_evaluations w LEFT JOIN public.exam_attempts a ON a.id=w.attempt_id LEFT JOIN public.mock_events e ON a.kind='mock' AND e.id=a.parent_id
 WHERE w.user_id=$1 AND (a.kind IS DISTINCT FROM 'mock' OR e.results_published_at IS NOT NULL) ORDER BY w.created_at DESC LIMIT 20`,[userId]),
 db().query('SELECT attempt_id::text AS id,status,created_at FROM public.speaking_evaluations WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20',[userId])]);
 return {writing:writing as {id:string;product:string;status:string;created_at:string}[],speaking:speaking as {id:string;status:string;created_at:string}[]};
});
