import { percentToBand } from './band';

type SectionLike = { id: string; section_type?: string | null };
type PartLike = { id: string; section_id?: string | null };
type QuestionLike = {
  id: string;
  part_id?: string | null;
  question_text?: string | null;
  correct_answer?: string | null;
  correct_answer_variants?: string[];
  correctAnswer?: string | null;
  answer_key?: string | null;
  question_type?: string | null;
  ieltsQuestionType?: string | null;
  options?: any[] | Record<string, any> | string | null;
  mcq_options?: any[] | Record<string, any> | string | null;
  choices?: any[] | Record<string, any> | string | null;
  choice_options?: any[] | Record<string, any> | string | null;
  answer_options?: any[] | Record<string, any> | string | null;
};

function normalizeForCompare(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim().toLowerCase();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim().toLowerCase();
  if (Array.isArray(value)) return value.map((item) => normalizeForCompare(item)).join('|');
  try {
    return JSON.stringify(value).trim().toLowerCase();
  } catch {
    return String(value).trim().toLowerCase();
  }
}

function optionText(option: unknown): string {
  if (option == null) return '';
  if (typeof option === 'string') return option;
  if (typeof option === 'number' || typeof option === 'boolean') return String(option);
  if (typeof option === 'object') {
    const obj = option as Record<string, any>;
    return String(obj.text ?? obj.value ?? obj.option ?? obj.label ?? obj.title ?? '');
  }
  return String(option);
}

function getOptionsArray(question: QuestionLike): any[] {
  const raw = question.options ?? question.mcq_options ?? question.choices ?? question.choice_options ?? question.answer_options;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    const text = raw.trim();
    if (text.startsWith('[') || text.startsWith('{')) {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === 'object') return Object.values(parsed);
      } catch {
        // fall through to newline parsing
      }
    }
    return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  }
  if (raw && typeof raw === 'object') {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const byLetter: any[] = [];
    for (const letter of letters) {
      if ((raw as Record<string, any>)[letter] != null) byLetter.push((raw as Record<string, any>)[letter]);
      if ((raw as Record<string, any>)[letter.toLowerCase()] != null) byLetter.push((raw as Record<string, any>)[letter.toLowerCase()]);
    }
    if (byLetter.length) return byLetter;
    return Object.values(raw);
  }
  return [];
}

function resolveOptionAnswer(value: unknown, question: QuestionLike): string {
  const answer = value == null ? '' : String(value).trim();
  const options = getOptionsArray(question);
  if (options.length > 0) {
    const letterMatch = answer.match(/^([A-Za-z])(?:[).:\-].*)?$/);
    if (letterMatch) {
      const index = letterMatch[1].toUpperCase().charCodeAt(0) - 65;
      if (index >= 0 && index < options.length) return optionText(options[index]);
    }
    const romanMap: Record<string, number> = {
      I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10,
      XI: 11, XII: 12, XIII: 13, XIV: 14, XV: 15, XVI: 16, XVII: 17, XVIII: 18, XIX: 19, XX: 20,
    };
    const romanIndex = romanMap[answer.toUpperCase()];
    if (romanIndex) {
      const index = romanIndex - 1;
      if (index >= 0 && index < options.length) return optionText(options[index]);
    }
    if (/^\d+$/.test(answer)) {
      const index = parseInt(answer, 10) - 1;
      if (index >= 0 && index < options.length) return optionText(options[index]);
    }
  }
  return answer;
}

function correctAnswerValues(question: QuestionLike): string[] {
  if(Array.isArray(question.correct_answer_variants)) return question.correct_answer_variants;
  const raw = question.correct_answer ?? question.correctAnswer ?? question.answer_key ?? '';
  return String(raw)
    .split(/[,/]/)
    .map((answer) => answer.trim())
    .filter(Boolean);
}

function placeholderCount(question: QuestionLike) {
  const text = String(question.question_text || '');
  const matches = text.match(/\[\[(?:n)?\d+\]\]/g);
  return matches ? matches.length : 0;
}

function splitFieldValues(raw: unknown): string[] {
  return String(raw ?? '')
    .split(',')
    .map((answer) => answer.trim())
    .filter(Boolean);
}

function fieldAlternatives(raw: unknown): string[] {
  return String(raw ?? '')
    .split('/')
    .map((answer) => answer.trim())
    .filter(Boolean);
}

function isMultiAnswerChoice(question: QuestionLike) {
  const type = String(question.question_type || '').toLowerCase();
  const variant = String(question.ieltsQuestionType || '').toLowerCase();
  const correct = String(question.correct_answer ?? question.correctAnswer ?? question.answer_key ?? '');
  return type === 'list_selection' || variant === 'multiple_choice_multiple' || (type === 'multiple_choice' && correct.includes(','));
}

function allowsOptionTextAnswer(question: QuestionLike) {
  const type = String(question.question_type || '').toLowerCase();
  return type === 'matching_headings' || type === 'matching_sentence_endings';
}

function answersEquivalent(userAnswer: unknown, correctAnswer: unknown, question: QuestionLike) {
  const userRaw = normalizeForCompare(userAnswer);
  const correctRaw = normalizeForCompare(correctAnswer);
  if (userRaw === correctRaw) return true;

  if (!allowsOptionTextAnswer(question)) return false;

  const userResolved = normalizeForCompare(resolveOptionAnswer(userAnswer, question));
  const correctResolved = normalizeForCompare(resolveOptionAnswer(correctAnswer, question));
  return userRaw === correctResolved || userResolved === correctRaw || userResolved === correctResolved;
}

function countOrderlessMatches(userParts: string[], correctParts: string[], question: QuestionLike): number {
  const unusedCorrect = [...correctParts];
  let count = 0;
  for (const userPart of userParts) {
    const idx = unusedCorrect.findIndex((correctPart) =>
      fieldAlternatives(correctPart).some((alt) => answersEquivalent(userPart, alt, question))
    );
    if (idx !== -1) {
      count += 1;
      unusedCorrect.splice(idx, 1);
    }
  }
  return count;
}

function objectiveFieldCount(question: QuestionLike, correctParts: string[]): number {
  const type = String(question.question_type || '').toLowerCase();
  return Math.max(
    placeholderCount(question),
    type === 'short_answer' || isMultiAnswerChoice(question) ? correctParts.length : 0,
    1
  );
}

export function isObjectiveQuestion(question: QuestionLike) {
  const type = String(question.question_type || '').toLowerCase();
  if (['writing', 'writing_task', 'task1', 'task2'].includes(type)) return false;
  return correctAnswerValues(question).length > 0;
}

export function isObjectiveAnswerCorrect(userAnswer: unknown, question: QuestionLike) {
  if (!isObjectiveQuestion(question)) return false;

  const correctPartsForFields = splitFieldValues(question.correct_answer ?? question.correctAnswer ?? question.answer_key ?? '');
  const fields = objectiveFieldCount(question, correctPartsForFields);
  if (fields > 1) {
    const userParts = splitFieldValues(userAnswer);
    const correctParts = correctPartsForFields;
    if (userParts.length < fields || correctParts.length < fields) return false;
    if (isMultiAnswerChoice(question)) {
      return userParts.length === fields && countOrderlessMatches(userParts, correctParts, question) === fields;
    }
    return Array.from({ length: fields }).every((_, idx) => {
      const userRaw = normalizeForCompare(userParts[idx]);
      if (!userRaw) return false;
      const userResolved = normalizeForCompare(resolveOptionAnswer(userParts[idx], question));
      return fieldAlternatives(correctParts[idx]).some((correct) => {
        const correctRaw = normalizeForCompare(correct);
        const correctResolved = normalizeForCompare(resolveOptionAnswer(correct, question));
        return userRaw === correctRaw || userRaw === correctResolved || userResolved === correctRaw || userResolved === correctResolved;
      });
    });
  }

  const userRaw = normalizeForCompare(userAnswer);
  if (!userRaw) return false;

  return correctAnswerValues(question).some((correct) => answersEquivalent(userAnswer, correct, question));
}

export function calculateObjectiveScore(input: {
  questions: QuestionLike[];
  answers: Record<string, any>;
  moduleType?: 'listening' | 'reading' | string | null;
}) {
  const correctness: Record<string, boolean | null> = {};
  let total = 0;
  let correct = 0;

  for (const question of input.questions || []) {
    if (!isObjectiveQuestion(question)) {
      correctness[question.id] = null;
      continue;
    }

    const correctParts = splitFieldValues(question.correct_answer ?? question.correctAnswer ?? question.answer_key ?? '');
    const fields = objectiveFieldCount(question, correctParts);
    total += fields;
    const userParts = splitFieldValues(input.answers?.[question.id]);
    if (fields > 1) {
      if (isMultiAnswerChoice(question)) {
        const fieldCorrect = countOrderlessMatches(userParts, correctParts, question);
        correctness[question.id] = userParts.length === fields && fieldCorrect === fields;
        correct += fieldCorrect;
        continue;
      }

      let fieldCorrect = 0;
      for (let idx = 0; idx < fields; idx += 1) {
        const userRaw = normalizeForCompare(userParts[idx]);
        const userResolved = normalizeForCompare(resolveOptionAnswer(userParts[idx], question));
        const ok = Boolean(userRaw) && fieldAlternatives(correctParts[idx]).some((fieldCorrectAnswer) => {
          const correctRaw = normalizeForCompare(fieldCorrectAnswer);
          const correctResolved = normalizeForCompare(resolveOptionAnswer(fieldCorrectAnswer, question));
          return userRaw === correctRaw || userRaw === correctResolved || userResolved === correctRaw || userResolved === correctResolved;
        });
        if (ok) fieldCorrect += 1;
      }
      correctness[question.id] = fieldCorrect === fields;
      correct += fieldCorrect;
      continue;
    }

    const ok = isObjectiveAnswerCorrect(input.answers?.[question.id], question);
    correctness[question.id] = ok;
    if (ok) correct += 1;
  }

  const scorePercent = total > 0 ? Math.round((correct / total) * 100) : null;
  const bandScore = scorePercent == null ? null : percentToBand(scorePercent, input.moduleType || 'reading');

  return { correctness, total, correct, scorePercent, bandScore };
}

export function calculateMockObjectiveBands(input: {
  sections: SectionLike[];
  parts: PartLike[];
  questions: QuestionLike[];
  answers: Record<string, any>;
}) {
  const sectionTypeById = new Map(input.sections.map((section) => [section.id, section.section_type]));
  const sectionTypeByPartId = new Map(input.parts.map((part) => [part.id, sectionTypeById.get(part.section_id || '')]));

  const readingQuestions = (input.questions || []).filter((question) => sectionTypeByPartId.get(question.part_id || '') === 'reading');
  const listeningQuestions = (input.questions || []).filter((question) => sectionTypeByPartId.get(question.part_id || '') === 'listening');
  const reading = calculateObjectiveScore({ questions: readingQuestions, answers: input.answers, moduleType: 'reading' });
  const listening = calculateObjectiveScore({ questions: listeningQuestions, answers: input.answers, moduleType: 'listening' });

  return {
    readingCorrect: reading.correct,
    readingTotal: reading.total,
    readingBand: reading.bandScore,
    listeningCorrect: listening.correct,
    listeningTotal: listening.total,
    listeningBand: listening.bandScore,
  };
}

export function calculateOverallBand(bands: Array<number | null | undefined>) {
  const validBands = bands.filter((band): band is number => typeof band === 'number' && Number.isFinite(band));
  if (validBands.length === 0) return null;
  return Math.round((validBands.reduce((sum, band) => sum + band, 0) / validBands.length) * 2) / 2;
}
