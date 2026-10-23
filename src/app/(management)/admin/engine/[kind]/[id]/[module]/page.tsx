import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth/guards";
import { examParent, loadExam } from "@/lib/exam/store";
import { kinds, modules, type ExamKind, type Module } from "@/lib/exam/document";
import { EngineWorkspace } from "@/components/exam/engine-workspace";
export default async function Page({ params }: { params: Promise<{ kind: string; id: string; module: string }> }) {
  await requireAdmin(); const p = await params;
  if (!kinds.includes(p.kind as ExamKind) || !modules.includes(p.module as Module)) notFound();
  const parent = await examParent(p.kind as ExamKind, p.id);
  if (!parent || !parent.modules.includes(p.module)) notFound();
  const loaded = await loadExam(p.kind as ExamKind, p.id, p.module as Module);
  return <EngineWorkspace key={`${p.kind}:${p.id}:${p.module}`} title={parent.title} kind={p.kind as ExamKind} parentId={p.id} module={p.module as Module} initialDocument={loaded.document} initialRevision={loaded.revision} nonce={(await headers()).get("x-nonce") || undefined} />;
}
