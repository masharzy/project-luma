export const modules = ["listening", "reading", "writing"] as const;
export const kinds = ["cambridge", "practice", "mock"] as const;
export type Module = typeof modules[number];
export type ExamKind = typeof kinds[number];
export type ExamDocument = { schemaVersion: 1; durationMinutes: number; audioUrl: string; parts: any[]; questions: any[] };
export function emptyDocument(module: Module): ExamDocument {
  return { schemaVersion: 1, durationMinutes: module === "listening" ? 30 : 60, audioUrl: "", parts: [], questions: [] };
}
const id = (value: any) => typeof value === "string" && /^[a-zA-Z0-9_.:-]{1,200}$/.test(value) ? value : null;
export function normalizeDocument(value: unknown, module: Module): ExamDocument {
  if (!value || typeof value !== "object") throw Error("Invalid module document.");
  const d = value as ExamDocument;
  const maxParts = module === "listening" ? 4 : module === "reading" ? 3 : 2;
  if (d.schemaVersion !== 1 || !Array.isArray(d.parts) || !Array.isArray(d.questions) || d.parts.length > maxParts || d.questions.length > 400) throw Error("Invalid parts or question count.");
  if (!Number.isInteger(d.durationMinutes) || d.durationMinutes < 1 || d.durationMinutes > 240) throw Error("Module time must be 1–240 minutes.");
  if (typeof d.audioUrl !== "string" || d.audioUrl.length > 2000) throw Error("Invalid audio URL.");
  if (d.audioUrl) { const u = new URL(d.audioUrl); if (u.protocol !== "https:" || u.username || u.password) throw Error("Audio must use an HTTPS URL."); }
  const partIds = new Set<string>(), groupIds = new Map<string, string>(), questionIds = new Set<string>(), gapIds = new Set<string>();
  const parts = d.parts.map((p, i) => {
    const partId = id(p?.id || p?.temp_id);
    if (!partId || partIds.has(partId) || !Array.isArray(p.question_groups) || p.question_groups.length > 80) throw Error("Duplicate or invalid part.");
    if (p.audio_url) { const u=new URL(p.audio_url); if(u.protocol!=="https:"||u.username||u.password||p.audio_url.length>2000)throw Error("Invalid Part audio URL."); }
    partIds.add(partId);
    const groups = p.question_groups.map((g: any) => {
      const groupId = id(g?.id || g?.temp_id);
      if (!groupId || groupIds.has(groupId) || typeof g.type !== "string" || g.type.length > 100) throw Error("Duplicate or invalid question group.");
      if (g.options !== undefined && (!Array.isArray(g.options) || g.options.length > 200 || !g.options.every((o: unknown) => typeof o === "string" && o.length <= 5000))) throw Error("Invalid group options.");
      if (g.referenceImage !== undefined && g.referenceImage !== "") {
        if (typeof g.referenceImage !== "string" || g.referenceImage.length > 1500000) throw Error("Invalid group reference image.");
        if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(g.referenceImage)) {
          const u = new URL(g.referenceImage);
          if (u.protocol !== "https:" || u.username || u.password || g.referenceImage.length > 2000) throw Error("Group image must use HTTPS or an uploaded image.");
        }
      }
      if(g.type==="source_html" && (typeof g.sourceHtml!=="string" || g.sourceHtml.length>200000 || /<(script|iframe|object|form|input|select)\b/i.test(g.sourceHtml) || /\son[a-z]+\s*=/i.test(g.sourceHtml)))throw Error("Invalid imported layout.");
      groupIds.set(groupId, partId);
      return { ...g, id: groupId };
    });
    return { ...p, id: partId, part_number: i + 1, order_index: i + 1, question_groups: groups };
  });
  const questions = d.questions.map(q => {
    const questionId = id(q?.id || q?.temp_id), partId = id(q?.part_id || q?.temp_part_id);
    if (!questionId || questionIds.has(questionId) || !partId || !partIds.has(partId)) throw Error("Duplicate question or missing parent part.");
    if (q.group_id && groupIds.get(q.group_id) !== partId) throw Error("Question group belongs to a different part.");
    if (typeof q.question_type !== "string" || q.question_type.length > 100) throw Error("Invalid question type.");
    questionIds.add(questionId);
    const tag = typeof q.question_text === "string" ? q.question_text.match(/\[\[(?:n)?\d+\]\]|\[H\d+\]|\[f\d+\]/)?.[0] : undefined;
    if (tag) { const key = `${partId}:${q.group_id || ''}:${tag}`; if (gapIds.has(key)) throw Error("A gap has more than one question. Remove the duplicate before saving."); gapIds.add(key); }
    const group = parts.find(p => p.id === partId)?.question_groups.find((g: any) => g.id === q.group_id);
    const multi = q.question_type === "list_selection" || q.ieltsQuestionType === "multiple_choice_multiple" || group?.ieltsQuestionType === "multiple_choice_multiple";
    const raw = String(q.correct_answer || "").trim();
    if(q.correct_answer_variants!==undefined && (!Array.isArray(q.correct_answer_variants)||q.correct_answer_variants.length>256||q.correct_answer_variants.some((v:unknown)=>typeof v!=="string"||!v.trim()||v.length>1000)))throw Error("Invalid accepted answers.");
    const answerCount = Array.isArray(q.correct_answer_variants) && !multi ? 1 : raw ? Math.max(1, raw.split(multi ? /[,/]/ : /,/).filter((s: string) => s.trim()).length) : Number.isInteger(q.answerCount) && q.answerCount >= 1 && q.answerCount <= 20 ? q.answerCount : 1;
    if(q.sourceNumbers && (!Array.isArray(q.sourceNumbers)||q.sourceNumbers.length!==answerCount||q.sourceNumbers.some((n:unknown)=>!Number.isInteger(n)||Number(n)<1||Number(n)>100)))throw Error("Imported answer slots do not match source numbering.");
    if (answerCount > 20) throw Error("A question supports at most 20 answer fields.");
    return { ...q, id: questionId, part_id: partId, answerCount };
  });
  for(const part of parts) for(const group of part.question_groups) if(group.type==="source_html") {
    const bindings=[...String(group.sourceHtml).matchAll(/data-luma-question="([a-zA-Z0-9_.:-]+)"/g)].map(m=>m[1]);
    const own=questions.filter(q=>q.group_id===group.id);
    if(bindings.some(id=>!own.some(q=>q.id===id))||own.some(q=>!bindings.includes(q.id)))throw Error("Imported question bindings do not match this group.");
  }
  // Materialize inline gaps immediately, including when Save is clicked before editor debounce.
  for (const part of parts) for (const group of part.question_groups) {
    const texts: string[] = [];
    const collect = (v: any) => { if (typeof v === "string") texts.push(v); else if (Array.isArray(v)) v.forEach(collect); else if (v && typeof v === "object") Object.values(v).forEach(collect); };
    collect(group.groupText); collect(group.tableRows); collect(group.sections); collect(group.flowchartData);
    if (["matching_headings", "sentence_completion_passage", "gap_fill", "drag_drop_matching"].includes(group.type)) collect(part.passage_text);
    const tags = new Set(texts.join("\n").match(/\[\[(?:n)?\d+\]\]|\[H\d+\]|\[f\d+\]/g) || []);
    if (group.type === "matching_headings") {
      const html = String(part.passage_text || "");
      for (const m of html.matchAll(/data-heading-gap=["'](\d+)["']/g)) tags.add(`[H${m[1]}]`);
    }
    for (const tag of tags) {
      if (questions.some(q => q.group_id === group.id && (String(q.question_text || "").includes(tag) || (tag.startsWith("[H") && q.gapNum === Number(tag.match(/\d+/)?.[0]))))) continue;
      if (questions.length >= 400) throw Error("A module supports at most 400 questions.");
      questions.push({ id: `gap-${crypto.randomUUID()}`, part_id: part.id, group_id: group.id,
        question_type: group.type, question_text: tag, correct_answer: "", answerCount: 1, points: 1,
        order_index: questions.length + 1, ...(tag.startsWith("[H") ? { gapNum: Number(tag.match(/\d+/)?.[0]) } : {}) });
    }
  }
  const partOrder = new Map<string, number>(parts.map((p, i) => [p.id, i]));
  const groupOrder = new Map<string, number>(parts.flatMap(p => p.question_groups.map((g: any, i: number) => [g.id, i] as const)));
  questions.sort((a, b) => (partOrder.get(a.part_id)! - partOrder.get(b.part_id)!) || ((groupOrder.get(a.group_id) ?? 999) - (groupOrder.get(b.group_id) ?? 999)) || ((Number(a.order_index) || 0) - (Number(b.order_index) || 0)));
  questions.forEach((q, i) => { q.order_index = i + 1; });
  return { schemaVersion: 1, durationMinutes: d.durationMinutes, audioUrl: d.audioUrl, parts, questions };
}
