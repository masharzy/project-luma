"use client";
import { useRef, useState } from "react";
import { Toaster, toast } from "./feedback";
import { EngineSurface } from "./engine-surface";
import VisualEditor from "./visual-editor";
import ExamInterface from "./exam-interface";
import { normalizeDocument, type ExamDocument, type ExamKind, type Module } from "@/lib/exam/document";
import "@/styles/exam-engine.css";
export function EngineWorkspace({ title, kind, parentId, module, initialDocument, initialRevision, nonce, container, onExit, onSaved }: { title: string; kind: ExamKind; parentId: string; module: Module; initialDocument: ExamDocument; initialRevision: number; nonce?: string;container?:HTMLElement|null;onExit?:()=>void;onSaved?:(document:ExamDocument)=>void }) {
  const revision = useRef(initialRevision);
  const [preview, setPreview] = useState<ExamDocument | null>(null);
  const [duration, setDuration] = useState(String(initialDocument.durationMinutes));
  const [audio, setAudio] = useState(initialDocument.audioUrl);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const exit = () => {if(onExit){if(window.confirm("Return to mock setup? Save your questions first."))onExit();return;} if (window.confirm("Leave the editor? Save your changes first.")) window.location.assign(kind === "cambridge" ? "/admin/cambridge" : kind === "mock" ? "/admin/mocks" : "/admin/practice"); };
  return <EngineSurface nonce={nonce} container={container}>
    <Toaster richColors />
    <div style={{ display: preview ? "none" : "contents" }}><VisualEditor testTitle={title} section={{ id: `${kind}-${parentId}-${module}`, section_type: module }} parts={initialDocument.parts} questions={initialDocument.questions}
      moduleTimeMinutes={duration} onModuleTimeChange={setDuration} sectionAudioUrl={audio} onSectionAudioChange={setAudio} onExit={exit}
      onPreview={data => { setPreview(normalizeDocument({ ...initialDocument, ...data, durationMinutes: Number(duration), audioUrl: audio }, module)); setAnswers({}); }}
      onSave={async data => {
        const document = normalizeDocument({ ...initialDocument, ...data, durationMinutes: Number(duration), audioUrl: audio }, module);
        const response = await fetch(`/api/admin/exam-modules/${kind}/${parentId}/${module}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision: revision.current, document }) });
        const result = await response.json();
        if (!response.ok) { toast.error(result.error || "Save failed"); throw Error(result.error || "Save failed"); }
        revision.current = result.revision;onSaved?.(document);
      }} /></div>
    {preview && <ExamInterface nonce={nonce} testTitle={`${title} · Preview`} sectionType={module} parts={preview.parts} questions={preview.questions} timeLeft={preview.durationMinutes * 60} answers={answers} onAnswerChange={(id, answer) => setAnswers(previous => ({ ...previous, [id]: answer }))} onFinish={() => setPreview(null)} onExit={() => setPreview(null)} sectionAudioUrl={preview.audioUrl} />}
  </EngineSurface>;
}
