import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { ExamRunner } from "@/components/exam/exam-runner";
import { kinds, modules, type ExamKind, type Module } from "@/lib/exam/document";
import { examParent, loadExam, learnerDocument } from "@/lib/exam/store";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ kind: string; id: string; module: string }> }) {
  const p = await params;
  if (!kinds.includes(p.kind as ExamKind) || !modules.includes(p.module as Module)) notFound();
  const parent = await examParent(p.kind as ExamKind,p.id);
  if (!parent || parent.status !== "published" || parent.access !== "free" || !parent.modules.includes(p.module) || p.kind === "mock") notFound();
  const data = await loadExam(p.kind as ExamKind,p.id,p.module as Module);
  if (!data.revision || !data.document.parts.length) notFound();
  return <ExamRunner key={`${p.kind}:${p.id}:${p.module}`} title={parent.title} module={p.module as Module} document={learnerDocument(data.document)} nonce={(await headers()).get("x-nonce") || undefined} />;
}
