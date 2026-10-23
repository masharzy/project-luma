import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { examParent, loadExam } from "@/lib/exam/store";
import { kinds, modules, type ExamKind, type Module } from "@/lib/exam/document";
import { WorkspaceHeading } from "@/components/page-parts";
export default async function Page({ params }: { params: Promise<{ kind: string; id: string }> }) {
  await requireAdmin(); const { kind, id } = await params;
  if (!kinds.includes(kind as ExamKind)) notFound();
  const parent = await examParent(kind as ExamKind, id); if (!parent) notFound();
  const available = parent.modules.filter(m => modules.includes(m as Module)) as Module[];
  const records = await Promise.all(available.map(module => loadExam(kind as ExamKind, id, module)));
  return <><WorkspaceHeading eyebrow="QUESTION ENGINE / MODULES" title={parent.title} description="একটি module বেছে parts, passage ও question groups edit করো। Preview-তে একই exam interface দেখাবে।" />
    <div className="admin-item-grid">{available.map((module, i) => <article className="workspace-panel admin-item-card" key={module}>
      <span className="access-pill">{records[i].revision ? `REVISION ${records[i].revision}` : "NOT ADDED"}</span>
      <h2>{module[0].toUpperCase()+module.slice(1)}</h2><p>{records[i].document.parts.length} parts · {records[i].document.questions.length} questions · {records[i].document.durationMinutes} min</p>
      <Link className="button" href={`/admin/engine/${kind}/${id}/${module}`}>Edit questions ↗</Link>
    </article>)}</div><p className="auth-switch"><Link href={kind === "cambridge" ? "/admin/cambridge" : kind === "mock" ? "/admin/mocks" : "/admin/practice"}>← Back to collection</Link></p></>;
}
