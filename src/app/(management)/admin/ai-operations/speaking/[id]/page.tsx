import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {WorkspaceHeading} from '@/components/page-parts';
import {requireAdmin} from '@/lib/auth/guards';
import {db} from '@/lib/auth/db';
import {AuthHttpError,audit,limit} from '@/lib/auth/http';
import {uuid} from '@/lib/products/access';
import {retrySpeakingEvaluation} from '@/lib/products/speaking-jobs';

async function retry(id:string){
 'use server';
 const admin=await requireAdmin();
 if(!uuid(id))notFound();
 const href='/admin/ai-operations/speaking/'+id;
 let message='';
 try{
  await limit('admin-speaking-retry:'+admin.id,12,3600);
  await retrySpeakingEvaluation(id,null);
  await audit(admin.id,'speaking-evaluation:'+id+':retry');
 }catch(error){
  message=error instanceof AuthHttpError?error.message:'Could not confirm the retry. Check the job status before trying again.';
 }
 redirect(message?href+'?message='+encodeURIComponent(message):href);
}

export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{message?:string}>}){
 await requireAdmin();
 const {id}=await params;
 if(!uuid(id))notFound();
 const [job]=await db().query(`SELECT s.id,s.status,s.model,s.tries,s.error_code,s.usage,u.email,a.title
  FROM public.speaking_evaluations s JOIN public.speaking_attempts a ON a.id=s.attempt_id
  LEFT JOIN app_auth.users u ON u.id=s.user_id WHERE s.id=$1`,[id]);
 if(!job)notFound();
 const {message}=await searchParams;
 const {failureHistory,rawFailure,checkpoints}=job.usage??{};
 const parts=(rawFailure?.parts??[]) as {part:number;issues:string[]}[];
 return <div className="admin-refactor">
  <WorkspaceHeading eyebrow="AI / SPEAKING" title="Speaking evaluation job" />
  <section className="workspace-panel">
   <Link href="/admin/ai-operations#speaking-failures">Back to AI jobs</Link>
   <h2>{job.title}</h2>
   <p>{job.email} · {job.status} · {job.model} · Run {job.tries}</p>
   <p>Job {id}</p>
   {job.error_code&&<p role="status">{job.error_code}</p>}
   {message&&<p role="alert">{message}</p>}
   {['failed','pending'].includes(job.status)&&<form action={retry.bind(null,id)}>
    <button type="submit">{job.status==='failed'?'Retry saved recordings':'Resume queued job'}</button>
   </form>}
   {job.status==='failed'&&parts.some(part=>part.issues.length>0)&&<ul>{parts.filter(part=>part.issues.length>0).map(part=><li key={part.part}>Part {part.part} · {part.issues.join(', ')}</li>)}</ul>}
   {job.status==='failed'&&<details open><summary>Failure reason and provider response</summary>
    <pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(rawFailure??checkpoints??null,null,2)}</pre>
   </details>}
   {failureHistory?.length>0&&<details><summary>Previous failures ({failureHistory.length})</summary>
    <pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(failureHistory,null,2)}</pre>
   </details>}
  </section>
 </div>;
}
