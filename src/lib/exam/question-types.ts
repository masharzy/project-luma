/** Public classification and safe preview helpers for the Cambridge Question Type bank. */
export const objectivePracticeModules = ['listening', 'reading'] as const;
export type PracticeModule = typeof objectivePracticeModules[number];
export const MAX_PRACTICE_QUESTIONS = 40;
export const PAGE_SIZE = 24;
const known: Record<string, string> = {
  multiple_choice: 'Multiple Choice',
  multiple_choice_single: 'Multiple Choice (single answer)',
  multiple_choice_multiple: 'Multiple Choice (multiple answers)',
  true_false_not_given: 'True / False / Not Given',
  yes_no_not_given: 'Yes / No / Not Given',
  matching_headings: 'Matching Headings',
  matching_information: 'Matching Information',
  matching_features: 'Matching Features',
  matching_sentence_endings: 'Matching Sentence Endings',
  sentence_completion: 'Sentence Completion',
  summary_completion: 'Summary Completion',
  note_completion: 'Note Completion',
  table_completion: 'Table Completion',
  flowchart_completion: 'Flowchart Completion',
  flow_chart_completion: 'Flowchart Completion',
  diagram_labelling: 'Diagram / Map Labelling',
  map_labelling: 'Diagram / Map Labelling',
  plan_labelling: 'Diagram / Map Labelling',
  short_answer: 'Short Answer',
  form_completion: 'Form Completion',
  gap_fill: 'Gap Fill',
  list_selection: 'Multiple Choice (multiple answers)',
  drag_drop_matching: 'Drag & Drop Matching',
  matching: 'Matching',
  classification: 'Classification',
  selection: 'Selection',
};
export function questionType(q: Record<string, any>, group?: Record<string, any>): string {
  const raw = String(q.ieltsQuestionType || group?.ieltsQuestionType || q.question_type || group?.type || 'other').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  if (q.question_type === 'list_selection') return 'multiple_choice_multiple';
  if (raw === 'multiple_choice' && q.question_type === 'list_selection') return 'multiple_choice_multiple';
  if (raw === 'source_html' || raw === 'source_text' || !raw) return 'other';
  return raw.length <= 60 ? raw : 'other';
}
export function questionTypeLabel(type: string): string {
  return known[type] || (type === 'other' ? 'Other Questions' : type.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase()));
}
export function previewText(value: unknown): string {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ').replace(/&(?:nbsp|#160);/gi, ' ')
    .replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/\[\[(?:n)?\d+\]\]/g, '______').replace(/\s+/g, ' ').trim().slice(0, 180);
}
export function validPracticeModules(modules: unknown): modules is PracticeModule[] {
  return Array.isArray(modules) && modules.length >= 1 && modules.length <= 2
    && new Set(modules).size === modules.length
    && modules.every(m => objectivePracticeModules.includes(m as PracticeModule));
}
export function validPracticeTypes(types: unknown): types is string[] {
  return Array.isArray(types) && types.length <= 25 && new Set(types).size === types.length
    && types.every(t => typeof t === 'string' && /^[a-z][a-z0-9_]{0,59}$/.test(t));
}
