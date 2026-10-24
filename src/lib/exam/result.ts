import { calculateObjectiveScore } from './mock-scoring';
import type { ExamDocument, Module } from './document';
export function gradeModule(module: Module, document: ExamDocument, answers: Record<string, string>) {
    if (module === 'writing') {
        const items = document.parts.map((p: any, i: number) => { const q = document.questions.find((q: any) => q.part_id === p.id); return { id: q?.id || 'writing_draft_' + p.id, label: p.title || 'Writing task ' + (i + 1), answer: answers[q?.id] || answers['writing_draft_' + p.id] || '', correctAnswer: null, correct: null }; });
        return { module, correct: null, total: null, scorePercent: null, bandScore: null, status: 'unmarked', wordCount: items.reduce((n, item) => n + (item.answer.trim() ? item.answer.trim().split(/\s+/).length : 0), 0), items };
    }
    const score = calculateObjectiveScore({ questions: document.questions, answers, moduleType: module });
    return { module, ...score, bandScore: score.total === 40 ? score.bandScore : null, status: 'marked', items: document.questions.map((q: any, i: number) => ({ id: q.id, label: 'Question ' + (Array.isArray(q.sourceNumbers)?q.sourceNumbers.join('–'):(q.order_index || i + 1)), answer: answers[q.id] || '', correctAnswer: String(q.correct_answer ?? q.correctAnswer ?? q.answer_key ?? ''), correct: score.correctness[q.id] ?? null })) };
}
