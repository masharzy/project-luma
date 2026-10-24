'use client';
import {useState} from 'react';
import {SourceQuestionGroup} from './source-question-group';
export function SourcePassageEditor({html,questions,onChange}:{html:string;questions:any[];onChange:(html:string)=>void}){
 const [answers,setAnswers]=useState<Record<string,string>>({});
 return <section className="source-group-editor"><SourceQuestionGroup group={{sourceHtml:html}} questions={questions} answers={answers} onAnswerChange={(id,value)=>setAnswers(a=>({...a,[id]:value}))}/><details><summary>Edit imported passage layout</summary><label>Passage HTML<textarea rows={16} value={html} onChange={e=>onChange(e.target.value)}/></label><p>Keep all question bindings when editing. Preview answers are not saved.</p></details></section>;
}
export function SourceGroupEditor({group,questions,onGroupChange,onQuestionChange}:{group:any;questions:any[];onGroupChange:(patch:any)=>void;onQuestionChange:(id:string,value:string)=>void}){
 const [answers,setAnswers]=useState<Record<string,string>>({});return <section className="source-group-editor"><SourceQuestionGroup group={group} questions={questions} answers={answers} onAnswerChange={(id,value)=>setAnswers(a=>({...a,[id]:value}))}/><details><summary>Edit imported layout and answer key</summary><label>Question layout<textarea rows={12} value={group.sourceHtml||''} onChange={e=>onGroupChange({sourceHtml:e.target.value})}/></label><p>Keep the question bindings when editing the layout. Preview your changes above.</p>{questions.map(q=><label key={q.id}>Question {(q.sourceNumbers||[]).join('–')}<input value={q.correct_answer||''} onChange={e=>onQuestionChange(q.id,e.target.value)}/></label>)}</details></section>;
}
