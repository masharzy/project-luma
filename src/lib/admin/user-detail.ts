import 'server-only';
import {db} from '@/lib/auth/db';
// Everything the admin user profile shows. Tables added by migration 036 are read defensively so the page still loads before it runs.
const safe=async<T,>(run:()=>Promise<T>,fallback:T):Promise<T>=>{try{return await run();}catch{return fallback;}};
export async function adminUserDetail(id:string,page=1){
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))return null;
 const sql=db();
 const user=(await sql.query('SELECT id,name,email,email_verified,role,banned,created_at,updated_at,password_hash IS NOT NULL AS has_password FROM app_auth.users WHERE id=$1::uuid',[id]))[0];
 if(!user)return null;
 const offset=(page-1)*25;
 const [providers,devices,deviceLimit,subscriptions,allowances,grants,contentGrants,attempts,writing,speaking,activity,goals,saved,registrations,speakingAttempts,counts]=await Promise.all([
  sql.query('SELECT provider FROM app_auth.identities WHERE user_id=$1',[id]),
  safe(()=>sql.query("SELECT encode(sha256(convert_to(token_hash,'UTF8')),'hex') AS device_id,user_agent,created_at,last_seen_at,expires_at FROM app_auth.sessions WHERE user_id=$1 AND expires_at>now() ORDER BY last_seen_at DESC",[id]),null),
  safe(()=>sql.query('SELECT u.device_limit,p.default_device_limit FROM app_auth.users u LEFT JOIN public.evaluation_policy p ON p.id=true WHERE u.id=$1::uuid',[id]).then(r=>r[0]),null),
  sql.query('SELECT id,plan_id,plan_name,price_bdt,writing_limit,speaking_limit,status,starts_at,expires_at,created_at FROM public.evaluation_subscriptions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 25 OFFSET $2',[id,offset]),
  sql.query(`SELECT p.product,a.monthly_limit,a.source,(SELECT expires_at FROM public.evaluation_grants g WHERE g.user_id=$1 AND g.product=p.product AND g.expires_at>now()) override_until,
   coalesce((SELECT count FROM public.evaluation_usage u WHERE u.user_id=$1 AND u.product=p.product AND u.period=date_trunc('month',now() AT TIME ZONE 'UTC')::date),0)+CASE WHEN p.product='writing_product' THEN coalesce((SELECT sum(count) FROM public.evaluation_usage WHERE user_id=$1 AND product IN('cambridge_writing','practice_writing') AND period=date_trunc('month',now() AT TIME ZONE 'UTC')::date),0) ELSE 0 END AS used
   FROM (VALUES('writing_product'),('speaking_product')) p(product) CROSS JOIN LATERAL public.evaluation_allowance($1::uuid,p.product) a`,[id]),
  sql.query('SELECT product,monthly_limit,expires_at FROM public.evaluation_grants WHERE user_id=$1 ORDER BY expires_at DESC',[id]),
  safe(()=>sql.query('SELECT id,scope,ref,note,expires_at,created_at FROM public.user_content_grants WHERE user_id=$1 ORDER BY created_at DESC',[id]),[] as Record<string,unknown>[]),
  sql.query('SELECT id,kind,parent_id,title,current_index,created_at,results,answers,jsonb_array_length(snapshot) AS modules FROM public.exam_attempts WHERE user_id=$1 ORDER BY created_at DESC LIMIT 25 OFFSET $2',[id,offset]),
  sql.query('SELECT id,attempt_id,submission_id,product,status,created_at,input,result FROM public.writing_evaluations WHERE user_id=$1 ORDER BY created_at DESC LIMIT 25 OFFSET $2',[id,offset]),
  sql.query('SELECT e.id,e.attempt_id,e.status,e.created_at,e.result,a.title FROM public.speaking_evaluations e JOIN public.speaking_attempts a ON a.id=e.attempt_id WHERE e.user_id=$1 ORDER BY e.created_at DESC LIMIT 25 OFFSET $2',[id,offset]),
  sql.query('SELECT action,created_at FROM app_auth.audit_events WHERE user_id=$1 ORDER BY created_at DESC LIMIT 25 OFFSET $2',[id,offset]),
  sql.query('SELECT target_band,exam_date,weekly_target,updated_at FROM public.learner_goals WHERE user_id=$1',[id]),
  sql.query('SELECT path,title,created_at FROM public.learner_saved_resources WHERE user_id=$1 ORDER BY created_at DESC',[id]),
  sql.query('SELECT e.title,r.mock_id,r.registered_at,r.attempt_id FROM public.mock_registrations r JOIN public.mock_events e ON e.id=r.mock_id WHERE r.user_id=$1 ORDER BY registered_at DESC LIMIT 25 OFFSET $2',[id,offset]),
  sql.query('SELECT a.id,a.title,a.status,a.minutes,a.created_at,(SELECT count(*) FROM public.speaking_recordings r WHERE r.attempt_id=a.id) recorded_answers FROM public.speaking_attempts a WHERE a.user_id=$1 ORDER BY a.created_at DESC LIMIT 25 OFFSET $2',[id,offset]),
  sql.query(`SELECT (SELECT count(*) FROM public.exam_attempts WHERE user_id=$1)::int tests,(SELECT count(*) FROM public.writing_evaluations WHERE user_id=$1)::int writing,(SELECT count(*) FROM public.speaking_evaluations WHERE user_id=$1)::int speaking,(SELECT coalesce(sum(price_bdt),0) FROM public.evaluation_subscriptions WHERE user_id=$1 AND starts_at IS NOT NULL)::int spent,(SELECT max(last_seen_at) FROM app_auth.sessions WHERE user_id=$1) last_seen`,[id]).then(r=>r[0]),
 ]);
 const active=subscriptions.find(s=>s.status==='active'&&s.expires_at&&new Date(String(s.expires_at))>new Date())??null;
 return {user,providers,devices:devices??[],deviceSchemaReady:devices!==null,deviceLimit,subscriptions,active,allowances,grants,contentGrants,attempts,writing,speaking,activity,goals,saved,registrations,speakingAttempts,counts};
}
// Choices for the "give access" form.
export async function adminAccessCatalog(){
 const sql=db();
 const [plans,books,recent,volumes,moreTests]=await Promise.all([
  sql.query('SELECT id,name,price_bdt,writing_limit,speaking_limit FROM public.evaluation_plans ORDER BY published DESC,price_bdt,name'),
  sql.query("SELECT book_number::text AS value,title AS label FROM public.cambridge_books WHERE status='published' ORDER BY book_number"),
  sql.query("SELECT id::text AS value,title AS label FROM public.recent_tests WHERE status='published' ORDER BY id DESC LIMIT 300"),
  sql.query("SELECT v.slug AS value,v.title AS label FROM public.book_volumes v WHERE v.status='published' ORDER BY v.title"),
  sql.query("SELECT c.id::text AS value,c.title AS label FROM public.admin_content c WHERE c.kind='practice' AND c.book_slug IS NOT NULL AND c.status='published' ORDER BY c.id DESC LIMIT 300"),
 ]);
 const tests=await sql.query("SELECT t.id::text AS value,'Cambridge '||t.book_number||' · '||coalesce(nullif(t.title,''),'Test '||t.test_number) AS label FROM public.cambridge_tests t WHERE t.status='published' ORDER BY t.book_number DESC,t.test_number");
 return {plans,options:{cambridge_book:books,cambridge_test:tests,recent_test:recent,more_books_volume:volumes,more_books_test:moreTests}} as unknown as {plans:{id:string;name:string;price_bdt:number;writing_limit:number|null;speaking_limit:number|null}[];options:Record<string,{value:string;label:string}[]>};
}
