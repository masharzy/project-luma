import { requireUser } from '@/lib/auth/guards';
import { db } from '@/lib/auth/db';
import { WritingEvaluation } from '@/components/writing-evaluation';
import '@/styles/exam-session.css';
import Link from "next/link";
import { WorkspaceHeading, EmptyState } from "@/components/page-parts";
export const metadata = { title: "Results" };
export default async function Page() {
  const user=await requireUser();
  const writing=await db().query('SELECT COALESCE(e.attempt_id,e.submission_id) AS id,e.product,e.status,e.created_at FROM public.writing_evaluations e WHERE e.user_id=$1 ORDER BY e.created_at DESC LIMIT 20',[user.id]);
  const speaking=await db().query('SELECT attempt_id,status,created_at FROM public.speaking_evaluations WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20',[user.id]);
  return (
    <>
      <WorkspaceHeading
        eyebrow="YOUR SPACE / RESULTS"
        title="A clearer picture of your progress."
      />
      <section className="workspace-panel"><h2>Speaking feedback</h2>{speaking.map(e=><p key={String(e.attempt_id)}><Link href={'/speaking-evaluation/results/'+e.attempt_id}>Speaking · {new Date(String(e.created_at)).toLocaleDateString('en-GB')} · {String(e.status)} ↗</Link></p>)}{!speaking.length&&<p>Your Speaking evaluations will appear here.</p>}</section>
      <section className="workspace-panel"><h2>Writing feedback</h2>{writing.length?writing.map(e=><details key={String(e.id)}><summary>{e.product==='writing_product'?'Standalone':e.product==='cambridge_writing'?'Cambridge':'Practice'} Writing · {new Date(String(e.created_at)).toLocaleDateString('en-GB')} · {String(e.status)}</summary><WritingEvaluation attemptId={String(e.id)} source={e.product==='writing_product'?'submission':'attempt'}/></details>):<p>Your Writing evaluations will appear here.</p>}</section>
      <section className="workspace-panel">
        <div className="panel-heading">
          <h2>Results</h2>
          <Link href="/practice">Explore practice ↗</Link>
        </div>
        <EmptyState
          title="Results stay private until published."
          description="এখনো কোনো result প্রকাশিত হয়নি। Mock শেষ হলেও admin publish করার আগে result এখানে দেখা যাবে না।"
          icon="chart"
          href="/practice"
          action="Explore practice"
        />
      </section>
    </>
  );
}
