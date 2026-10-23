"use client";

import React from "react";
import { cn } from "@/lib/exam/utils";

export interface FlowchartStep {
  id: string;
  text: string;
  type: 'step' | 'split';
  theories?: Array<{ title: string; text: string }>;
}

export interface FlowchartData {
  type: 'scientific' | 'boxed';
  steps: FlowchartStep[];
}

interface FlowchartRendererProps {
  group: any;
  groupQs: any[];
  answers?: Record<string, string>;
  onAnswerChange?: (id: string, val: string) => void;
  showResults?: boolean;
  checkAnswer?: (id: string) => boolean | null;
  fullQuestions?: any[];
  isEditor?: boolean;
}

export const FlowchartRenderer = ({
  group,
  groupQs,
  fullQuestions = [],
  answers = {},
  onAnswerChange,
  showResults = false,
  checkAnswer,
  isEditor = false,
}: FlowchartRendererProps) => {
  const flowchartData: FlowchartData | null = group.flowchartData || null;
  const diagramTitle = group.diagramTitle || "";
  
  const renderGap = (content: string) => {
    if (!content) return null;
    // Extract gaps like [f1]
    const parts = content.split(/(\[f\d+\])/g);
    
    return parts.map((part, i) => {
      const match = part.match(/^\[f(\d+)\]$/);
        if (match) {
          const gapNum = parseInt(match[1]);
          // Find the question for this gap number
          // First try to find by specific tag [fN], then by gapNum property, then by index in group
          const q = groupQs.find((sq: any) => (sq.question_text || "").includes(`[f${gapNum}]`))
                 || groupQs.find((sq: any) => sq.gapNum === gapNum)
                 || groupQs[gapNum - 1];
          
          if (q) {
            const qId = q.id || q.temp_id;
            const answer = answers[qId];
            const isCorrect = showResults ? checkAnswer?.(qId) : null;
            
            // Get global question number from fullQuestions if provided
            let displayNum = gapNum;
            if (fullQuestions && fullQuestions.length > 0) {
              const globalIdx = fullQuestions.findIndex(fq => (fq.id || fq.temp_id) === qId);
              if (globalIdx !== -1) displayNum = globalIdx + 1;
            }

          
          if (isEditor) {
            return (
              <span key={i} className="inline-flex items-center mx-1 align-baseline whitespace-nowrap">
                <span className="text-gray-900 font-bold mr-1">{displayNum}</span>
                <span className="border-b-2 border-gray-400 min-w-[80px] inline-block text-center text-gray-300 font-serif italic pb-0.5">..................</span>
              </span>
            );
          }

          return (
            <span key={i} className="inline-flex items-center mx-1 align-baseline whitespace-nowrap pointer-events-auto">
              <span className="text-gray-900 font-bold mr-1">{displayNum}</span>
              <input 
                value={answer || ""}
                onChange={(e) => onAnswerChange?.(qId, e.target.value)}
                className={cn(
                  "w-32 h-7 border-b-2 border-t-0 border-l-0 border-r-0 rounded-none bg-white px-2 focus:ring-0 text-[14px] transition-all text-center outline-none mx-1 font-bold font-serif pb-0.5 pointer-events-auto",
                  answer 
                    ? isCorrect === true ? "border-green-600 text-green-700 bg-green-50"
                    : isCorrect === false ? "border-red-600 text-red-700 bg-red-50"
                    : "border-gray-900 text-gray-900"
                    : "border-gray-400 focus:border-gray-900"
                )}
                placeholder=".................."
              />
              {showResults && isCorrect === false && (
                <span className="text-[11px] text-red-600 ml-1 font-black uppercase bg-red-50 px-1 rounded">[{q.correct_answer || q.correctAnswer}]</span>
              )}
            </span>
          );
        }
        return (
          <span key={i} className="inline-flex items-center mx-1 align-baseline whitespace-nowrap">
            <span className="text-gray-900 font-bold mr-1">{gapNum}</span>
            <span className="border-b-2 border-gray-400 min-w-[80px] inline-block text-center text-gray-300 font-serif italic pb-0.5">..................</span>
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  // Type: Boxed Instructional Flowchart (Image 1 Style)
  if (flowchartData?.type === 'boxed') {
    const steps = flowchartData.steps;
    
    return (
      <div className="w-full max-w-xl mx-auto my-8 font-sans">
        <div className="border-2 border-gray-800 bg-white shadow-sm overflow-hidden">
          {diagramTitle && (
            <div className="border-b-2 border-gray-800 py-3 px-6 bg-white text-center">
              <h3 className="font-black text-gray-900 text-lg tracking-tight uppercase">{diagramTitle}</h3>
            </div>
          )}
          
          <div className="flex flex-col">
            {steps.map((step: any, idx: number) => (
              <React.Fragment key={step.id}>
                <div className="p-5 text-center bg-white">
                  <div className="text-[15px] font-bold leading-relaxed text-gray-800">
                    {renderGap(step.text)}
                  </div>
                </div>
                {idx < steps.length - 1 && (
                  <div className="flex flex-col items-center">
                    {/* Arrow in a box divider */}
                    <div className="w-full border-t-2 border-gray-800 py-2 bg-white flex justify-center">
                      <div className="w-10 h-8 flex items-center justify-center bg-white">
                        <span className="text-gray-900 text-xl font-bold leading-none">↓</span>
                      </div>
                    </div>
                    <div className="w-full border-t-2 border-gray-800" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Type: Vertical Scientific / Process Flowchart (Image 2 Style)
  const steps = flowchartData?.steps || [];

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-2 my-8 font-sans">
      {diagramTitle && (
        <div className="mb-6">
          <h3 className="text-center font-black text-gray-900 text-lg tracking-tight uppercase border-b-2 border-gray-800 pb-1">{diagramTitle}</h3>
        </div>
      )}
      
      {steps.map((step: any, idx: number) => {
        if (step.type === 'split' && step.theories) {
          const theoryCount = step.theories.length;
          // Use flex-wrap for multiple theories
          return (
            <div key={step.id} className="w-full flex flex-col items-center">
               {/* No arrow above theories as requested */}
               <div className={cn(
                 "w-full flex flex-wrap justify-center gap-12 py-4 px-2",
                 theoryCount > 2 ? "gap-x-12 gap-y-8" : "gap-24"
               )}>
                {step.theories.map((theory: any, tIdx: number) => (
                  <div key={tIdx} className="flex flex-col items-center min-w-[200px] flex-1">
                    {theory.title && (
                      <div className="text-[15px] font-black text-gray-900 mb-4 text-center">
                        {theory.title}:
                      </div>
                    )}
                    <div className="text-[14px] leading-relaxed text-gray-800 text-center bg-white p-2 rounded-lg border border-gray-200 shadow-sm w-full">
                      {renderGap(theory.text)}
                    </div>
                  </div>
                ))}
              </div>
              {idx < steps.length - 1 && (
                <div className="flex flex-col items-center mt-4">
                  <div className="text-gray-400 text-2xl font-light">↓</div>
                </div>
              )}
            </div>
          );
        }

        return (
          <React.Fragment key={step.id}>
            <div className="w-full max-w-lg py-2 text-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
              <div className="text-[16px] leading-relaxed text-gray-900 font-medium">
                {renderGap(step.text)}
              </div>
            </div>
            {idx < steps.length - 1 && (
              <div className="flex flex-col items-center my-1">
                <div className="text-gray-400 text-2xl font-light">↓</div>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
