"use client";
import { useEffect, useState } from "react";
import { Toaster } from "./feedback";
import { EngineSurface } from "./engine-surface";
import dynamic from "next/dynamic";
const ExamInterface = dynamic(() => import("./exam-interface"), { ssr: false });
import type { ExamDocument, Module } from "@/lib/exam/document";
import "@/styles/exam-engine.css";
export function ExamRunner({ title, module, document, nonce }: { title: string; module: Module; document: ExamDocument; nonce?: string }) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [time, setTime] = useState(document.durationMinutes * 60);
  const [finished, setFinished] = useState(false);
  useEffect(() => { if (finished) return; const timer = setInterval(() => setTime(t => Math.max(0,t-1)),1000); return () => clearInterval(timer); },[finished]);
  if (finished) return <section className="status-section"><div className="status-sheet"><h1>Practice complete.</h1><p>Your answers were entered in this browser. A saved result is not available yet.</p><a className="button" href="/practice">Back to practice ↗</a></div></section>;
  return <EngineSurface nonce={nonce}><Toaster /><ExamInterface nonce={nonce} testTitle={title} sectionType={module} parts={document.parts} questions={document.questions} timeLeft={time} answers={answers} onAnswerChange={(id, answer) => setAnswers(a => ({...a,[id]:answer}))} onFinish={() => setFinished(true)} onExit={() => window.history.back()} sectionAudioUrl={document.audioUrl} /></EngineSurface>;
}
