"use client";

import {SourceGroupEditor,SourcePassageEditor} from "./source-group-editor";
import { normalizeDocument, type Module } from "@/lib/exam/document";
import React, {
  useState,
  useEffect,
  useRef,
  Fragment,
  type MouseEvent as ReactMouseEvent,
  useMemo,
  useCallback,
} from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extension-placeholder";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  Flag,
  Volume2,
  ArrowRight,
  HelpCircle,
  LogOut,
  Save,
  Plus,
  Trash2,
  Image as ImageIcon,
  Table as TableIcon,
  Type,
  List,
  Layout as LayoutIcon,
  Settings,
  AudioLines,
  FileText,
  Play,
  Pause,
  Wifi,
  Bell,
  Loader2,
  Menu,
  MousePointer2,
  CheckCircle2,
  Layers,
  Copy,
  ChevronDown,
  ChevronUp,
  Upload,
  Minus,
  PenTool,
} from "lucide-react";
import { Button } from "@/components/exam/ui/button";
import { Input } from "@/components/exam/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/exam/ui/radio-group";
import { Label } from "@/components/exam/ui/label";
import { Textarea } from "@/components/exam/ui/textarea";
import { cn } from "@/lib/exam/utils";
import { toast } from "./feedback";
import {
  FlowchartRenderer,
  type FlowchartData,
  type FlowchartStep,
} from "@/components/exam/FlowchartRenderer";
import PassageEditor from "@/components/exam/PassageEditor";
import { AdminAudioUploader } from "@/components/exam/admin-audio";

interface CDIAdminEditorProps {
  onPreview?: (data: { parts: any[]; questions: any[] }) => void;
  testTitle: string;
  section: any;
  parts: any[];
  questions: any[];
  questionOffset?: number;
  testId?: string;
  moduleTimeMinutes?: string;
  savingModuleTime?: boolean;
  onModuleTimeChange?: (value: string) => void;
  onSaveModuleTime?: () => void;
  sectionAudioUrl?: string;
  savingSectionAudio?: boolean;
  onSectionAudioChange?: (url: string) => void;
  onSaveSectionAudio?: (url: string) => void;
  onSave: (data: {
    parts: any[];
    questions: any[];
    deletedPartIds: string[];
    deletedQuestionIds: string[];
  }) => Promise<void>;
  onExit: () => void;
}

const QUESTION_TYPES = [
  {
    id: "multiple_choice",
    label: "Multiple Choice (one answer)",
    icon: "◉",
    description: "Choose one correct option from A, B, C...",
  },
  {
    id: "multiple_choice_multiple",
    label: "Multiple Choice (more than one answer)",
    icon: "☑",
    description: "Choose two or more correct options from A, B, C...",
  },
  {
    id: "true_false_ng",
    label: "Identifying Information (True/False/Not Given)",
    icon: "T/F",
    description: "TRUE, FALSE, or NOT GIVEN statements",
  },
  {
    id: "yes_no_ng",
    label: "Yes No Not Given",
    icon: "Y/N",
    description: "YES, NO, or NOT GIVEN statements",
  },
  {
    id: "matching_headings",
    label: "List of Headings",
    icon: "I–VII",
    description: "Drag headings into passage gaps",
  },
  {
    id: "paragraph_matching",
    label: "Paragraph Matching",
    icon: "¶",
    description: "Match statements to paragraphs/places A, B, C...",
  },
  {
    id: "matching_features",
    label: "Matching Features",
    icon: "▦",
    description: "Official matrix/table matching with A, B, C... columns",
  },
  {
    id: "matching_sentence_endings",
    label: "Matching Sentence Endings",
    icon: "↔",
    description: "Match sentence beginnings with ending options",
  },
  {
    id: "sentence_completion",
    label: "Sentence Completion",
    icon: "___",
    description: "Type answers into sentence gaps",
  },
  {
    id: "summary_completion",
    label: "Summary Completion (selecting words from the text)",
    icon: "TXT",
    description: "Type words from the passage into summary gaps",
  },
  {
    id: "summary_completion_drag",
    label: "Summary Completion (selecting from a list of words or phrases)",
    icon: "DRG",
    description: "Use a word/phrase list for summary gaps",
  },
  {
    id: "note_completion",
    label: "Note Completion",
    icon: "NOTE",
    description: "Type answers into note/bullet gaps",
  },
  {
    id: "table_completion",
    label: "Table Completion",
    icon: "TABLE",
    description: "Fill gaps inside a table",
  },
  {
    id: "flowchart_completion_drag",
    label: "Flow-chart Completion (selecting from a list of words or phrases)",
    icon: "FLOW",
    description: "Complete a flow-chart using a word/phrase list",
  },
  {
    id: "diagram_labelling_type_a",
    label: "Plan/Map/Diagram Labelling (Type A)",
    icon: "MAP",
    description: "Image with A, B, C... answer choices in a matrix",
  },
  {
    id: "choosing_a_title",
    label: "Choosing a Title",
    icon: "TITLE",
    description: "Choose the best title for the passage",
  },
  {
    id: "short_answer",
    label: "Short Answer Questions",
    icon: "ANS",
    description: "Type a short written answer",
  },
];

const getStorageQuestionType = (type: string) => {
  switch (type) {
    case "multiple_choice_multiple":
      return "multiple_choice";
    case "summary_completion_drag":
      return "summary_completion";
    case "flowchart_completion_drag":
      return "flowchart_completion";
    case "diagram_labelling_type_a":
      return "diagram_completion";
    default:
      return type;
  }
};

const usesWordBank = (type: string) =>
  type === "summary_completion_drag" || type === "flowchart_completion_drag";

const getEffectiveQuestionType = (group: any) =>
  getStorageQuestionType(group?.ieltsQuestionType || group?.type || "");

const isNoteCompletionGroup = (group: any) =>
  getEffectiveQuestionType(group) === "note_completion" ||
  group?.type === "note_completion";

const isInlineGapCompletionGroup = (group: any) => {
  const type = getEffectiveQuestionType(group);
  return (
    type === "summary_completion" ||
    type === "note_completion" ||
    type === "sentence_completion"
  );
};

const getInlineGapCount = (group: any) => {
  if (!isInlineGapCompletionGroup(group)) return null;
  const text = String(group?.groupText || "");
  const matches = text.match(/\[\[(?:n)?\d+\]\]/g);
  return matches ? new Set(matches).size : 0;
};

const getAnswerFieldParts = (answer: any) => {
  const raw = String(answer || "");
  if (!raw.trim()) return [""];
  return raw.split(",").map((part) => part.trim());
};

const getQuestionDisplayCount = (question: any) => {
  if (!String(question?.correct_answer || "").trim() && Number.isInteger(question?.answerCount) && question.answerCount > 0) return question.answerCount;
  const variant = String(question?.ieltsQuestionType || "");
  const parts = getAnswerFieldParts(question?.correct_answer);
  if (question?.question_type === "short_answer" || variant === "multiple_choice_multiple" || String(question?.correct_answer || "").includes(",")) {
    return Math.max(1, parts.filter((part) => part.trim()).length || parts.length);
  }
  return 1;
};

const getGroupDisplayCount = (group: any, groupQuestions: any[]) => {
  const inlineCount = getInlineGapCount(group);
  if (inlineCount != null) return inlineCount;
  return groupQuestions.reduce((sum, q) => sum + getQuestionDisplayCount(q), 0);
};

const formatGapTagsForAdminText = (groupText: string, isNote: boolean) => {
  const value = String(groupText || "");
  return isNote
    ? value.replace(/\[\[n(\d+)\]\]/g, "[gap$1]")
    : value.replace(/\[\[(\d+)\]\]/g, "[gap$1]");
};

const parseAdminGapLabelsText = (displayText: string, isNote: boolean) => {
  return String(displayText || "").replace(/\[gap\s*(\d+)\]/gi, (_match, num) =>
    isNote ? `[[n${num}]]` : `[[${num}]]`,
  );
};

function CompletionRichEditor({
  value,
  groupId,
  isNote = false,
  placeholder = "Type content here. Use Insert Gap where the student answer field should appear.",
  onChange,
  onSync,
}: {
  value: string;
  groupId: string;
  isNote?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
  onSync: (value: string) => void;
}) {
  const editor = useEditor({
    injectCSS: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [3] },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: formatGapTagsForAdminText(value || "", isNote),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-[190px] px-4 py-3 text-[14px] font-normal leading-[1.75] text-gray-900 outline-none prose prose-sm max-w-none [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-7 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-7 [&_li]:my-1 [&_h3]:my-3 [&_h3]:text-[16px] [&_h3]:font-bold [&_strong]:font-bold",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(parseAdminGapLabelsText(editor.getHTML(), isNote));
    },
    onBlur: ({ editor }) => {
      const nextValue = parseAdminGapLabelsText(editor.getHTML(), isNote);
      onChange(nextValue);
      onSync(nextValue);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const nextHtml = formatGapTagsForAdminText(value || "", isNote);
    if (editor.getHTML() !== nextHtml) {
      editor.commands.setContent(nextHtml, { emitUpdate: false });
    }
  }, [editor, isNote, value]);

  const insertGap = () => {
    if (!editor) return;
    const existing = value.match(isNote ? /\[\[n(\d+)\]\]/g : /\[\[(\d+)\]\]/g) || [];
    const nextNum = existing.length
      ? Math.max(...existing.map((gap) => parseInt(gap.match(/\d+/)?.[0] || "0", 10))) + 1
      : 1;
    editor.chain().focus().insertContent(`[gap${nextNum}]`).run();
    const nextValue = parseAdminGapLabelsText(editor.getHTML(), isNote);
    onChange(nextValue);
    onSync(nextValue);
    toast.success(`Gap ${nextNum} added to content`);
  };

  const toolbarButton = (active: boolean, label: string, onClick: () => void) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={cn(
        "h-8 rounded-lg border px-3 text-xs font-bold transition-colors",
        active
          ? "border-gray-900 bg-gray-900 text-white"
          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-inner" data-group-id={groupId}>
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 px-2 py-2">
        {toolbarButton(Boolean(editor?.isActive("bold")), "Bold", () => editor?.chain().focus().toggleBold().run())}
        {toolbarButton(Boolean(editor?.isActive("heading", { level: 3 })), "Title", () => editor?.chain().focus().toggleHeading({ level: 3 }).run())}
        {toolbarButton(Boolean(editor?.isActive("bulletList")), "Bullet", () => editor?.chain().focus().toggleBulletList().run())}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            insertGap();
          }}
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-black text-white shadow-sm transition-colors hover:bg-emerald-700"
        >
          <Plus size={14} /> Insert Gap
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

const getQuestionTypeMeta = (groupOrType: any) => {
  const type = typeof groupOrType === "string" ? groupOrType : groupOrType?.ieltsQuestionType || groupOrType?.type;
  return QUESTION_TYPES.find((t) => t.id === type) || QUESTION_TYPES.find((t) => t.id === getStorageQuestionType(type || ""));
};

const toRoman = (num: number): string => {
  const roman: Record<string, number> = {
    m: 1000,
    cm: 900,
    d: 500,
    cd: 400,
    c: 100,
    xc: 90,
    l: 50,
    xl: 40,
    x: 10,
    ix: 9,
    v: 5,
    iv: 4,
    i: 1,
  };
  let str = "";
  for (let i of Object.keys(roman)) {
    let q = Math.floor(num / roman[i]);
    num -= q * roman[i];
    str += i.repeat(q);
  }
  return str.toUpperCase();
};

const uploadQuestionImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("image", file);
  const response = await fetch("/api/image-upload", {
    method: "POST",
    body: formData,
  });
  const data = await response.json();
  if (response.ok && data.url) {
    return data.url;
  }
  throw new Error(data.error || "Upload failed");
};

const DiagramVisualEditor = ({
  group,
  updateQuestionGroup,
  groupQuestions,
  deleteQuestion,
  updateQuestion,
  theme,
  getGlobalIdx,
  setQuestions,
  currentPart,
  section,
  startNum,
}: {
  group: any;
  updateQuestionGroup: (id: string, updates: any) => void;
  groupQuestions: any[];
  deleteQuestion: (id: string) => void;
  updateQuestion: (id: string, field: string, value: any) => void;
  theme: any;
  getGlobalIdx: (id: string) => number;
  setQuestions: React.Dispatch<React.SetStateAction<any[]>>;
  currentPart: any;
  section: any;
  startNum: number;
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isTypeA = group.ieltsQuestionType === "diagram_labelling_type_a";
  const optionLabels = Array.from({ length: 8 }, (_, idx) => String.fromCharCode(65 + idx));
  const diagramOptions = Array.isArray(group.options) && group.options.length > 0 ? group.options : optionLabels;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await uploadQuestionImage(file);
      updateQuestionGroup(group.id || group.temp_id, { diagramImage: url });
      toast.success("Image uploaded successfully");
    } catch (err: any) {
      console.error("Diagram image upload failed:", err);
      toast.error(err?.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const addField = () => {
    const nextNum = groupQuestions.length + 1;
    const newId = `temp-q-diag-${crypto.randomUUID()}-${nextNum}`;
    const newQ = {
      temp_id: newId,
      part_id: currentPart.id || currentPart.temp_id,
      // removed section_id since questions table no longer has this column
      question_type: "diagram_completion",
      ieltsQuestionType: group.ieltsQuestionType || "diagram_completion",
      question_text: isTypeA ? `Label ${nextNum}` : "",
      group_id: group.id || group.temp_id,
      correct_answer: "",
      points: 1,
      order_index: nextNum,
    };
    setQuestions((prev) => [...prev, newQ]);
  };

  return (
    <div className="space-y-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between">
        <Input
          value={group.diagramTitle || ""}
          onChange={(e) =>
            updateQuestionGroup(group.id || group.temp_id, {
              diagramTitle: e.target.value,
            })
          }
          className="flex-1 max-w-sm border-gray-200 bg-white rounded-xl h-9 text-[11px] font-bold shadow-sm"
          placeholder="Diagram Title (e.g., A solar-powered water pump)..."
        />
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleUpload}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="rounded-xl h-9 text-[10px] font-black uppercase tracking-wider"
          >
            {isUploading ? (
              "Uploading..."
            ) : (
              <>
                <Upload size={14} className="mr-2" /> Upload Image
              </>
            )}
          </Button>
          <Button
            size="sm"
            onClick={addField}
            className="rounded-xl h-9 border border-[#111] bg-[#111] px-3 text-[10px] font-black uppercase tracking-wider text-white shadow-sm hover:bg-[#333] dark:border-white dark:bg-white dark:text-[#111] dark:hover:bg-gray-200"
          >
            <Plus size={14} className="mr-2" /> Add Label
          </Button>
        </div>
      </div>

      {group.diagramImage ? (
        <div className="relative rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 aspect-video flex items-center justify-center group/img">
          <img
            src={group.diagramImage}
            alt="Diagram"
            className="max-w-full max-h-full object-contain"
          />
          <button
            onClick={() =>
              updateQuestionGroup(group.id || group.temp_id, {
                diagramImage: "",
              })
            }
            className="absolute top-2 right-2 p-2 bg-gray-500 text-white rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ) : (
        <div className="aspect-video flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
          <ImageIcon size={48} className="text-gray-300 mb-2" />
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            No diagram image uploaded
          </p>
        </div>
      )}

      {isTypeA && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label className="text-[9px] font-black uppercase tracking-wider text-gray-500">
                Map/Plan Labels
              </Label>
              <p className="text-[11px] text-gray-500 mt-1">
                These letters appear as columns in the student answer table.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => updateQuestionGroup(group.id || group.temp_id, { options: optionLabels })}
              className="rounded-xl h-8 text-[9px] font-black uppercase tracking-wider"
            >
              Reset A-H
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {optionLabels.map((label, idx) => (
              <div key={label} className="space-y-1">
                <Label className="text-[9px] font-black text-gray-400">{label}</Label>
                <Input
                  value={diagramOptions[idx] || label}
                  onChange={(e) => {
                    const nextOptions = [...diagramOptions];
                    nextOptions[idx] = e.target.value || label;
                    updateQuestionGroup(group.id || group.temp_id, { options: nextOptions });
                  }}
                  className="h-8 text-[11px] font-bold bg-white border-gray-200 rounded-lg"
                  placeholder={label}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        {groupQuestions
          .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
          .map((q, idx) => {
            const globalIdx = getGlobalIdx(q.id || q.temp_id);
            const gapNum = globalIdx !== -1 ? globalIdx + 1 : startNum + idx;
            const defaultQuestionText = `Label ${gapNum}: [[${gapNum}]]`;
            return (
              <div
                key={q.id || q.temp_id}
                className="bg-gray-50/50 p-3 rounded-xl border border-gray-200 space-y-2"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "w-6 h-6 rounded flex items-center justify-center text-white font-black text-[10px] shrink-0 mt-1",
                      theme.bg,
                    )}
                  >
                    {gapNum}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase tracking-wider text-gray-500">
                        {isTypeA ? "Question / Place Name" : "Question Text"}
                      </Label>
                      <Input
                        value={q.question_text || ""}
                        onChange={(e) =>
                          updateQuestion(
                            q.id || q.temp_id,
                            "question_text",
                            e.target.value,
                          )
                        }
                        className="h-8 text-[11px] font-bold border-white bg-white rounded-lg focus:ring-1 focus:ring-blue-200"
                        placeholder={isTypeA ? "e.g. Quilt Shop" : defaultQuestionText}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase tracking-wider text-gray-500">
                        {isTypeA ? "Correct Letter" : "Correct Answer"}
                      </Label>
                      {isTypeA ? (
                        <select
                          value={String(q.correct_answer || "").toUpperCase()}
                          onChange={(e) =>
                            updateQuestion(
                              q.id || q.temp_id,
                              "correct_answer",
                              e.target.value,
                            )
                          }
                          className="h-8 w-full text-[11px] font-bold border border-white bg-white rounded-lg px-2 focus:ring-1 focus:ring-blue-200"
                        >
                          <option value="">Select letter</option>
                          {optionLabels.map((label) => (
                            <option key={label} value={label}>{label}</option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          value={q.correct_answer}
                          onChange={(e) =>
                            updateQuestion(
                              q.id || q.temp_id,
                              "correct_answer",
                              e.target.value,
                            )
                          }
                          className="h-8 text-[11px] font-bold border-white bg-white rounded-lg focus:ring-1 focus:ring-blue-200"
                          placeholder="Correct Answer(s) (use / for multiple)..."
                        />
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteQuestion(q.id || q.temp_id)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 transition-all hover:bg-gray-100 rounded-lg mt-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

const MatchingSentenceEndingsVisualEditor = ({
  group,
  updateQuestionGroup,
  groupQuestions,
  deleteQuestion,
  updateQuestion,
  addQuestionToGroup,
  theme,
  getGlobalIdx,
}: any) => {
  const options = group.options || [];
  const optionsTitle = group.optionsTitle || "List of Endings";

  return (
    <div className="space-y-6">
      {/* Endings Box Editor */}
      <div className="p-6 bg-white border border-gray-100 rounded-2xl max-w-2xl mx-auto shadow-sm relative overflow-hidden group/box">
        <div className="absolute top-0 left-0 w-1 h-full bg-gray-200" />
        <div className="flex items-center justify-between mb-6">
          <Input
            value={optionsTitle}
            onChange={(e) =>
              updateQuestionGroup(group.id || group.temp_id, {
                optionsTitle: e.target.value,
              })
            }
            className="font-black text-sm uppercase tracking-widest text-gray-700 text-center border-none bg-transparent focus:ring-0 h-8 flex-1"
            placeholder="List of Endings..."
          />
          <button
            onClick={() => {
              const newOpts = [...options, ""];
              updateQuestionGroup(group.id || group.temp_id, {
                options: newOpts,
              });
            }}
            className="ml-4 px-3 py-1.5 bg-[#111] text-white rounded-lg text-[9px] font-black flex items-center gap-1.5 hover:bg-blue-700 shadow-sm"
          >
            <Plus size={12} /> ADD LINE
          </button>
        </div>
        <div className="space-y-3 max-w-md mx-auto">
          {options.map((opt: string, idx: number) => (
            <div key={idx} className="flex gap-3 items-center group/opt">
              <div className="h-7 w-7 rounded-lg bg-[#111] text-white flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm">
                {String.fromCharCode(65 + idx)}
              </div>
              <Input
                value={opt}
                onChange={(e) => {
                  const newOpts = [...options];
                  newOpts[idx] = e.target.value;
                  updateQuestionGroup(group.id || group.temp_id, {
                    options: newOpts,
                  });
                }}
                className="h-8 border-none bg-white font-bold text-xs focus:ring-1 focus:ring-gray-200 px-3 rounded-xl shadow-sm"
                placeholder={`Line ${String.fromCharCode(65 + idx)}...`}
              />
              <button
                onClick={() => {
                  const newOpts = options.filter(
                    (_: any, i: number) => i !== idx,
                  );
                  updateQuestionGroup(group.id || group.temp_id, {
                    options: newOpts,
                  });
                }}
                className="opacity-0 group-hover/opt:opacity-100 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Questions Editor */}
      <div className="space-y-3 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
            Questions & Answers
          </h5>
        </div>
        {groupQuestions.map((q: any, idx: number) => {
          const qId = q.id || q.temp_id;
          const globalIdx = getGlobalIdx(qId);
          return (
            <div
              key={qId}
              className="flex items-start gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm group/sentence hover:border-gray-200 transition-all"
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm text-white shrink-0 mt-1",
                  theme.bg,
                )}
              >
                {globalIdx + 1}
              </div>
              <div className="flex-1 space-y-3">
                <Textarea
                  value={q.question_text}
                  onChange={(e) =>
                    updateQuestion(qId, "question_text", e.target.value)
                  }
                  className="w-full min-h-[50px] border-none bg-gray-50/50 rounded-xl p-3 text-[15px] font-bold text-gray-800 focus:ring-1 focus:ring-gray-200 leading-tight"
                  placeholder="Enter question text..."
                />
                <div className="flex items-center gap-4 pt-2 border-t border-gray-50">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Correct Answer:
                  </span>
                  <select
                    value={q.correct_answer || ""}
                    onChange={(e) =>
                      updateQuestion(qId, "correct_answer", e.target.value)
                    }
                    className="h-8 rounded-lg border border-gray-200 text-xs font-bold px-2 focus:ring-1 focus:ring-gray-200 outline-none cursor-pointer"
                  >
                    <option value="">Select Option</option>
                    {options.map((_: any, oIdx: number) => {
                      const label = String.fromCharCode(65 + oIdx);
                      return (
                        <option key={oIdx} value={label}>
                          {label} {options[oIdx] ? `- ${options[oIdx]}` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              <button
                onClick={() => deleteQuestion(qId)}
                className="opacity-0 group-hover/sentence:opacity-100 p-2 text-gray-400 hover:text-gray-600 transition-all hover:bg-gray-100 rounded-xl"
              >
                <Trash2 size={18} />
              </button>
            </div>
          );
        })}
        <Button
          onClick={() =>
            addQuestionToGroup(
              group.id || group.temp_id,
              "matching_sentence_endings",
            )
          }
          className="w-full h-12 border-2 border-dashed bg-white rounded-2xl font-black text-[11px] gap-2 shadow-sm text-gray-400 hover:text-blue-500 hover:border-gray-200 transition-all uppercase tracking-widest"
        >
          <Plus size={18} /> ADD QUESTION
        </Button>
      </div>
    </div>
  );
};

const MatchingFeaturesVisualEditor = ({
  group,
  updateQuestionGroup,
  groupQuestions,
  deleteQuestion,
  updateQuestion,
  addQuestionToGroup,
  theme,
  getGlobalIdx,
}: any) => {
  const options = group.options || [];
  const optionsTitle = group.optionsTitle || "List of Features";

  return (
    <div className="space-y-6">
      {/* Features Box Editor */}
      <div className="p-6 bg-white border border-gray-100 rounded-2xl max-w-2xl mx-auto shadow-sm relative overflow-hidden group/box">
        <div className="absolute top-0 left-0 w-1 h-full bg-gray-200" />
        <div className="flex items-center justify-between mb-6">
          <Input
            value={optionsTitle}
            onChange={(e) =>
              updateQuestionGroup(group.id || group.temp_id, {
                optionsTitle: e.target.value,
              })
            }
            className="font-black text-sm uppercase tracking-widest text-gray-700 text-center border-none bg-transparent focus:ring-0 h-8 flex-1"
            placeholder="List of Features..."
          />
          <button
            onClick={() => {
              const newOpts = [...options, ""];
              updateQuestionGroup(group.id || group.temp_id, {
                options: newOpts,
              });
            }}
            className="ml-4 px-3 py-1.5 bg-[#111] text-white rounded-lg text-[9px] font-black flex items-center gap-1.5 hover:bg-blue-700 shadow-sm"
          >
            <Plus size={12} /> ADD FEATURE
          </button>
        </div>
        <div className="space-y-3 max-w-md mx-auto">
          {options.map((opt: string, idx: number) => (
            <div key={idx} className="flex gap-3 items-center group/opt">
              <div className="h-7 w-7 rounded-lg bg-[#111] text-white flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm">
                {String.fromCharCode(65 + idx)}
              </div>
              <Input
                value={opt}
                onChange={(e) => {
                  const newOpts = [...options];
                  newOpts[idx] = e.target.value;
                  updateQuestionGroup(group.id || group.temp_id, {
                    options: newOpts,
                  });
                }}
                className="h-8 border-none bg-white font-bold text-xs focus:ring-1 focus:ring-gray-200 px-3 rounded-xl shadow-sm"
                placeholder={`Feature ${String.fromCharCode(65 + idx)}...`}
              />
              <button
                onClick={() => {
                  const newOpts = options.filter(
                    (_: any, i: number) => i !== idx,
                  );
                  updateQuestionGroup(group.id || group.temp_id, {
                    options: newOpts,
                  });
                }}
                className="opacity-0 group-hover/opt:opacity-100 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Questions Editor */}
      <div className="space-y-3 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
            Questions & Answers
          </h5>
        </div>
        {groupQuestions.map((q: any, idx: number) => {
          const qId = q.id || q.temp_id;
          const globalIdx = getGlobalIdx(qId);
          return (
            <div
              key={qId}
              className="flex items-start gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm group/sentence hover:border-gray-200 transition-all"
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm text-white shrink-0 mt-1",
                  theme.bg,
                )}
              >
                {globalIdx + 1}
              </div>
              <div className="flex-1 space-y-3">
                <Textarea
                  value={q.question_text}
                  onChange={(e) =>
                    updateQuestion(qId, "question_text", e.target.value)
                  }
                  className="w-full min-h-[50px] border-none bg-gray-50/50 rounded-xl p-3 text-[15px] font-bold text-gray-800 focus:ring-1 focus:ring-gray-200 leading-tight"
                  placeholder="Enter question text..."
                />
                <div className="flex items-center gap-4 pt-2 border-t border-gray-50">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Correct Answer:
                  </span>
                  <select
                    value={q.correct_answer || ""}
                    onChange={(e) =>
                      updateQuestion(qId, "correct_answer", e.target.value)
                    }
                    className="h-8 rounded-lg border border-gray-200 text-xs font-bold px-2 focus:ring-1 focus:ring-gray-200 outline-none cursor-pointer"
                  >
                    <option value="">Select Option</option>
                    {options.map((_: any, oIdx: number) => {
                      const label = String.fromCharCode(65 + oIdx);
                      return (
                        <option key={oIdx} value={label}>
                          {label} {options[oIdx] ? `- ${options[oIdx]}` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              <button
                onClick={() => deleteQuestion(qId)}
                className="opacity-0 group-hover/sentence:opacity-100 p-2 text-gray-400 hover:text-gray-600 transition-all hover:bg-gray-100 rounded-xl"
              >
                <Trash2 size={18} />
              </button>
            </div>
          );
        })}
        <Button
          onClick={() =>
            addQuestionToGroup(group.id || group.temp_id, "matching_features")
          }
          className="w-full h-12 border-2 border-dashed bg-white rounded-2xl font-black text-[11px] gap-2 shadow-sm text-gray-400 hover:text-blue-500 hover:border-gray-200 transition-all uppercase tracking-widest"
        >
          <Plus size={18} /> ADD QUESTION
        </Button>
      </div>
    </div>
  );
};

const ListSelectionVisualEditor = ({
  group,
  updateQuestionGroup,
  groupQuestions,
  deleteQuestion,
  updateQuestion,
  addQuestionToGroup,
  theme,
  getGlobalIdx,
}: any) => {
  const options = group.options || [];
  const optionsTitle = group.optionsTitle || "List of Options";

  return (
    <div className="space-y-6">
      {/* Options Box */}
      <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] max-w-2xl mx-auto shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-gray-200" />
        <div className="flex items-center justify-between mb-6">
          <Input
            value={optionsTitle}
            onChange={(e) =>
              updateQuestionGroup(group.id || group.temp_id, { optionsTitle: e.target.value })
            }
            className="font-black text-sm uppercase tracking-widest text-gray-700 text-center border-none bg-transparent focus:ring-0 h-8 flex-1"
            placeholder="List of Options..."
          />
          <button
            onClick={() => updateQuestionGroup(group.id || group.temp_id, { options: [...options, ""] })}
            className="ml-4 px-3 py-1.5 bg-[#555] text-white rounded-lg text-[9px] font-black flex items-center gap-1.5 hover:bg-amber-700 shadow-sm"
          >
            <Plus size={12} /> ADD OPTION
          </button>
        </div>
        <div className="space-y-3 max-w-md mx-auto">
          {options.map((opt: string, idx: number) => (
            <div key={idx} className="flex gap-3 items-center group/opt">
              <div className="h-7 w-7 rounded-lg bg-[#555] text-white flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm">
                {String.fromCharCode(65 + idx)}
              </div>
              <Input
                value={opt}
                onChange={(e) => {
                  const newOpts = [...options];
                  newOpts[idx] = e.target.value;
                  updateQuestionGroup(group.id || group.temp_id, { options: newOpts });
                }}
                className="h-8 border-none bg-white font-bold text-xs focus:ring-1 focus:ring-amber-100 px-3 rounded-xl shadow-sm"
                placeholder={`Option ${String.fromCharCode(65 + idx)}...`}
              />
              <button
                onClick={() => {
                  const newOpts = options.filter((_: any, i: number) => i !== idx);
                  updateQuestionGroup(group.id || group.temp_id, { options: newOpts });
                }}
                className="opacity-0 group-hover/opt:opacity-100 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-3 max-w-3xl mx-auto">
        <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
          Questions & Correct Answers (comma-separated, e.g. A,C)
        </h5>
        {groupQuestions.map((q: any) => {
          const qId = q.id || q.temp_id;
          const globalIdx = getGlobalIdx(qId);
          return (
            <div key={qId} className="flex items-start gap-4 p-4 bg-white border border-gray-100 rounded-xl group/q">
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-black text-sm text-white shrink-0 mt-1", theme.bg)}>
                {globalIdx + 1}
              </div>
              <div className="flex-1 space-y-3">
                <Textarea
                  value={q.question_text}
                  onChange={(e) => updateQuestion(qId, "question_text", e.target.value)}
                  className="w-full min-h-[50px] border-none bg-gray-50/50 rounded-xl p-3 text-[15px] font-bold text-gray-800 focus:ring-1 focus:ring-amber-100 leading-tight"
                  placeholder="Enter question text..."
                />
                <div className="flex items-center gap-4 pt-2 border-t border-gray-50">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Correct Answer(s):</span>
                  <Input
                    value={q.correct_answer || ""}
                    onChange={(e) => updateQuestion(qId, "correct_answer", e.target.value)}
                    className="h-8 w-32 border border-gray-200 rounded-lg text-xs font-bold px-2"
                    placeholder="e.g. A,C"
                  />
                </div>
              </div>
              <button
                onClick={() => deleteQuestion(qId)}
                className="opacity-0 group-hover/q:opacity-100 p-2 text-gray-400 hover:text-gray-600 transition-all hover:bg-gray-100 rounded-xl"
              >
                <Trash2 size={18} />
              </button>
            </div>
          );
        })}
        <Button
          onClick={() => addQuestionToGroup(group.id || group.temp_id, "list_selection")}
          className="w-full h-12 border-2 border-dashed bg-white rounded-2xl font-black text-[11px] gap-2 shadow-sm text-gray-400 hover:text-amber-500 hover:border-amber-200 transition-all uppercase tracking-widest"
        >
          <Plus size={18} /> ADD QUESTION
        </Button>
      </div>
    </div>
  );
};

const ChoosingTitleVisualEditor = ({
  group,
  updateQuestionGroup,
  groupQuestions,
  deleteQuestion,
  updateQuestion,
  addQuestionToGroup,
  theme,
  getGlobalIdx,
}: any) => {
  const q = groupQuestions[0];
  const qId = q?.id || q?.temp_id;
  const options: string[] = q?.options || group.options || [];

  const updateOptions = (newOpts: string[]) => {
    if (qId) updateQuestion(qId, "options", newOpts);
    updateQuestionGroup(group.id || group.temp_id, { options: newOpts });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="p-6 bg-white border border-gray-100 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-gray-200" />
        <div className="flex items-center justify-between mb-6">
          <span className="font-black text-xs uppercase tracking-widest text-gray-500">Title Options</span>
          <button
            onClick={() => updateOptions([...options, ""])}
            className="px-3 py-1.5 bg-[#111] text-white rounded-lg text-[9px] font-black flex items-center gap-1.5 hover:bg-[#333] shadow-sm"
          >
            <Plus size={12} /> ADD TITLE
          </button>
        </div>
        <div className="space-y-3">
          {options.map((opt: string, idx: number) => (
            <div key={idx} className="flex gap-3 items-center group/opt">
              <div className="h-7 w-7 rounded-lg bg-[#111] text-white flex items-center justify-center text-[10px] font-black shrink-0">
                {String.fromCharCode(65 + idx)}
              </div>
              <Input
                value={opt}
                onChange={(e) => {
                  const newOpts = [...options];
                  newOpts[idx] = e.target.value;
                  updateOptions(newOpts);
                }}
                className="h-8 border-none bg-white font-bold text-xs focus:ring-1 focus:ring-purple-100 px-3 rounded-xl shadow-sm"
                placeholder={`Title ${String.fromCharCode(65 + idx)}...`}
              />
              <button
                onClick={() => updateOptions(options.filter((_: any, i: number) => i !== idx))}
                className="opacity-0 group-hover/opt:opacity-100 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {q && (
        <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Correct Answer:</span>
            <select
              value={q.correct_answer || ""}
              onChange={(e) => updateQuestion(qId, "correct_answer", e.target.value)}
              className="h-8 rounded-lg border border-gray-200 text-xs font-bold px-2 outline-none cursor-pointer"
            >
              <option value="">Select</option>
              {options.map((_: any, idx: number) => {
                const label = String.fromCharCode(65 + idx);
                return (
                  <option key={idx} value={label}>{label} - {options[idx]}</option>
                );
              })}
            </select>
          </div>
        </div>
      )}


    </div>
  );
};

const FlowchartVisualEditor = ({
  group,
  updateQuestionGroup,
  groupQuestions,
  deleteQuestion,
  updateQuestion,
  addQuestionToGroup,
  theme,
  globalStartIdx,
  getGlobalIdx,
  currentPart,

  section,
  questions,
  setQuestions,
}: {
  group: any;
  updateQuestionGroup: (id: string, updates: any) => void;
  groupQuestions: any[];
  deleteQuestion: (id: string) => void;
  updateQuestion: (id: string, field: string, value: any) => void;
  addQuestionToGroup: (groupId: string, type: string) => void;
  theme: any;
  globalStartIdx: number;
  getGlobalIdx: (id: string) => number;
  currentPart: any;
  section: any;
  questions: any[];
  setQuestions: React.Dispatch<React.SetStateAction<any[]>>;
}) => {
  const sortedGroupQs = useMemo(() => {
    return [...groupQuestions].sort((a, b) => {
      const numA = parseInt((a.question_text || "").match(/\d+/)?.[0] || "0");
      const numB = parseInt((b.question_text || "").match(/\d+/)?.[0] || "0");
      return numA - numB;
    });
  }, [groupQuestions]);

  const flowchartData: FlowchartData = group.flowchartData || {
    type: "scientific",
    steps: [],
  };

  const syncToGroupText = (data: FlowchartData) => {
    let text = "";
    data.steps.forEach((step) => {
      if (step.type === "step") {
        text += step.text + "\n";
      } else if (step.type === "split" && step.theories) {
        step.theories.forEach((t) => {
          text += t.text + "\n";
        });
      }
    });
    return text.trim();
  };

  const skipSyncRef = React.useRef(false);
  const syncTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup setTimeout on unmount
  React.useEffect(() => {
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, []);

  const updateData = (updates: Partial<FlowchartData>) => {
    const newData = { ...flowchartData, ...updates };
    updateQuestionGroup(group.id || group.temp_id, {
      flowchartData: newData,
      groupText: syncToGroupText(newData),
      layout: newData.type === "boxed" ? "type2" : "type1",
    });

    if (skipSyncRef.current) {
      skipSyncRef.current = false;
      return;
    }

    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      const existingGapTags: string[] = [];
      const seen = new Set<string>();
      newData.steps.forEach((s: FlowchartStep) => {
        const sMatches = (s.text || "").match(/\[f\d+\]/g) || [];
        sMatches.forEach((t) => {
          if (!seen.has(t)) {
            existingGapTags.push(t);
            seen.add(t);
          }
        });
        if (s.theories) {
          s.theories.forEach((t: any) => {
            const tMatches = (t.text || "").match(/\[f\d+\]/g) || [];
            tMatches.forEach((m: string) => {
              if (!seen.has(m)) {
                existingGapTags.push(m);
                seen.add(m);
              }
            });
          });
        }
      });

      const groupId = group.id || group.temp_id;
      setQuestions((prev) =>
        prev.filter((q) => {
          if (q.group_id !== groupId) return true;
          const qTag = (q.question_text || "").match(/\[f\d+\]/)?.[0];
          if (!qTag) return true;
          return existingGapTags.includes(qTag);
        }),
      );
    }, 250);
  };

  const addStep = (type: "step" | "split" = "step") => {
    const newStep: FlowchartStep = {
      id: `step-${crypto.randomUUID()}`,
      text: "New step text...",
      type,
      theories:
        type === "split"
          ? [
              { title: "Theory 1", text: "" },
              { title: "Theory 2", text: "" },
            ]
          : undefined,
    };
    updateData({ steps: [...flowchartData.steps, newStep] });
  };

  const updateStep = (stepId: string, updates: Partial<FlowchartStep>) => {
    const newSteps = flowchartData.steps.map((s) =>
      s.id === stepId ? { ...s, ...updates } : s,
    );

    const allGapTags: { tag: string; num: number }[] = [];
    const seenTags = new Set<string>();

    newSteps.forEach((s: FlowchartStep) => {
      const sMatches = (s.text || "").match(/\[f\d+\]/g) || [];
      sMatches.forEach((tag: string) => {
        if (seenTags.has(tag)) return;
        seenTags.add(tag);
        const num = parseInt(tag.match(/\d+/)?.[0] || "0");
        if (num) allGapTags.push({ tag, num });
      });
      if (s.theories) {
        s.theories.forEach((t: any) => {
          const tMatches = (t.text || "").match(/\[f\d+\]/g) || [];
          tMatches.forEach((tag: string) => {
            if (seenTags.has(tag)) return;
            seenTags.add(tag);
            const num = parseInt(tag.match(/\d+/)?.[0] || "0");
            if (num) allGapTags.push({ tag, num });
          });
        });
      }
    });

    const groupId = group.id || group.temp_id;
    const groupQuestions = questions.filter((q) => q.group_id === groupId);
    const existingTags = groupQuestions
      .map((q) => (q.question_text || "").match(/\[f\d+\]/)?.[0])
      .filter(Boolean);

    const newTags = allGapTags.filter(
      (item) => !existingTags.includes(item.tag),
    );

    if (newTags.length > 0) {
      const newQuestions = newTags.map((item, i) => ({
        temp_id: `temp-q-flow-${crypto.randomUUID()}-${i}`,
        part_id: currentPart?.id || currentPart?.temp_id,
        // removed section_id since questions table no longer has this column
        question_type: "flowchart_completion",
        question_text: item.tag,
        group_id: groupId,
        correct_answer: "",
        points: 1,
        order_index: item.num,
      }));

      setQuestions((prev) => {
        const latestExistingTags = prev
          .filter((q) => q.group_id === groupId)
          .map((q) => (q.question_text || "").match(/\[f\d+\]/)?.[0])
          .filter(Boolean);

        const filteredNewQs = newQuestions.filter(
          (nq) => !latestExistingTags.includes(nq.question_text),
        );
        if (filteredNewQs.length === 0) return prev;
        return [...prev, ...filteredNewQs];
      });
      skipSyncRef.current = true;
    }

    updateData({ steps: newSteps });
  };

  const renderQuestionInput = (text: string) => {
    const matches = text.match(/\[f\d+\]/g) || [];
    return matches.map((tag: string, idx: number) => {
      // Use find to get the first question that matches this specific tag
      const q = groupQuestions.find((q) => (q.question_text || "") === tag);
      if (!q) return null;

      const displayNum = getGlobalIdx(q.id || q.temp_id) + 1;

      return (
        <div
          key={`${q.id || q.temp_id}-${idx}`}
          className="mt-2 bg-gray-50/50 p-2 rounded-lg border border-gray-200 flex items-center gap-3"
        >
          <div
            className={cn(
              "w-5 h-5 rounded flex items-center justify-center text-white font-black text-[10px] shrink-0",
              theme.bg,
            )}
          >
            {displayNum}
          </div>
          {group.ieltsQuestionType === "flowchart_completion_drag" ? (
            <select
              value={q.correct_answer || ""}
              onChange={(e) => updateQuestion(q.id || q.temp_id, "correct_answer", e.target.value)}
              className="h-7 text-[10px] font-bold border border-gray-200 bg-white rounded focus:ring-1 focus:ring-blue-200 flex-1 px-2"
            >
              <option value="">Select answer...</option>
              {(group.options || []).filter((opt: string) => String(opt || "").trim()).map((opt: string, optIdx: number) => (
                <option key={optIdx} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <Input
              value={q.correct_answer}
              onChange={(e) => updateQuestion(q.id || q.temp_id, "correct_answer", e.target.value)}
              className="h-7 text-[10px] font-bold border-white bg-white rounded focus:ring-1 focus:ring-blue-200 flex-1"
              placeholder="Correct Ans..."
            />
          )}
          <button
            onClick={() => deleteQuestion(q.id || q.temp_id)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-all"
          >
            <Trash2 size={12} />
          </button>
        </div>
      );
    });
  };

  const removeStep = (stepId: string) => {
    const newSteps = flowchartData.steps.filter((s) => s.id !== stepId);
    updateData({ steps: newSteps });
  };

  const moveStep = (idx: number, direction: "up" | "down") => {
    const newSteps = [...flowchartData.steps];
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newSteps.length) return;
    [newSteps[idx], newSteps[targetIdx]] = [newSteps[targetIdx], newSteps[idx]];
    updateData({ steps: newSteps });
  };

  const insertGapAtCursor = (stepId: string, theoryIdx?: number) => {
    const step = flowchartData.steps.find((s) => s.id === stepId);
    if (!step) return;

    const textarea = document.getElementById(
      theoryIdx !== undefined
        ? `theory-${stepId}-${theoryIdx}`
        : `step-${stepId}`,
    ) as HTMLTextAreaElement;
    let currentText =
      theoryIdx !== undefined ? step.theories![theoryIdx].text : step.text;
    let insertPos = textarea?.selectionStart ?? currentText.length;

    // Determine next universal [f#] number for this part (numbering continues across all groups)
    const partId = currentPart?.id || currentPart?.temp_id;
    const partQs = partId
      ? questions.filter((q: any) => (q.part_id || q.temp_part_id) === partId)
      : questions;

    const usedNums: number[] = [];
    partQs.forEach((q: any) => {
      const m = String(q.question_text || "").match(/\[f(\d+)\]/);
      if (m?.[1]) usedNums.push(parseInt(m[1], 10));
    });

    // Start from (total questions in this part + 1) to keep numbering universal,
    // but avoid collisions with any existing [f#] tags.
    let nextNum = (partQs?.length || 0) + 1;
    const usedSet = new Set<number>(usedNums);
    while (usedSet.has(nextNum)) nextNum++;

    const gapTag = `[f${nextNum}]`;

    const newText =
      currentText.slice(0, insertPos) + gapTag + currentText.slice(insertPos);

    // Then update the step text. updateStep will handle auto-creating the question for [fN]
    if (theoryIdx !== undefined) {
      const newTheories = [...step.theories!];
      newTheories[theoryIdx] = { ...newTheories[theoryIdx], text: newText };
      updateStep(stepId, { theories: newTheories });
    } else {
      updateStep(stepId, { text: newText });
    }

    toast.success(`Gap [f${nextNum}] added`);
  };

  const addTheory = (stepId: string) => {
    const step = flowchartData.steps.find((s) => s.id === stepId);
    if (!step || !step.theories) return;
    const newTheories = [
      ...step.theories,
      { title: `Theory ${step.theories.length + 1}`, text: "" },
    ];
    updateStep(stepId, { theories: newTheories });
  };

  const removeTheory = (stepId: string, theoryIdx: number) => {
    const step = flowchartData.steps.find((s) => s.id === stepId);
    if (!step || !step.theories || step.theories.length <= 1) return;
    const newTheories = step.theories.filter(
      (_: unknown, i: number) => i !== theoryIdx,
    );
    updateStep(stepId, { theories: newTheories });
  };

  return (
    <div className="space-y-2">
      {group.ieltsQuestionType === "flowchart_completion_drag" && (
        <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div>
              <Label className="text-[9px] font-black uppercase text-gray-500 tracking-widest">Draggable word bank</Label>
              <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Add all possible words here. This can be more than the number of gaps.</p>
            </div>
            <button
              onClick={() => updateQuestionGroup(group.id || group.temp_id, { options: [...(group.options || []), ""] })}
              className="px-2.5 py-1.5 rounded-lg bg-[#111] text-white text-[9px] font-black uppercase flex items-center gap-1"
            >
              <Plus size={10} /> Word
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(group.options || []).map((opt: string, idx: number) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={opt}
                  onChange={(e) => {
                    const next = [...(group.options || [])];
                    next[idx] = e.target.value;
                    updateQuestionGroup(group.id || group.temp_id, { options: next });
                  }}
                  className="h-8 text-[11px] font-bold bg-gray-50 border-gray-200"
                  placeholder={`Word ${idx + 1}`}
                />
                <button
                  onClick={() => updateQuestionGroup(group.id || group.temp_id, { options: (group.options || []).filter((_: any, i: number) => i !== idx) })}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
        <div className="flex items-center gap-2">
          <Label className="text-[8px] font-black uppercase text-gray-400 tracking-widest mr-2">
            Type:
          </Label>
          <div className="flex bg-white rounded-lg border border-gray-200 p-0.5 shadow-sm">
            <button
              onClick={() => updateData({ type: "scientific" })}
              className={cn(
                "px-3 py-1 rounded text-[8px] font-black uppercase transition-all",
                flowchartData.type === "scientific"
                  ? "bg-[#111] text-white shadow-sm"
                  : "text-gray-400 hover:text-gray-600",
              )}
            >
              Scientific
            </button>
            <button
              onClick={() => updateData({ type: "boxed" })}
              className={cn(
                "px-3 py-1 rounded text-[8px] font-black uppercase transition-all",
                flowchartData.type === "boxed"
                  ? "bg-[#111] text-white shadow-sm"
                  : "text-gray-400 hover:text-gray-600",
              )}
            >
              Boxed
            </button>
          </div>
        </div>

        <div className="w-full max-w-sm">
          <Input
            value={group.diagramTitle || ""}
            onChange={(e) =>
              updateQuestionGroup(group.id, { diagramTitle: e.target.value })
            }
            className="w-full border-gray-200 bg-white rounded-lg h-8 text-[11px] font-bold shadow-sm text-center"
            placeholder="Flowchart Title..."
          />
        </div>
      </div>

      <div className="space-y-1">
        {flowchartData.steps.map((step, idx) => (
          <div key={step.id} className="relative group/step">
            <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-sm hover:border-gray-200 transition-all">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest">
                  Step {idx + 1} {step.type === "split" && "(Split)"}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover/step:opacity-100 transition-opacity">
                  <button
                    onClick={() => moveStep(idx, "up")}
                    disabled={idx === 0}
                    className="p-0.5 text-gray-400 hover:text-[#111] hover:bg-gray-50 rounded transition-all disabled:opacity-30"
                  >
                    <ChevronUp size={10} />
                  </button>
                  <button
                    onClick={() => moveStep(idx, "down")}
                    disabled={idx === flowchartData.steps.length - 1}
                    className="p-0.5 text-gray-400 hover:text-[#111] hover:bg-gray-50 rounded transition-all disabled:opacity-30"
                  >
                    <ChevronDown size={10} />
                  </button>
                  <div className="w-px h-2 bg-gray-100 mx-0.5" />
                  <button
                    onClick={() => removeStep(step.id)}
                    className="p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>

              {step.type === "step" ? (
                <div className="space-y-1">
                  <div className="relative group/ta">
                    <Textarea
                      id={`step-${step.id}`}
                      value={step.text}
                      onChange={(e) =>
                        updateStep(step.id, { text: e.target.value })
                      }
                      className="w-full min-h-[44px] border-none bg-gray-50/50 rounded p-2 text-[11px] font-medium resize-none focus:ring-0 leading-tight"
                      placeholder="Step text..."
                    />
                    <button
                      onClick={() => insertGapAtCursor(step.id)}
                      className="absolute bottom-1 right-1 bg-white border border-gray-200 text-[#111] px-1.5 py-0.5 rounded text-[7px] font-black hover:bg-[#333] hover:text-white shadow-sm transition-all flex items-center gap-1"
                    >
                      <Plus size={8} /> GAP
                    </button>
                  </div>
                  {renderQuestionInput(step.text)}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {(step.theories || []).map((theory, tIdx) => (
                      <div
                        key={tIdx}
                        className="space-y-1 p-1.5 bg-gray-50/20 rounded border border-blue-50 relative group/theory"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <Input
                            value={theory.title}
                            onChange={(e) => {
                              const newTheories = [...step.theories!];
                              newTheories[tIdx] = {
                                ...theory,
                                title: e.target.value,
                              };
                              updateStep(step.id, { theories: newTheories });
                            }}
                            className="h-6 border-none bg-white font-black text-[8px] uppercase tracking-widest text-[#111] focus:ring-0 px-1.5"
                            placeholder={`Theory ${tIdx + 1}...`}
                          />
                          {step.theories!.length > 1 && (
                            <button
                              onClick={() => removeTheory(step.id, tIdx)}
                              className="opacity-0 group-hover/theory:opacity-100 p-0.5 text-gray-400 hover:text-gray-600 transition-all"
                            >
                              <Minus size={10} />
                            </button>
                          )}
                        </div>
                        <div className="relative group/ta">
                          <Textarea
                            id={`theory-${step.id}-${tIdx}`}
                            value={theory.text}
                            onChange={(e) => {
                              const newTheories = [...step.theories!];
                              newTheories[tIdx] = {
                                ...theory,
                                text: e.target.value,
                              };
                              updateStep(step.id, { theories: newTheories });
                            }}
                            className="w-full min-h-[44px] border-none bg-white rounded p-1.5 text-[10px] font-medium resize-none focus:ring-0 leading-tight shadow-sm"
                            placeholder="Theory text..."
                          />
                          <button
                            onClick={() => insertGapAtCursor(step.id, tIdx)}
                            className="absolute bottom-1 right-1 bg-white border border-gray-200 text-blue-500 px-1 py-0.5 rounded text-[6px] font-black hover:bg-gray-500 hover:text-white shadow-sm transition-all flex items-center gap-1"
                          >
                            <Plus size={6} /> GAP
                          </button>
                        </div>
                        {renderQuestionInput(theory.text)}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => addTheory(step.id)}
                    className="w-full py-1 border border-dashed border-gray-200 rounded text-[7px] font-black text-blue-400 uppercase hover:bg-gray-50 transition-all flex items-center justify-center gap-1"
                  >
                    <Plus size={8} /> Add Theory
                  </button>
                </div>
              )}
            </div>
            {idx < flowchartData.steps.length - 1 && (
              <div className="flex justify-center py-0.5">
                <div className="w-px h-1.5 bg-gray-200" />
              </div>
            )}
          </div>
        ))}

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => addStep("step")}
            className="flex-1 py-2 border border-dashed border-gray-200 rounded-lg text-[8px] font-black text-gray-400 uppercase tracking-widest hover:border-blue-300 hover:text-blue-500 hover:bg-gray-50 transition-all flex items-center justify-center gap-1.5"
          >
            <Plus size={12} /> Step
          </button>
          {flowchartData.type === "scientific" && (
            <button
              onClick={() => addStep("split")}
              className="px-3 py-2 border border-dashed border-gray-200 rounded-lg text-[8px] font-black text-gray-400 uppercase tracking-widest hover:border-blue-300 hover:text-blue-500 hover:bg-gray-50 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Plus size={12} /> Split Theories
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const WritingVisualEditor = ({
  currentPart,
  updatePart,
  theme,
}: {
  currentPart: any;
  updatePart: (id: string, field: string, value: any) => void;
  theme: any;
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await uploadQuestionImage(file);
      updatePart(currentPart.id || currentPart.temp_id, "image_url", url);
      toast.success("Image uploaded successfully");
    } catch (err: any) {
      console.error("Part image upload failed:", err);
      toast.error(err?.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/50 p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl relative overflow-hidden group/card">
          <div className={cn("absolute top-0 left-0 w-2 h-full", theme.bg)} />
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight">
                Writing Task Question
              </h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                This text will be shown on the left panel for students
              </p>
            </div>
            <div
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-500/20",
                theme.bg,
              )}
            >
              <PenTool size={24} />
            </div>
          </div>
          <Textarea
            value={currentPart?.passage_text || ""}
            onChange={(e) =>
              updatePart(
                currentPart.id || currentPart.temp_id,
                "passage_text",
                e.target.value,
              )
            }
            className="w-full min-h-[300px] border-none bg-gray-50/50 rounded-3xl p-8 text-lg font-medium leading-relaxed focus:ring-2 focus:ring-gray-200 transition-all resize-none shadow-inner"
            placeholder="Enter your writing task prompt here... (e.g., The chart below shows...)"
          />
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl relative overflow-hidden group/img-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight">
                Task Reference Image
              </h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                Required for Task 1, optional for Task 2
              </p>
            </div>
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleUpload}
              />
              <Button
                size="lg"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="rounded-2xl h-12 px-6 text-xs font-black uppercase tracking-widest border-2 hover:bg-gray-50 transition-all gap-2"
              >
                {isUploading ? (
                  <Loader2 className="animate-spin h-4 w-4" />
                ) : (
                  <Upload size={16} />
                )}
                {isUploading ? "Uploading..." : "Upload New Image"}
              </Button>
            </div>
          </div>

          {currentPart?.image_url ? (
            <div className="relative rounded-3xl overflow-hidden border border-gray-100 bg-gray-50 aspect-video flex items-center justify-center group/img shadow-md">
              <img
                src={currentPart.image_url}
                alt="Writing Task"
                className="max-w-full max-h-full object-contain p-4"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    updatePart(
                      currentPart.id || currentPart.temp_id,
                      "image_url",
                      "",
                    )
                  }
                  className="rounded-xl h-10 px-4 font-black uppercase tracking-widest"
                >
                  <Trash2 size={16} className="mr-2" /> Delete
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="aspect-video flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50/50 hover:border-red-200 transition-all cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-gray-300 shadow-sm mb-4">
                <ImageIcon size={40} />
              </div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
                No reference image uploaded
              </p>
              <p className="text-[10px] text-gray-400 mt-2 font-bold">
                Click to upload or drag & drop
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


export default function CDIAdminEditor({
  testTitle,
  section,
  parts: initialParts,
  questions: initialQuestions,
  questionOffset = 0,
  testId,
  moduleTimeMinutes,
  savingModuleTime = false,
  onModuleTimeChange,
  onSaveModuleTime,
  sectionAudioUrl = "",
  savingSectionAudio = false,
  onSectionAudioChange,
  onSaveSectionAudio,
  onSave,
  onExit,
  onPreview,
}: CDIAdminEditorProps) {
  const [parts, setParts] = useState(initialParts);
  const [questions, setQuestions] = useState(initialQuestions);
  const [deletedPartIds, setDeletedPartIds] = useState<string[]>([]);
  const [deletedQuestionIds, setDeletedQuestionIds] = useState<string[]>([]);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);

  const sortedQuestions = useMemo(() => {
    return [...questions].sort((a, b) => {
      const aPartId = a.part_id || a.temp_part_id;
      const bPartId = b.part_id || b.temp_part_id;
      const partAIdx = parts.findIndex(
        (p) => p.id === aPartId || p.temp_id === aPartId,
      );
      const partBIdx = parts.findIndex(
        (p) => p.id === bPartId || p.temp_id === bPartId,
      );

      if (partAIdx !== partBIdx) return partAIdx - partBIdx;
      return (a.order_index || 0) - (b.order_index || 0);
    });
  }, [questions, parts]);

  const getGlobalIdx = (qId: string) => {
    let current = questionOffset;
    for (const q of sortedQuestions) {
      if (q.id === qId || q.temp_id === qId) return current;
      current += getQuestionDisplayCount(q);
    }
    return -1;
  };

  useEffect(() => {
    setParts(initialParts.length > 0 ? initialParts : []);
    setQuestions(initialQuestions);
    setDeletedPartIds([]);
    setDeletedQuestionIds([]);
    setCurrentPartIndex(0);
  }, [initialParts, initialQuestions]);

  useEffect(() => {
    if (parts.length === 0 && section?.id) {
      const newPartId = `temp-part-${crypto.randomUUID()}`;
      setParts([
        {
          id: newPartId,
          temp_id: newPartId,
          section_id: section.id,
          part_number: 1,
          title: "New Part",
          instructions: "",
          passage_text: "",
          order_index: 1,
          question_groups: [],
        },
      ]);
    }
  }, [parts.length, section?.id]);

  useEffect(() => {
    // Sync questions with content tags to remove orphaned questions and sync correct answers
    const timer = setTimeout(() => {
      let tagsInPassage: string[] = [];
      const headingGapData = new Map<number, { correctAnswer: string }>();
      parts.forEach((p) => {
        const text = p.passage_text || "";
        // Match TipTap HTML data-heading-gap="1" data-correct-answer="..."
        const htmlGapRegex =
          /data-heading-gap="(\d+)"(?:[^>]*data-correct-answer="([^"]*)")?/g;
        let match;
        while ((match = htmlGapRegex.exec(text)) !== null) {
          const num = parseInt(match[1]);
          const correct = match[2] || "";
          tagsInPassage.push(`[H${num}]`);
          headingGapData.set(num, { correctAnswer: correct });
        }

        // Fallback for plain text [H1]
        const plainRegex = /\[H(\d+)\]/g;
        while ((match = plainRegex.exec(text)) !== null) {
          const num = parseInt(match[1]);
          if (!headingGapData.has(num)) {
            tagsInPassage.push(`[H${num}]`);
            headingGapData.set(num, { correctAnswer: "" });
          }
        }

        // Other tags
        const otherMatches = text.match(/\[\[n?\d+\]\]/g);
        if (otherMatches) tagsInPassage.push(...otherMatches);
      });

      let tagsInGroups: Record<string, string[]> = {};
      const groupTypeById: Record<string, string> = {};
      parts.forEach((p) => {
        (p.question_groups || []).forEach((g: any) => {
          let gTags: string[] = [];
          const processText = (txt: string) => {
            if (!txt) return;
            const matches = txt.match(
              /(\[\[n?\d+\]\]|\[H\d+\]|\[f\d+\]|data-heading-gap="(\d+)")/g,
            );
            if (matches) {
              matches.forEach((m: string) => {
                if (m.startsWith("data-heading-gap")) {
                  const num = m.match(/"(\d+)"/)?.[1];
                  if (num) gTags.push(`[H${num}]`);
                } else {
                  gTags.push(m);
                }
              });
            }
          };

          processText(g.groupText);
          if (g.tableRows) {
            g.tableRows.forEach((row: string[]) => {
              row.forEach((cell: string) => processText(cell));
            });
          }
          if (g.sections) {
            g.sections.forEach((s: any) => processText(s.content));
          }

          // Process flowchartData for [f#] tags
          if (g.flowchartData && g.flowchartData.steps) {
            g.flowchartData.steps.forEach((s: any) => {
              processText(s.text);
              if (s.theories) {
                s.theories.forEach((t: any) => processText(t.text));
              }
            });
          }

          if (g.id) {
            tagsInGroups[g.id] = gTags;
            groupTypeById[g.id] = g.type;
          }
          if (g.temp_id) {
            tagsInGroups[g.temp_id] = gTags;
            groupTypeById[g.temp_id] = g.type;
          }
        });
      });

      setQuestions((prev) => {
        let changed = false;
        let updatedQuestions = [...prev];

        // 1. Remove orphaned questions
        const filteredQuestions = updatedQuestions.filter((q) => {
          const qType = String(q.question_type || "").toLowerCase();
          const groupType = String(groupTypeById[q.group_id] || "").toLowerCase();
          const effectiveType = groupType || qType;
          const tagMatch = q.question_text?.match(
            /(\[\[n?\d+\]\]|\[H\d+\]|\[f\d+\])/,
          );
          const tag = tagMatch?.[0];
          const headingMatch = tag?.match(/\[H(\d+)\]/);
          const headingGapNum =
            typeof q.gapNum === "number"
              ? q.gapNum
              : headingMatch
                ? parseInt(headingMatch[1])
                : null;

          // Diagram/map completion should never be auto-removed by tag-sync.
          // These groups can use plain question text without token tags.
          if (
            effectiveType === "diagram_completion" ||
            effectiveType === "map_completion" ||
            effectiveType === "map"
          ) {
            return true;
          }

          if (
            q.question_type === "matching_headings" &&
            headingGapNum == null &&
            !tag
          )
            return false;
          if (!tag && headingGapNum == null) return true;

          if (!q.group_id) {
            if (q.question_type === "matching_headings") {
              return headingGapNum != null
                ? headingGapData.has(headingGapNum)
                : tag
                  ? tagsInPassage.includes(tag)
                  : false;
            }
            return tag ? tagsInPassage.includes(tag) : true;
          }

          if (groupType === "matching_headings") {
            return headingGapNum != null
              ? headingGapData.has(headingGapNum)
              : tag
                ? tagsInPassage.includes(tag)
                : false;
          }

          const groupTags = tagsInGroups[q.group_id] || [];
          return tag ? groupTags.includes(tag) : true;
        });

        if (filteredQuestions.length !== updatedQuestions.length) {
          updatedQuestions = filteredQuestions;
          changed = true;
        }

        // 2. Add missing questions for tags found in groups (Summary, Note, Flowchart)
        Object.entries(tagsInGroups).forEach(([groupId, tags]) => {
          const groupType = groupTypeById[groupId];
          // Only auto-add for these specific types
          if (
            groupType !== "note_completion" &&
            groupType !== "summary_completion" &&
            groupType !== "flowchart_completion"
          )
            return;

          tags.forEach((tag: string) => {
            const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const alreadyHas = updatedQuestions.some(
              (q) =>
                q.group_id === groupId &&
                new RegExp(`${escapedTag}(\\s|$)`).test(q.question_text || ""),
            );
            if (!alreadyHas) {
              const numMatch = tag.match(/\d+/);
              const num = numMatch ? parseInt(numMatch[0]) : 1;

              // Find parent part/section info
              let partId = "";
              let sectionId = section?.id || "";
              parts.forEach((p) => {
                if (
                  (p.question_groups || []).some(
                    (g: any) => g.id === groupId || g.temp_id === groupId,
                  )
                ) {
                  partId = p.id || p.temp_id;
                }
              });

              const newQ = {
                temp_id: `temp-q-auto-${crypto.randomUUID()}`,
                part_id: partId,
                // removed section_id since questions table no longer has this column
                question_type: groupType,
                question_text:
                  groupType === "note_completion"
                    ? `Gap ${num}: ${tag}`
                    : groupType === "flowchart_completion"
                      ? tag
                      : `Gap ${num}: ${tag}`,
                group_id: groupId,
                correct_answer: "",
                points: 1,
                order_index: num, // Use the number from the tag as order index
              };
              updatedQuestions.push(newQ);
              changed = true;
            }
          });
        });

        // 3. Sync heading correct answers
        updatedQuestions = updatedQuestions.map((q) => {
          if (
            q.question_type === "matching_headings" ||
            groupTypeById[q.group_id] === "matching_headings"
          ) {
            const tagMatch = q.question_text?.match(/\[H(\d+)\]/);
            const headingGapNum =
              typeof q.gapNum === "number"
                ? q.gapNum
                : tagMatch
                  ? parseInt(tagMatch[1])
                  : null;

            let updatedQ = { ...q };
            let localChanged = false;

            if (headingGapNum != null && q.gapNum !== headingGapNum) {
              updatedQ.gapNum = headingGapNum;
              localChanged = true;
            }

            if (headingGapNum != null && headingGapData.has(headingGapNum)) {
              const correctFromHtml =
                headingGapData.get(headingGapNum)?.correctAnswer || "";
              if (q.correct_answer !== correctFromHtml) {
                updatedQ.correct_answer = correctFromHtml;
                localChanged = true;
              }
            }

            if (localChanged) {
              changed = true;
              return updatedQ;
            }
          }
          return q;
        });

        if (changed) {
          const deletedIds = prev
            .filter(
              (q) =>
                !updatedQuestions.find(
                  (nq) => (nq.id || nq.temp_id) === (q.id || q.temp_id),
                ),
            )
            .map((q) => q.id)
            .filter((id) => id && !id.toString().startsWith("temp-"));

          if (deletedIds.length > 0) {
            setDeletedQuestionIds((d) => [...new Set([...d, ...deletedIds])]);
          }
          return updatedQuestions;
        }
        return prev;
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [parts]);

  const [isSaving, setIsSaving] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [leftPanelWidth, setLeftPanelWidth] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [resizingCol, setResizingCol] = useState<{
    groupId: string;
    colIdx: number;
    startX: number;
    startWidth: number;
    currentDelta?: number;
  } | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [bulkQuestionGroupId, setBulkQuestionGroupId] = useState<string | null>(
    null,
  );
  const [bulkQuestionText, setBulkQuestionText] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const sectionType = section?.section_type || "reading";

  const handleNoteKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    groupId: string,
  ) => {
    if (e.key === "Enter") {
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const currentLine = value.substring(lineStart, start);

      // Always add a bullet on Enter for note completion
      e.preventDefault();
      const nextLine = "\n• ";
      const newValue =
        value.substring(0, start) + nextLine + value.substring(end);
      updateQuestionGroup(groupId, { groupText: newValue });

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd =
          start + nextLine.length;
      }, 0);
    }
  };

  const theme = (() => {
    return {
      primary: "#111111",
      bg: "bg-[#111]",
      text: "text-[#111]",
      border: "border-[#222]",
      hoverBg: "hover:bg-[#333]",
      lightBg: "bg-gray-50",
      lightBorder: "border-gray-200",
    };
  })();

  const themeBg = theme.bg;
  const themeText = theme.text;
  const themeBorder = theme.border;

  const currentPart = parts[currentPartIndex];
  const partQuestions = questions.filter(
    (q) =>
      q.part_id === currentPart?.id ||
      (q.temp_part_id && q.temp_part_id === currentPart?.id),
  );
  const partGroups = currentPart?.question_groups || [];
  const matchingHeadingsGroup = partGroups.find(
    (g: any) => g.type === "matching_headings",
  );
  const matchingHeadingsGroupId = matchingHeadingsGroup
    ? matchingHeadingsGroup.id || matchingHeadingsGroup.temp_id
    : null;
  const matchingHeadingsOptions = matchingHeadingsGroup?.options || [];

  const addPart = () => {
    const maxParts = sectionType === "listening" ? 4 : sectionType === "reading" ? 3 : 2;
    if (parts.length >= maxParts) { toast.error(`This module supports ${maxParts} parts.`); return; }
    const newPartId = `temp-part-${crypto.randomUUID()}`;
    const newPart = {
      id: newPartId,
      temp_id: newPartId,
      section_id: section.id,
      part_number: parts.length + 1,
      title: `Part ${parts.length + 1}`,
      instructions: "",
      passage_text: "",
      order_index: parts.length + 1,
      question_groups: [],
    };
    setParts([...parts, newPart]);
    setCurrentPartIndex(parts.length);
    toast.success("New part added");
  };

  const deletePart = (index: number) => {
    if (parts.length <= 1) {
      toast.error("At least one part is required");
      return;
    }
    const partToDelete = parts[index];

    if (partToDelete.id && !partToDelete.id.toString().startsWith("temp-")) {
      setDeletedPartIds((prev) => [...prev, partToDelete.id]);
      const partQs = questions.filter((q) => q.part_id === partToDelete.id);
      const qIds = partQs
        .map((q) => q.id)
        .filter((id) => id && !id.toString().startsWith("temp-"));
      setDeletedQuestionIds((prev) => [...prev, ...qIds]);
    }

    const newParts = parts.filter((_: unknown, i: number) => i !== index);
    const indexedParts = newParts.map((p, i) => ({
      ...p,
      part_number: i + 1,
      order_index: i + 1,
    }));
    setParts(indexedParts);
    setQuestions((prev) =>
      prev.filter(
        (q) =>
          q.part_id !== partToDelete.id && q.temp_part_id !== partToDelete.id,
      ),
    );
    if (currentPartIndex >= indexedParts.length) {
      setCurrentPartIndex(indexedParts.length - 1);
    }
    toast.info("Part removed");
  };

  const addGap = (qId: string) => {
    const q = questions.find((q) => q.id === qId || q.temp_id === qId);
    if (!q) return;
    const newText = (q.question_text || "") + " __________ ";
    updateQuestion(qId, "question_text", newText);
    toast.success("Gap added to question");
  };

  const getNextHeadingGapNum = (text: string) => {
    const htmlMatches = Array.from(
      text.matchAll(/data-heading-gap="(\d+)"/g),
    ).map((match) => parseInt(match[1] || "0"));
    const tagMatches = Array.from(text.matchAll(/\[H(\d+)\]/g)).map((match) =>
      parseInt(match[1] || "0"),
    );
    const maxNum = Math.max(0, ...htmlMatches, ...tagMatches);
    return maxNum + 1;
  };

  const addHeadingGapQuestion = (gapNum: number, groupId: string) => {
    if (!currentPart) return;
    const partId = currentPart.id || currentPart.temp_id;
    const newId = `temp-q-heading-${crypto.randomUUID()}-${gapNum}`;
    const newQ = {
      temp_id: newId,
      part_id: partId,
      gapNum: gapNum,
      // removed section_id since questions table no longer has this column
      question_type: "matching_headings",
      question_text: `[H${gapNum}]`,
      group_id: groupId,
      correct_answer: "",
      points: 1,
      order_index: questions.length + 1,
    };
    setQuestions((prev) => [...prev, newQ]);
  };

  const insertHeadingGapToPassage = (groupId: string) => {
    if (!currentPart) return;
    const gapNum = getNextHeadingGapNum(currentPart.passage_text || "");
    addHeadingGapQuestion(gapNum, groupId);
    window.dispatchEvent(
      new CustomEvent("passage-editor-insert-heading-gap", {
        detail: { gapNum, correctAnswer: "" },
      }),
    );
    toast.success(`Heading Gap ${gapNum} added`);
  };

  const deleteHeadingGap = (gapNum: number) => {
    if (!currentPart) return;
    const passage = currentPart.passage_text || "";
    const newPassage = passage.replace(new RegExp(`\\[H${gapNum}\\]`, "g"), "");
    updatePart(
      currentPart.id || currentPart.temp_id,
      "passage_text",
      newPassage,
    );

    const qToDelete = questions.find((q) =>
      q.question_text?.includes(`[H${gapNum}]`),
    );
    if (qToDelete) {
      setQuestions(
        questions.filter(
          (q) => q.id !== qToDelete.id && q.temp_id !== qToDelete.temp_id,
        ),
      );
    }
    toast.info(`Heading Gap ${gapNum} removed`);
  };

  const insertGapToPassage: () => {
    gapNum: number;
    correctAnswer?: string;
  } = () => {
    if (!currentPart) return { gapNum: 0 };
    const passage = currentPart.passage_text || "";

    const matchingHeadingsGroup = (currentPart.question_groups || []).find(
      (g: any) => g.type === "matching_headings",
    );

    if (matchingHeadingsGroup) {
      const gapNum = getNextHeadingGapNum(passage);
      const groupId = matchingHeadingsGroup.id || matchingHeadingsGroup.temp_id;
      addHeadingGapQuestion(gapNum, groupId);
      toast.success(`Heading Gap ${gapNum} added`);
      return { gapNum, correctAnswer: "" };
    }

    const existingGaps = passage.match(/\[\[(\d+)\]\]/g) || [];
    const nextNum =
      existingGaps.length > 0
        ? Math.max(
            ...existingGaps.map((g: string) =>
              parseInt(g.match(/\d+/)?.[0] || "0"),
            ),
          ) + 1
        : 1;
    const gapTag = `[[${nextNum}]]`;

    const newId = `temp-q-passage-${crypto.randomUUID()}`;
    const newQ = {
      id: newId,
      temp_id: newId,
      part_id: currentPart.id,
      temp_part_id: currentPart.id,
      // removed section_id since questions table no longer has this column
      question_type: "gap_fill",
      question_text: `Gap ${nextNum} from passage: ${gapTag}`,
      group_id: null,
      correct_answer: "",
      points: 1,
      order_index: questions.length + 1,
    };
    setQuestions([...questions, newQ]);
    toast.success(`Gap ${nextNum} added to passage`);
    return { gapNum: nextNum };
  };

  const updatePart = (id: string, field: string, value: any) => {
    setParts((prev) =>
      prev.map((p) =>
        p.id === id || p.temp_id === id ? { ...p, [field]: value } : p,
      ),
    );
  };

  const updateQuestion = (id: string, field: string, value: any) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id || q.temp_id === id ? { ...q, [field]: value } : q,
      ),
    );
  };

  const deleteQuestion = (id: string) => {
    const q = questions.find((q) => q.id === id || q.temp_id === id);
    if (q && q.id && !q.id.toString().startsWith("temp-")) {
      setDeletedQuestionIds((prev) => [...prev, q.id]);
    }
    setQuestions((prev) => prev.filter((q) => q.id !== id && q.temp_id !== id));
    toast.info("Question removed");
  };

  const deleteQuestionGroup = (groupId: string) => {
    const groupQs = questions.filter((q) => q.group_id === groupId);
    const qIds = groupQs
      .map((q) => q.id)
      .filter((id) => id && !id.toString().startsWith("temp-"));
    if (qIds.length > 0) {
      setDeletedQuestionIds((prev) => [...prev, ...qIds]);
    }

    const updatedGroups = (currentPart?.question_groups || []).filter(
      (g: any) => g.id !== groupId,
    );
    updatePart(
      currentPart.id || currentPart.temp_id,
      "question_groups",
      updatedGroups,
    );
    setQuestions((prev) => prev.filter((q) => q.group_id !== groupId));
    toast.info("Question group removed");
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const snapshot = normalizeDocument({ schemaVersion: 1, parts, questions, audioUrl: sectionAudioUrl || "", durationMinutes: Number(moduleTimeMinutes || (sectionType === "listening" ? 30 : 60)) }, sectionType as Module);
      setParts(snapshot.parts); setQuestions(snapshot.questions);
      await onSave({ parts: snapshot.parts, questions: snapshot.questions, deletedPartIds, deletedQuestionIds });
      setDeletedPartIds([]);
      setDeletedQuestionIds([]);
      toast.success("Changes saved successfully");
    } catch (err) {
      console.error("handleSaveAll failed:", err);
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const addQuestionGroup = (type: string) => {
    if (!currentPart) return;

    const groupId = `group-${crypto.randomUUID()}`;
    const storageType = getStorageQuestionType(type);
    const selectedType = QUESTION_TYPES.find((t) => t.id === type);
    const newGroup = {
      id: groupId,
      type: storageType,
      ieltsQuestionType: type,
      title: selectedType?.label || "Question Group",
      instructions: getDefaultInstructions(type),
      matchingMode:
        storageType === "matching_paragraph_info" ||
        storageType === "matching_features" ||
        storageType === "matching_sentence_endings"
          ? "dropdown"
          : undefined,
      groupText:
        storageType === "summary_completion" ||
        storageType === "note_completion" ||
        storageType === "sentence_completion"
          ? storageType === "note_completion"
            ? "• Point 1 [[n1]]\n• Point 2 [[n2]]"
            : "Enter your text here..."
          : "",
      options:
        storageType === "matching_paragraph_info" ||
        storageType === "matching_features" ||
        storageType === "matching_sentence_endings"
          ? ["A", "B", "C", "D", "E", "F", "G"]
          : storageType === "matching_headings"
            ? [
                toRoman(1),
                toRoman(2),
                toRoman(3),
                toRoman(4),
                toRoman(5),
                toRoman(6),
                toRoman(7),
              ]
            : storageType === "true_false_ng"
              ? ["TRUE", "FALSE", "NOT GIVEN"]
              : storageType === "list_selection"
                ? ["Option A", "Option B", "Option C", "Option D", "Option E"]
                : storageType === "choosing_a_title"
                  ? ["Title A", "Title B", "Title C", "Title D"]
                  : type === "multiple_choice_multiple"
                    ? ["Option A", "Option B", "Option C", "Option D", "Option E"]
                    : type === "diagram_labelling_type_a"
                    ? ["A", "B", "C", "D", "E", "F", "G", "H"]
                    : usesWordBank(type)
                    ? ["Option A", "Option B", "Option C", "Option D", "Option E"]
                    : [],
      optionsTitle:
        storageType === "matching_features"
          ? "Sustainable features"
          : storageType === "matching_headings"
            ? "List of Headings"
            : storageType === "matching_sentence_endings"
              ? "List of Endings"
              : usesWordBank(type)
                ? "List of Words"
                : type === "diagram_labelling_type_a"
                  ? "List of Labels"
                  : "",
      headingAnswers: storageType === "matching_headings" ? {} : undefined,
      diagramTitle:
        storageType === "summary_completion" ||
        storageType === "note_completion" ||
        storageType === "sentence_completion" ||
        storageType === "diagram_completion" ||
        storageType === "flowchart_completion"
          ? type === "flowchart_completion_drag"
            ? "Flow-chart"
            : type === "diagram_labelling_type_a"
              ? "Plan/Map/Diagram"
              : "Enter Title"
          : "",
      diagramImage: "",
      tableHeaders:
        storageType === "table_completion"
          ? ["Column 1", "Column 2"]
          : ["Column 1", "Column 2"],
      tableRows: storageType === "table_completion" ? [["", ""]] : [["", ""]],
      tableColumnWidths: [150, 150],
      useTable: storageType === "table_completion",
      sections: [],
      labels: [],
      layout:
        storageType === "note_completion"
          ? "bullets"
          : storageType === "flowchart_completion"
            ? "type1"
            : "normal",
      flowchartData:
        storageType === "flowchart_completion"
          ? {
              type: type === "flowchart_completion_drag" ? "word_bank" : "scientific",
              steps: [
                {
                  id: `step-${crypto.randomUUID()}-1`,
                  text: "First step",
                  type: "step",
                },
                {
                  id: `step-${crypto.randomUUID()}-2`,
                  text: "Second step",
                  type: "step",
                },
              ],
            }
          : undefined,
    };

    const updatedPart = {
      ...currentPart,
      question_groups: [...(currentPart.question_groups || []), newGroup],
    };

    setParts((prev) =>
      prev.map((p) =>
        p.id === currentPart.id || p.temp_id === currentPart.id
          ? updatedPart
          : p,
      ),
    );

    // If note_completion, proactively add the two initial questions
    if (storageType === "note_completion") {
      const partId = currentPart.id || currentPart.temp_id;
      const q1 = {
        temp_id: `temp-q-note-${crypto.randomUUID()}-1`,
        part_id: partId,
        // removed section_id since questions table no longer has this column
        question_type: "note_completion",
        question_text: "Gap 1: [[n1]]",
        group_id: groupId,
        correct_answer: "",
        points: 1,
        order_index: questions.length + 1,
      };
      const q2 = {
        temp_id: `temp-q-note-${crypto.randomUUID()}-2`,
        part_id: partId,
        // removed section_id since questions table no longer has this column
        question_type: "note_completion",
        question_text: "Gap 2: [[n2]]",
        group_id: groupId,
        correct_answer: "",
        points: 1,
        order_index: questions.length + 2,
      };
      setQuestions((prev) => [...prev, q1, q2]);
    }

    // choosing_a_title: auto-create one question
    if (storageType === "choosing_a_title") {
      const partId = currentPart.id || currentPart.temp_id;
      const q = {
        temp_id: `temp-q-title-${crypto.randomUUID()}`,
        part_id: partId,
        question_type: "choosing_a_title",
        question_text: "Choose the best title for the passage.",
        group_id: groupId,
        correct_answer: "",
        options: ["Title A", "Title B", "Title C", "Title D"],
        points: 1,
        order_index: questions.length + 1,
      };
      setQuestions((prev) => [...prev, q]);
    }

    setShowGroupModal(false);
    return;
  };

  const getDefaultInstructions = (type: string) => {
    switch (type) {
      case "true_false_ng":
        return "Do the following statements agree with the information given in the passage?";
      case "paragraph_matching":
        return "Look at the following findings and the list of places below. Match each finding with the correct place A-E.";
      case "sentence_completion":
        return "Complete the sentences below. Choose NO MORE THAN TWO WORDS from the passage for each answer.";
      case "multiple_choice":
        return "Choose the correct letter, A, B, C or D.";
      case "multiple_choice_multiple":
        return "Choose TWO letters, A-E.";
      case "list_selection":
        return "Choose TWO letters, A-E.";
      case "matching_headings":
        return "Reading Passage has seven paragraphs, A-G. Choose the correct heading for each paragraph from the list of headings below.";
      case "matching_sentence_endings":
        return "Complete each sentence with the correct ending, A-G, below.";
      case "summary_completion":
        return "Complete the summary below. Choose ONE WORD AND/OR A NUMBER from the passage for each answer.";
      case "summary_completion_drag":
        return "Complete the summary below. Choose the correct word or phrase from the list.";
      case "note_completion":
        return "Complete the notes below. Choose ONE WORD AND/OR A NUMBER from the passage for each answer.";
      case "matching_features":
        return "What did each of the following studies find?";
      case "table_completion":
        return "Complete the table below. Choose NO MORE THAN TWO WORDS from the passage for each answer.";
      case "diagram_completion":
        return "Label the diagram below. Choose NO MORE THAN TWO WORDS from the passage for each answer.";
      case "diagram_labelling_type_a":
        return "Label the plan/map/diagram below. Choose the correct letter, A-H.";
      case "flowchart_completion":
        return "Complete the flow-chart below. Choose NO MORE THAN TWO WORDS from the passage for each answer.";
      case "flowchart_completion_drag":
        return "Complete the flow-chart below. Choose the correct word or phrase from the list.";
      case "choosing_a_title":
        return "Choose the best title for the passage.";
      default:
        return "Answer the following questions.";
    }
  };

  const updateQuestionGroup = (
    groupId: string,
    updates: Record<string, any>,
  ) => {
    if (!currentPart) return;
    const updatedGroups = (currentPart.question_groups || []).map((g: any) =>
      g.id === groupId ? { ...g, ...updates } : g,
    );
    updatePart(
      currentPart.id || currentPart.temp_id,
      "question_groups",
      updatedGroups,
    );
  };

  const addQuestionToGroup = (
    groupId: string,
    type: string,
    sectionIdx?: number,
  ) => {
    const group = partGroups.find((g: any) => g.id === groupId || g.temp_id === groupId);
    const newId = `temp-q-${crypto.randomUUID()}`;
    const storageType = getStorageQuestionType(type);
    const variantType = group?.ieltsQuestionType || type;
    const newQ = {
      id: newId,
      temp_id: newId,
      part_id: currentPart.id,
      temp_part_id: currentPart.id,
      // removed section_id since questions table no longer has this column
      question_type: storageType,
      ieltsQuestionType: variantType,
      question_text: "",
      group_id: groupId,
      sectionIndex: sectionIdx !== undefined ? sectionIdx : undefined,
      options:
        storageType === "multiple_choice" ||
        storageType === "list_selection" ||
        storageType === "matching" ||
        storageType === "matching_features" ||
        storageType === "matching_paragraph_info" ||
        storageType === "paragraph_matching" ||
        storageType === "matching_headings" ||
        storageType === "matching_sentence_endings" ||
        storageType === "drag_drop_matching"
          ? storageType === "multiple_choice" || variantType === "multiple_choice_multiple"
            ? ["Option A", "Option B", "Option C", "Option D"]
            : ["Option A", "Option B", "Option C"]
          : null,
      correct_answer: "",
      points: 1,
      order_index: questions.length + 1,
    };
    setQuestions([...questions, newQ]);
    toast.success("Question added to group");
  };

  const bulkAddQuestions = () => {
    if (!bulkQuestionGroupId || !bulkQuestionText.trim()) return;

    const group = partGroups.find((g: any) => g.id === bulkQuestionGroupId);
    if (!group) return;

    const lines = bulkQuestionText
      .split("\n")
      .filter((line) => line.trim().length > 0);
    const newQuestions = lines.map((line, idx) => {
      const newId = `temp-q-bulk-${crypto.randomUUID()}-${idx}`;
      return {
        id: newId,
        temp_id: newId,
        part_id: currentPart.id,
        temp_part_id: currentPart.id,
        // removed section_id since questions table no longer has this column
        question_type: group.type,
        ieltsQuestionType: group.ieltsQuestionType || group.type,
        question_text: line.trim(),
        group_id: bulkQuestionGroupId,
        options:
          group.type === "matching" ||
          group.type === "matching_features" ||
          group.type === "matching_paragraph_info" ||
          group.type === "paragraph_matching" ||
          group.type === "matching_headings" ||
          group.type === "matching_sentence_endings" ||
          group.type === "drag_drop_matching"
            ? ["Option A", "Option B", "Option C"]
            : null,
        correct_answer: "",
        points: 1,
        order_index: questions.length + idx + 1,
      };
    });

    setQuestions([...questions, ...newQuestions]);
    setBulkQuestionGroupId(null);
    setBulkQuestionText("");
    toast.success(`${newQuestions.length} questions added to group`);
  };

  const addSectionToGroup = (groupId: string) => {
    const group = partGroups.find((g: any) => g.id === groupId);
    if (!group) return;
    const newSection = {
      id: `section-${crypto.randomUUID()}`,
      title: `Section ${(group.sections || []).length + 1}`,
      content: "",
    };
    updateQuestionGroup(groupId, {
      sections: [...(group.sections || []), newSection],
    });
    toast.success("Section added");
  };

  const updateSection = (
    groupId: string,
    sectionIdx: number,
    field: string,
    value: any,
  ) => {
    const group = partGroups.find((g: any) => g.id === groupId);
    if (!group) return;
    const updatedSections = [...(group.sections || [])];
    updatedSections[sectionIdx] = {
      ...updatedSections[sectionIdx],
      [field]: value,
    };
    updateQuestionGroup(groupId, { sections: updatedSections });
  };

  const insertGapToSectionContent = (groupId: string, sectionIdx: number) => {
    const group = partGroups.find((g: any) => g.id === groupId);
    if (!group) return;

    const section = group.sections[sectionIdx];
    const currentText = section.content || "";
    const textarea = document.querySelector(
      `textarea[data-section-idx="${groupId}-${sectionIdx}"]`,
    ) as HTMLTextAreaElement;
    let newText = currentText;
    let insertPos = currentText.length;

    if (textarea) {
      insertPos = textarea.selectionStart;
    }

    // Find all gaps across all sections in this group to get next number
    let allGaps: string[] = [];
    (group.sections || []).forEach((s: any) => {
      const matches = (s.content || "").match(/\[\[(\d+)\]\]/g);
      if (matches) allGaps.push(...matches);
    });

    const nextNum =
      allGaps.length > 0
        ? Math.max(
            ...allGaps.map((g: string) => parseInt(g.match(/\d+/)?.[0] || "0")),
          ) + 1
        : 1;
    const gapTag = `[[${nextNum}]]`;

    newText =
      currentText.slice(0, insertPos) + gapTag + currentText.slice(insertPos);
    updateSection(groupId, sectionIdx, "content", newText);

    const newId = `temp-q-section-${crypto.randomUUID()}`;
    const newQ = {
      id: newId,
      temp_id: newId,
      part_id: currentPart.id,
      temp_part_id: currentPart.id,
      // removed section_id since questions table no longer has this column
      question_type: group.type,
      question_text: `Gap ${nextNum} from section ${sectionIdx + 1}: ${gapTag}`,
      group_id: groupId,
      sectionIndex: sectionIdx,
      correct_answer: "",
      points: 1,
      order_index: questions.length + 1,
    };
    setQuestions([...questions, newQ]);
    toast.success(`Gap ${nextNum} added to section content`);
  };

  const deleteSection = (groupId: string, sectionIdx: number) => {
    const group = partGroups.find((g: any) => g.id === groupId);
    if (!group || (group.sections || []).length <= 1) {
      toast.error("At least one section required");
      return;
    }
    const updatedSections = (group.sections || []).filter(
      (_: any, i: number) => i !== sectionIdx,
    );
    updateQuestionGroup(groupId, { sections: updatedSections });
    setQuestions((prev) =>
      prev.map((q) =>
        q.group_id === groupId && q.sectionIndex === sectionIdx
          ? { ...q, sectionIndex: 0 }
          : q,
      ),
    );
    toast.info("Section removed");
  };

  const addTableColumn = (
    groupId: string,
    index?: number,
    position: "left" | "right" = "right",
  ) => {
    const group = partGroups.find((g: any) => g.id === groupId);
    if (!group) return;

    const newHeaders = [...(group.tableHeaders || [])];
    const newWidths = [
      ...(group.tableColumnWidths || newHeaders.map(() => 150)),
    ];

    let insertIndex = newHeaders.length;
    if (typeof index === "number") {
      insertIndex = position === "left" ? index : index + 1;
    }

    newHeaders.splice(insertIndex, 0, `Column ${newHeaders.length + 1}`);
    newWidths.splice(insertIndex, 0, 150);

    const newRows = (group.tableRows || []).map((row: string[]) => {
      const newRow = [...row];
      newRow.splice(insertIndex, 0, "");
      return newRow;
    });

    updateQuestionGroup(groupId, {
      tableHeaders: newHeaders,
      tableColumnWidths: newWidths,
      tableRows: newRows,
    });
    toast.success("Column added");
  };

  const removeTableColumn = (groupId: string, colIdx: number) => {
    const group = partGroups.find((g: any) => g.id === groupId);
    if (!group || (group.tableHeaders || []).length <= 1) return;

    const newHeaders = group.tableHeaders.filter(
      (_: any, i: number) => i !== colIdx,
    );
    const newWidths = (
      group.tableColumnWidths || group.tableHeaders.map(() => 150)
    ).filter((_: any, i: number) => i !== colIdx);
    const newRows = group.tableRows.map((row: string[]) =>
      row.filter((_: any, i: number) => i !== colIdx),
    );

    updateQuestionGroup(groupId, {
      tableHeaders: newHeaders,
      tableColumnWidths: newWidths,
      tableRows: newRows,
    });
    toast.info("Column removed");
  };

  const addTableRow = (groupId: string, index?: number) => {
    const group = partGroups.find((g: any) => g.id === groupId);
    if (!group) return;
    const newRow = Array(group.tableHeaders.length).fill("");
    const newRows = [...(group.tableRows || [])];
    if (typeof index === "number") {
      newRows.splice(index + 1, 0, newRow);
    } else {
      newRows.push(newRow);
    }
    updateQuestionGroup(groupId, { tableRows: newRows });
    toast.success("Row added");
  };

  const removeTableRow = (groupId: string, rowIdx: number) => {
    const group = partGroups.find((g: any) => g.id === groupId);
    if (!group || (group.tableRows || []).length <= 1) return;
    const newRows = group.tableRows.filter((_: any, i: number) => i !== rowIdx);
    updateQuestionGroup(groupId, { tableRows: newRows });
    toast.info("Row removed");
  };

  const updateTableCell = (
    groupId: string,
    rowIdx: number,
    colIdx: number,
    value: string,
  ) => {
    const group = partGroups.find((g: any) => g.id === groupId);
    if (!group) return;
    const newRows = [...group.tableRows];
    newRows[rowIdx] = [...newRows[rowIdx]];
    newRows[rowIdx][colIdx] = value;
    updateQuestionGroup(groupId, { tableRows: newRows });
  };

  const insertGapToTableCell = (
    groupId: string,
    rowIdx: number,
    colIdx: number,
  ) => {
    const group = partGroups.find((g: any) => g.id === groupId);
    if (!group) return;

    const currentText = group.tableRows[rowIdx][colIdx] || "";
    const textarea = document.querySelector(
      `textarea[data-cell="${groupId}-${rowIdx}-${colIdx}"]`,
    ) as HTMLTextAreaElement;
    let newText = currentText;
    let insertPos = currentText.length;

    if (textarea) {
      insertPos = textarea.selectionStart;
    }

    // Find all existing gaps across all cells in the table to get the next number (MAX + 1)
    const allGaps: string[] = [];
    group.tableRows.forEach((row: string[]) => {
      row.forEach((cell: string) => {
        const gaps = cell.match(/\[\[(\d+)\]\]/g);
        if (gaps) allGaps.push(...gaps);
      });
    });

    const nextNum =
      allGaps.length > 0
        ? Math.max(
            ...allGaps.map((g: string) => parseInt(g.match(/\d+/)?.[0] || "0")),
          ) + 1
        : 1;
    const gapTag = `[[${nextNum}]]`;

    newText =
      currentText.slice(0, insertPos) + gapTag + currentText.slice(insertPos);
    updateTableCell(groupId, rowIdx, colIdx, newText);

    const newId = `temp-q-table-${crypto.randomUUID()}`;
    const newQ = {
      id: newId,
      temp_id: newId,
      part_id: currentPart.id,
      temp_part_id: currentPart.id,
      // removed section_id since questions table no longer has this column
      question_type: "table_completion",
      question_text: `Gap ${nextNum} from table: ${gapTag}`,
      group_id: groupId,
      correct_answer: "",
      points: 1,
      order_index: questions.length + 1,
    };
    setQuestions([...questions, newQ]);
    toast.success(`Gap ${nextNum} added to table cell`);
  };

  const handleMouseDown = (e: ReactMouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (resizingCol) {
        const deltaX = e.clientX - resizingCol.startX;
        const newWidth = Math.max(50, resizingCol.startWidth + deltaX);

        setResizingCol((prev) =>
          prev ? { ...prev, currentDelta: deltaX } : null,
        );

        const group = partGroups.find((g: any) => g.id === resizingCol.groupId);
        if (group) {
          const newWidths = [
            ...(group.tableColumnWidths || group.tableHeaders.map(() => 150)),
          ];
          newWidths[resizingCol.colIdx] = newWidth;
          updateQuestionGroup(resizingCol.groupId, {
            tableColumnWidths: newWidths,
          });
        }
        return;
      }

      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftPanelWidth(Math.max(20, Math.min(80, newWidth)));
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      setResizingCol(null);
    };
    if (isDragging || resizingCol) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, resizingCol, partGroups]);

  const insertImageToPassage = (imageUrl: string) => {
    const currentText = currentPart?.passage_text || "";
    const imageTag = `\n[IMAGE:${imageUrl}]\n`;
    updatePart(
      currentPart.id || currentPart.temp_id,
      "passage_text",
      currentText + imageTag,
    );
    setShowImageModal(false);
    toast.success("Image added to passage");
  };

  const insertTableToPassage = (rows: number, cols: number) => {
    const currentText = currentPart?.passage_text || "";
    let tableMarkup = "\n[TABLE]\n";
    for (let r = 0; r < rows; r++) {
      const cells = [];
      for (let c = 0; c < cols; c++) {
        cells.push(r === 0 ? `Header ${c + 1}` : `Cell ${r},${c + 1}`);
      }
      tableMarkup += `| ${cells.join(" | ")} |\n`;
    }
    tableMarkup += "[/TABLE]\n";
    updatePart(
      currentPart.id || currentPart.temp_id,
      "passage_text",
      currentText + tableMarkup,
    );
    setShowTableModal(false);
    toast.success("Table added to passage");
  };

  const insertGapToGroupText = (groupId: string, startNum: number = 1) => {
    const group = partGroups.find(
      (g: any) => g.id === groupId || g.temp_id === groupId,
    );
    if (!group) return;

    const isNote = isNoteCompletionGroup(group);
    const currentText = group.groupText || "";
    let displayText = formatGapTagsForAdmin(currentText, isNote);
    const editorEl = document.querySelector(
      `[data-group-id="${groupId}"]`,
    ) as HTMLElement | null;
    let insertPos = displayText.length;

    if (editorEl instanceof HTMLTextAreaElement) {
      displayText = editorEl.value;
      const start = typeof editorEl.selectionStart === "number" ? editorEl.selectionStart : displayText.length;
      const end = typeof editorEl.selectionEnd === "number" ? editorEl.selectionEnd : start;
      insertPos = start;
      displayText = displayText.slice(0, start) + displayText.slice(end);
    } else if (editorEl) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && editorEl.contains(selection.anchorNode)) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode("__GAP_INSERT__"));
        displayText = editorEl.innerHTML;
        insertPos = displayText.indexOf("__GAP_INSERT__");
        editorEl.innerHTML = displayText.replace("__GAP_INSERT__", "");
        displayText = editorEl.innerHTML;
      }
    }

    const existingGaps =
      currentText.match(isNote ? /\[\[n(\d+)\]\]/g : /\[\[(\d+)\]\]/g) || [];

    let nextNum = startNum;
    if (existingGaps.length > 0) {
      const maxGapNum = Math.max(
        ...existingGaps.map((g: string) =>
          parseInt(g.match(/\d+/)?.[0] || "0"),
        ),
      );
      nextNum = maxGapNum + 1;
    }

    const newDisplayText =
      displayText.slice(0, insertPos) + `[gap${nextNum}]` + displayText.slice(insertPos);
    const newText = parseAdminGapLabels(newDisplayText, isNote);
    updateQuestionGroup(groupId, { groupText: newText });
    syncGapQuestionsForGroup(group, newText);
    toast.success(`Gap ${nextNum} added to group text`);
  };


  const insertTextToGroupText = (groupId: string, text: string) => {
    const group = partGroups.find((g: any) => g.id === groupId || g.temp_id === groupId);
    if (!group) return;
    const currentText = group.groupText || "";
    const newText = currentText + text;
    updateQuestionGroup(groupId, { groupText: newText });
  };

  const addLineToGroupText = (groupId: string) => insertTextToGroupText(groupId, "\n");
  const addBulletToGroupText = (groupId: string) => insertTextToGroupText(groupId, "\n• ");

  const getGapNumsFromGroupText = (groupText: string, isNote: boolean) => {
    const reStr = isNote ? "\\[\\[n(\\d+)\\]\\]" : "\\[\\[(\\d+)\\]\\]";
    const rx = new RegExp(reStr, "g");
    const out: number[] = [];
    let m: RegExpExecArray | null;
    while ((m = rx.exec(groupText || "")) !== null) {
      const n = parseInt(m[1] || "0", 10);
      if (n && !out.includes(n)) out.push(n);
    }
    out.sort((a, b) => a - b);
    return out;
  };

  const findGapQuestionForNum = (groupQuestions: any[], gapNum: number) => {
    const rx = new RegExp(`\\[\\[(?:n)?${gapNum}\\]\\]`);
    return groupQuestions.find((q: any) => rx.test(String(q.question_text || "")));
  };

  const ensureGapQuestionsForGroup = (group: any, groupQuestions: any[]) => {
    const isNote = isNoteCompletionGroup(group);
    const gapNums = getGapNumsFromGroupText(group.groupText || "", isNote);
    const missing = gapNums.filter((n) => !findGapQuestionForNum(groupQuestions, n));
    if (missing.length === 0) {
      toast.success("All gaps already have questions");
      return;
    }
    const newQs = missing.map((n) => {
      const gapTag = isNote ? `[[n${n}]]` : `[[${n}]]`;
      const newId = `temp-q-group-${crypto.randomUUID()}-${n}`;
      return {
        id: newId,
        temp_id: newId,
        part_id: currentPart.id || currentPart.temp_id,
        temp_part_id: currentPart.id || currentPart.temp_id,
        question_type: group.type,
        question_text: isNote ? `Gap ${n}: [[n${n}]]` : `Gap ${n}: ${gapTag}`,
        group_id: group.id || group.temp_id,
        correct_answer: "",
        points: 1,
        order_index: questions.length + 1,
      };
    });
    setQuestions((prev) => [...prev, ...newQs]);
    toast.success(`Created ${newQs.length} gap question(s)`);
  };

  const formatGapTagsForAdmin = formatGapTagsForAdminText;

  const parseAdminGapLabels = parseAdminGapLabelsText;

  const getGapNumFromQuestion = (question: any) => {
    const match = String(question?.question_text || "").match(/\[\[(?:n)?(\d+)\]\]/);
    return match ? parseInt(match[1] || "0", 10) : 0;
  };

  const syncGapQuestionsForGroup = (group: any, groupText: string) => {
    const isNote = isNoteCompletionGroup(group);
    const groupId = group.id || group.temp_id;
    const gapNums = getGapNumsFromGroupText(groupText || "", isNote);

    setQuestions((prev) => {
      const sameGroup = prev.filter((q: any) => q.group_id === groupId);
      const removed = sameGroup.filter((q: any) => {
        const gapNum = getGapNumFromQuestion(q);
        return gapNum > 0 && !gapNums.includes(gapNum);
      });

      const removedIds = removed
        .map((q: any) => q.id)
        .filter((id: any) => id && !id.toString().startsWith("temp-"));
      if (removedIds.length > 0) {
        setDeletedQuestionIds((prevIds) => Array.from(new Set([...prevIds, ...removedIds])));
      }

      const kept = prev.filter((q: any) => !removed.some((removedQ: any) => (removedQ.id || removedQ.temp_id) === (q.id || q.temp_id)));
      const existingGroupQuestions = kept.filter((q: any) => q.group_id === groupId);
      const missing = gapNums.filter((n) => !findGapQuestionForNum(existingGroupQuestions, n));
      if (missing.length === 0) return kept;

      const newQs = missing.map((n) => {
        const gapTag = isNote ? `[[n${n}]]` : `[[${n}]]`;
        const newId = `temp-q-group-${crypto.randomUUID()}-${n}`;
        return {
          id: newId,
          temp_id: newId,
          part_id: currentPart.id || currentPart.temp_id,
          temp_part_id: currentPart.id || currentPart.temp_id,
          question_type: group.type,
          question_text: isNote ? `Gap ${n}: [[n${n}]]` : `Gap ${n}: ${gapTag}`,
          group_id: groupId,
          correct_answer: "",
          points: 1,
          order_index: kept.length + missing.indexOf(n) + 1,
        };
      });
      return [...kept, ...newQs];
    });
  };



  const isSplitLayout = sectionType === "reading" || sectionType === "writing";

  const renderQuestionGroup = (
    group: any,
    groupIndex: number,
    startNum: number,
    endNum: number,
  ) => {
    const groupQuestions = questions.filter(
      (q) => q.group_id === group.id || q.group_id === group.temp_id,
    );
    if (group.type === "source_html") return <SourceGroupEditor key={group.id} group={group} questions={groupQuestions} onGroupChange={patch=>updateQuestionGroup(group.id,patch)} onQuestionChange={(id,value)=>{updateQuestion(id,"correct_answer",value);if(groupQuestions.find(q=>q.id===id)?.question_type!=="list_selection")updateQuestion(id,"correct_answer_variants",value.split("/").map(v=>v.trim()).filter(Boolean));}}/>;
    const effectiveType = getEffectiveQuestionType(group);
    const isSummaryOrNote =
      effectiveType === "summary_completion" || effectiveType === "note_completion";
    const isSentenceCompletion = effectiveType === "sentence_completion";
    const isSummaryOrDragDrop =
      isSummaryOrNote ||
      group.type === "drag_drop_matching" ||
      isSentenceCompletion;

    const globalStartIdx = startNum - 1;
    const globalEndIdx = endNum;

    const isNote = isNoteCompletionGroup(group);
    const isTableGroup = group.type === "table_completion";
    const isFlowChart = group.type === "flowchart_completion";
    const isDiagram = group.type === "diagram_completion";
    const isParagraphMatching = group.type === "paragraph_matching";
    const isPassageBased =
      group.type === "sentence_completion_passage" ||
      group.type === "drag_drop_matching" ||
      group.type === "gap_fill" ||
      effectiveType === "summary_completion" ||
      effectiveType === "note_completion" ||
      effectiveType === "sentence_completion" ||
      group.type === "matching_headings" ||
      group.type === "paragraph_matching" ||
      group.type === "matching_features" ||
      group.type === "matching_sentence_endings" ||
      group.type === "matching" ||
      group.type === "flowchart_completion";

    const sections = group.sections || [];
    const showTableEditor = isTableGroup || (isPassageBased && group.useTable);
    const hasSections = false; // Flowcharts now use groupText for better design consistency

    return (
      <div
        key={group.id}
        className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
      >
        <div
          className={cn(
            "px-3 py-2 border-b border-gray-100 flex items-center justify-between bg-gray-50/60",
            theme.lightBg,
          )}
        >
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs",
                themeBg,
              )}
            >
              {getQuestionTypeMeta(group)?.icon || "?"}
            </div>
            <div className="flex flex-col items-center flex-1 pr-12">
              {globalEndIdx >= startNum ? (
                <h3 className="font-black text-[12px] uppercase tracking-widest text-gray-800 border-b-2 border-gray-100 pb-1 px-4">
                  Questions {startNum}
                  {endNum > startNum ? `-${endNum}` : ""}
                </h3>
              ) : (
                <h3 className="font-black text-[12px] uppercase tracking-widest text-gray-400 pb-1 px-4">
                  No Questions Yet
                </h3>
              )}
              {group.type !== "table_completion" && (
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter mt-1">
                  {getQuestionTypeMeta(group)?.label || group.title}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {(group.type === "sentence_completion" || group.type === "matching") &&
              group.type !== "paragraph_matching" &&
              group.type !== "summary_completion" && (
                <div className="flex bg-white rounded-lg border border-gray-200 p-0.5 mr-2 shadow-sm">
                  <button
                    onClick={() =>
                      updateQuestionGroup(group.id, {
                        matchingMode: "dropdown",
                      })
                    }
                    className={cn(
                      "px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all",
                      group.matchingMode === "dropdown" || !group.matchingMode
                        ? "bg-[#111] text-white shadow-md"
                        : "text-gray-400 hover:text-gray-600",
                    )}
                  >
                    Dropdown
                  </button>
                  <button
                    onClick={() =>
                      updateQuestionGroup(group.id, {
                        matchingMode: "drag_drop",
                      })
                    }
                    className={cn(
                      "px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all",
                      group.matchingMode === "drag_drop"
                        ? "bg-[#111] text-white shadow-md"
                        : "text-gray-400 hover:text-gray-600",
                    )}
                  >
                    Drag & Drop
                  </button>
                  <button
                    onClick={() =>
                      updateQuestionGroup(group.id, {
                        matchingMode: "radio_grid",
                      })
                    }
                    className={cn(
                      "px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all",
                      group.matchingMode === "radio_grid"
                        ? "bg-[#111] text-white shadow-md"
                        : "text-gray-400 hover:text-gray-600",
                    )}
                  >
                    Radio Grid
                  </button>
                </div>
              )}

            {group.type === "matching_headings" && (
              <button
                onClick={() =>
                  insertHeadingGapToPassage(group.id || group.temp_id)
                }
                className={cn(
                  "px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1 bg-white border border-gray-200 text-[#111] shadow-sm hover:bg-gray-50",
                )}
              >
                <Plus size={10} /> INSERT HEADING GAP
              </button>
            )}
            {isPassageBased &&
              group.type !== "matching_headings" &&
              group.type !== "paragraph_matching" &&
              group.type !== "multiple_choice" &&
              group.type !== "summary_completion" &&
              group.type !== "diagram_completion" && (
                <button
                  onClick={() =>
                    updateQuestionGroup(group.id, { useTable: !group.useTable })
                  }
                  className={cn(
                    "px-2 py-1 rounded-lg text-[8px] font-black uppercase transition-all flex items-center gap-1",
                    group.useTable
                      ? "bg-white text-black shadow-sm"
                      : "bg-black/5 text-gray-400",
                  )}
                >
                  <TableIcon size={10} />{" "}
                  {group.useTable ? "Table Mode" : "Switch to Table"}
                </button>
              )}
            {showTableEditor && (
              <>
                <button
                  onClick={() => addTableRow(group.id)}
                  className={cn(
                    "px-2 py-1 rounded-lg transition-colors text-[9px] font-black flex items-center gap-1",
                    theme.lightBg,
                    "hover:bg-opacity-80",
                  )}
                >
                  ADD ROW
                </button>
                <button
                  onClick={() => addTableColumn(group.id)}
                  className={cn(
                    "px-2 py-1 rounded-lg transition-colors text-[9px] font-black flex items-center gap-1",
                    theme.lightBg,
                    "hover:bg-opacity-80",
                  )}
                >
                  ADD COLUMN
                </button>
              </>
            )}
            {hasSections && (
              <button
                onClick={() => addSectionToGroup(group.id)}
                className={cn(
                  "px-2 py-1 rounded-lg transition-colors text-[9px] font-black flex items-center gap-1",
                  theme.lightBg,
                  "hover:bg-opacity-80",
                )}
              >
                ADD SECTION
              </button>
            )}
            {!isSummaryOrDragDrop &&
              !isTableGroup &&
              group.type !== "matching_headings" &&
              group.type !== "paragraph_matching" &&
              group.type !== "matching_features" &&
              group.type !== "matching_sentence_endings" &&
              group.type !== "list_selection" &&
              group.type !== "choosing_a_title" &&
              group.type !== "multiple_choice" && (
                <button
                  onClick={() => setBulkQuestionGroupId(group.id)}
                  className="px-2 py-1 rounded-lg transition-colors text-[9px] font-black flex items-center gap-1 bg-gray-100 text-gray-500 hover:bg-gray-200"
                >
                  <List size={10} /> BULK
                </button>
              )}

            <button
              onClick={() => deleteQuestionGroup(group.id)}
              className="p-1 hover:bg-gray-50 rounded-lg text-red-500 transition-colors"
              title="Delete group"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        <div className="p-2 border-b border-gray-100 bg-gray-50/50">
          <Label className="text-[7px] font-black uppercase text-gray-400 tracking-widest mb-1 block">
            Instructions
          </Label>
          <Textarea
            value={group.instructions}
            onChange={(e) =>
              updateQuestionGroup(group.id, { instructions: e.target.value })
            }
            className="w-full h-8 border-none bg-transparent text-[11px] italic text-gray-600 font-medium resize-none focus:ring-0 p-0 text-center"
            placeholder="Enter instructions..."
          />
        </div>

        <div className="exam-group-reference-editor">
          <label>Shared question image <input type="file" accept="image/png,image/jpeg,image/webp" onChange={async e => {
            const file = e.target.files?.[0]; if (!file) return;
            try { const url = await uploadQuestionImage(file); updateQuestionGroup(group.id, {referenceImage:url}); }
            catch (error) { toast.error(error instanceof Error ? error.message : "Image upload failed"); }
            e.target.value = "";
          }} /></label>
          {group.referenceImage && <><img className="ielts-group-reference-image" src={group.referenceImage} alt={group.referenceImageAlt || "Shared question image"} /><button type="button" onClick={() => updateQuestionGroup(group.id, {referenceImage:""})}>Remove shared image</button></>}
        </div>

        {isSummaryOrDragDrop && (group.options || []).length > 0 && <label className="flex items-center gap-3 px-4 py-3 text-sm">Answer input<select aria-label="Completion answer input" className="border px-2 py-1" value={group.matchingMode || "drag_drop"} onChange={e => updateQuestionGroup(group.id, { matchingMode: e.target.value })}><option value="drag_drop">Drag words into gaps</option><option value="dropdown">Dropdown inside paragraph</option></select></label>}
        {group.ieltsQuestionType === "summary_completion_drag" && (
          <div className="p-5 bg-[#f8fafc] border-b border-gray-200">
            <div className="max-w-3xl mx-auto bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">Word / Phrase List</div>
                  <div className="text-[11px] font-semibold text-gray-400 mt-1">These words appear below the summary and can be dragged into gaps.</div>
                </div>
                <button
                  type="button"
                  onClick={() => updateQuestionGroup(group.id, { options: [...(group.options || []), ""] })}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-[10px] font-black uppercase text-white hover:bg-gray-700"
                >
                  <Plus size={12} /> Add word
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(group.options || []).map((opt: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 group/word">
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const next = [...(group.options || [])];
                        next[idx] = e.target.value;
                        updateQuestionGroup(group.id, { options: next });
                      }}
                      className="h-7 w-32 border-0 bg-transparent px-1 text-xs font-bold shadow-none focus-visible:ring-0"
                      placeholder={`Word ${idx + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => updateQuestionGroup(group.id, { options: (group.options || []).filter((_: any, i: number) => i !== idx) })}
                      className="opacity-50 hover:opacity-100 text-red-500"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {group.type === "paragraph_matching" && (
          <div className="p-6 bg-[#f0f4f8] border-b border-gray-200">
            <div className="max-w-md mx-auto bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden group/box">
              <div className="absolute top-0 left-0 w-1 h-full bg-gray-500" />
              <Input
                value={group.optionsTitle || "List of Options"}
                onChange={(e) =>
                  updateQuestionGroup(group.id, {
                    optionsTitle: e.target.value,
                  })
                }
                className="font-black text-sm uppercase tracking-widest text-gray-700 mb-4 text-center border-none bg-white focus:ring-1 focus:ring-gray-200 h-8"
                placeholder="Box Heading (e.g. List of Options)..."
              />
              <div className="space-y-3">
                {(group.options || []).map((opt: string, idx: number) => (
                  <div key={idx} className="flex gap-3 items-center group/opt">
                    <div className="h-7 w-7 rounded-lg bg-[#111] text-white flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm">
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...group.options];
                        newOpts[idx] = e.target.value;
                        updateQuestionGroup(group.id, { options: newOpts });
                      }}
                      className="h-8 border-none bg-white font-bold text-xs focus:ring-1 focus:ring-gray-200 px-2 rounded-lg"
                      placeholder={`Option ${String.fromCharCode(65 + idx)}...`}
                    />
                    <button
                      onClick={() => {
                        const newOpts = group.options.filter(
                          (_: any, i: number) => i !== idx,
                        );
                        updateQuestionGroup(group.id, { options: newOpts });
                      }}
                      className="opacity-0 group-hover/opt:opacity-100 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() =>
                    updateQuestionGroup(group.id, {
                      options: [...(group.options || []), ""],
                    })
                  }
                  className="w-full py-2 border border-dashed border-gray-200 rounded-lg text-[9px] font-black text-blue-500 uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={12} /> Add New Option
                </button>
              </div>
            </div>
          </div>
        )}

        {!isDiagram && !isTableGroup && (
          <div className="p-4 border-b border-gray-100 bg-emerald-50/20">
            {isFlowChart ? (
              <FlowchartVisualEditor
                group={group}
                updateQuestionGroup={updateQuestionGroup}
                groupQuestions={groupQuestions}
                deleteQuestion={deleteQuestion}
                updateQuestion={updateQuestion}
                addQuestionToGroup={addQuestionToGroup}
                theme={theme}
                globalStartIdx={globalStartIdx}
                getGlobalIdx={getGlobalIdx}
                currentPart={currentPart}
                section={section}
                questions={questions}
                setQuestions={setQuestions}
              />
            ) : group.type === "matching_sentence_endings" ? (
              <MatchingSentenceEndingsVisualEditor
                group={group}
                updateQuestionGroup={updateQuestionGroup}
                groupQuestions={groupQuestions}
                deleteQuestion={deleteQuestion}
                updateQuestion={updateQuestion}
                addQuestionToGroup={addQuestionToGroup}
                theme={theme}
                getGlobalIdx={getGlobalIdx}
              />
            ) : group.type === "matching_features" ? (
              <MatchingFeaturesVisualEditor
                group={group}
                updateQuestionGroup={updateQuestionGroup}
                groupQuestions={groupQuestions}
                deleteQuestion={deleteQuestion}
                updateQuestion={updateQuestion}
                addQuestionToGroup={addQuestionToGroup}
                theme={theme}
                getGlobalIdx={getGlobalIdx}
              />
            ) : group.type === "list_selection" ? (
              <ListSelectionVisualEditor
                group={group}
                updateQuestionGroup={updateQuestionGroup}
                groupQuestions={groupQuestions}
                deleteQuestion={deleteQuestion}
                updateQuestion={updateQuestion}
                addQuestionToGroup={addQuestionToGroup}
                theme={theme}
                getGlobalIdx={getGlobalIdx}
              />
            ) : group.type === "choosing_a_title" ? (
              <ChoosingTitleVisualEditor
                group={group}
                updateQuestionGroup={updateQuestionGroup}
                groupQuestions={groupQuestions}
                deleteQuestion={deleteQuestion}
                updateQuestion={updateQuestion}
                addQuestionToGroup={addQuestionToGroup}
                theme={theme}
                getGlobalIdx={getGlobalIdx}
              />
            ) : (
              <>
                {isNote && (
                  <div className="mb-4">
                    <Label className="text-[10px] font-black uppercase text-emerald-800 tracking-widest mb-1 block">
                      Notes Title
                    </Label>
                    <Input
                      value={group.diagramTitle || ""}
                      onChange={(e) =>
                        updateQuestionGroup(group.id, {
                          diagramTitle: e.target.value,
                        })
                      }
                      className="w-full border-gray-200 bg-white rounded-lg h-9 text-sm font-bold shadow-sm"
                      placeholder="Enter notes title..."
                    />
                  </div>
                )}

                {(isSummaryOrNote || isSentenceCompletion) && (
                  <>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-[10px] font-black uppercase text-emerald-800 tracking-widest">
                    {isNote ? "Notes Content" : "Content"}
                  </Label>
                  <div className="flex items-center gap-2">
                    {isSentenceCompletion && (
                      <>
                        <button
                          type="button"
                          onClick={() => addLineToGroupText(group.id)}
                          className="text-[10px] font-black text-white bg-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-700 flex items-center gap-2 shadow-sm transition-all active:scale-95"
                          title="Add a new line"
                        >
                          + LINE
                        </button>
                        <button
                          type="button"
                          onClick={() => addBulletToGroupText(group.id)}
                          className="text-[10px] font-black text-white bg-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-700 flex items-center gap-2 shadow-sm transition-all active:scale-95"
                          title="Add a bullet point"
                        >
                          + BULLET
                        </button>
                      </>
                    )}
                    {!isNote && (
                      <button
                        type="button"
                        onClick={() => insertGapToGroupText(group.id, startNum)}
                        className="text-[10px] font-black text-white bg-emerald-600 px-4 py-1.5 rounded-lg hover:bg-emerald-700 flex items-center gap-2 shadow-sm transition-all active:scale-95"
                      >
                        <Plus size={14} /> INSERT GAP
                      </button>
                    )}
                  </div>
                </div>

                {(isNote || isSummaryOrNote) ? (
                  <CompletionRichEditor
                    value={group.groupText || ""}
                    groupId={group.id}
                    isNote={isNote}
                    placeholder={isNote ? "Type notes here. Use Insert Gap where the student answer field should appear." : "Type summary here. Use Bold/Title and Insert Gap where the student answer field should appear."}
                    onChange={(nextText) => updateQuestionGroup(group.id, { groupText: nextText })}
                    onSync={(nextText) => syncGapQuestionsForGroup(group, nextText)}
                  />
                ) : (
                  <Textarea
                    value={formatGapTagsForAdmin(group.groupText || "", isNote)}
                    data-group-id={group.id}
                    onChange={(e) => {
                      const nextText = parseAdminGapLabels(e.target.value, isNote);
                      updateQuestionGroup(group.id, { groupText: nextText });
                      syncGapQuestionsForGroup(group, nextText);
                    }}
                    className="w-full min-h-[150px] border-gray-200 bg-white rounded-xl p-4 text-sm font-medium leading-relaxed shadow-inner"
                    placeholder="Type content here. Click Insert Gap to add [gap1], [gap2]..."
                  />
                )}

                <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                        Answer Key
                      </div>
                      <div className="mt-1 text-[11px] font-semibold text-gray-400">
                        Each gap is one answer field. Use / for multiple accepted answers, e.g. car/vehicle.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => syncGapQuestionsForGroup(group, group.groupText || "")}
                      className="text-[10px] font-black text-gray-700 bg-white px-3 py-1.5 rounded-lg hover:bg-gray-100 border border-gray-200 shadow-sm"
                    >
                      Sync gaps from content
                    </button>
                  </div>

                  {(() => {
                    const gapNums = getGapNumsFromGroupText(group.groupText || "", isNote);
                    if (gapNums.length === 0) {
                      return (
                        <div className="text-[11px] font-bold text-gray-400">
                          No gaps yet. Add [gap1] using Insert Gap.
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {gapNums.map((n) => {
                          const qq = findGapQuestionForNum(groupQuestions, n);
                          return (
                            <div key={n} className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 p-3">
                              <div className="w-16 h-8 rounded-md bg-gray-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                                [gap{n}]
                              </div>
                              <div className="flex-1">
                                <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                                  Correct Answer
                                </div>
                                <Input
                                  value={qq?.correct_answer || ""}
                                  onChange={(e) =>
                                    qq && updateQuestion(qq.id || qq.temp_id, "correct_answer", e.target.value)
                                  }
                                  className="h-9 text-sm font-bold border-gray-200 bg-white rounded-lg"
                                  placeholder="Correct answer or alt/answer..."
                                  disabled={!qq}
                                />
                                {qq && String(qq.correct_answer || "").includes("/") && (
                                  <div className="text-[10px] text-emerald-700 font-bold mt-1">
                                    Multiple accepted answers enabled for this field.
                                  </div>
                                )}
                                {!qq && (
                                  <div className="text-[11px] text-amber-700 font-bold mt-1">
                                    Missing question. Click Sync gaps from content.
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                  </>
                )}

              </>
            )}
          </div>
        )}

        {showTableEditor && (
          <div className="p-6 bg-white border-b border-gray-100">
            <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white shadow-md relative group/table no-scrollbar min-h-[350px] pt-12 px-12 pb-12">
              <table className="w-full border-collapse border-hidden table-fixed">
                <thead>
                  <tr className="bg-gray-100">
                    {(group.tableHeaders || []).map(
                      (header: string, colIdx: number) => {
                        const widths =
                          group.tableColumnWidths ||
                          (group.tableHeaders || []).map(() => 150);
                        const width = widths[colIdx] || 150;
                        return (
                          <th
                            key={`header-${colIdx}`}
                            className="p-0 border border-gray-300 relative group/header bg-gray-100"
                            style={{ width: `${width}px` }}
                          >
                            {/* Column Management Group (More Visible) */}
                            <div className="absolute -top-10 left-0 right-0 flex justify-center gap-1 opacity-0 group-hover/header:opacity-100 transition-all z-50">
                              <button
                                onClick={() =>
                                  addTableColumn(group.id, colIdx, "left")
                                }
                                className="bg-white text-gray-900 w-7 h-7 rounded-lg shadow-xl hover:bg-blue-50 transition-all flex items-center justify-center group/btn border border-gray-300"
                                title="Add column to the left"
                              >
                                <Plus size={14} />
                                <span className="absolute -bottom-7 bg-black text-white text-[8px] px-1.5 py-0.5 rounded opacity-0 group-hover/btn:opacity-100 whitespace-nowrap pointer-events-none font-black uppercase">
                                  Add Left
                                </span>
                              </button>
                              <button
                                onClick={() =>
                                  removeTableColumn(group.id, colIdx)
                                }
                                className="bg-red-600 text-white w-7 h-7 rounded-lg shadow-xl hover:bg-red-700 transition-all flex items-center justify-center group/btn border border-white"
                                title="Delete Column"
                              >
                                <Trash2 size={14} />
                                <span className="absolute -bottom-7 bg-black text-white text-[8px] px-1.5 py-0.5 rounded opacity-0 group-hover/btn:opacity-100 whitespace-nowrap pointer-events-none font-black uppercase">
                                  Delete
                                </span>
                              </button>
                              <button
                                onClick={() =>
                                  addTableColumn(group.id, colIdx, "right")
                                }
                                className="bg-white text-gray-900 w-7 h-7 rounded-lg shadow-xl hover:bg-blue-50 transition-all flex items-center justify-center group/btn border border-gray-300"
                                title="Add column to the right"
                              >
                                <Plus size={14} />
                                <span className="absolute -bottom-7 bg-black text-white text-[8px] px-1.5 py-0.5 rounded opacity-0 group-hover/btn:opacity-100 whitespace-nowrap pointer-events-none font-black uppercase">
                                  Add Right
                                </span>
                              </button>
                            </div>

                            <div className="p-3 min-h-[60px] flex items-center justify-center relative">
                              <input
                                value={header}
                                onChange={(e) => {
                                  const newHeaders = [...group.tableHeaders];
                                  newHeaders[colIdx] = e.target.value;
                                  updateQuestionGroup(group.id, {
                                    tableHeaders: newHeaders,
                                  });
                                }}
                                className="w-full bg-transparent border-none font-black text-[11px] text-center outline-none focus:ring-0 placeholder:text-gray-400 uppercase tracking-tighter"
                                placeholder="Header..."
                              />
                            </div>

                            {/* Column Resize Handle */}
                            <div
                              className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-gray-500 transition-colors z-30"
                              onMouseDown={(e) => {
                                setResizingCol({
                                  groupId: group.id,
                                  colIdx,
                                  startX: e.clientX,
                                  startWidth: width,
                                  currentDelta: 0,
                                });
                                e.preventDefault();
                              }}
                            />
                          </th>
                        );
                      },
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(group.tableRows || []).map(
                    (row: string[], rowIdx: number) => (
                      <tr key={`row-${rowIdx}`} className="group/row">
                        {row.map((cell: string, colIdx: number) => {
                          const widths =
                            group.tableColumnWidths ||
                            (group.tableHeaders || []).map(() => 150);
                          const width = widths[colIdx] || 150;
                          return (
                            <td
                              key={`cell-${rowIdx}-${colIdx}`}
                              className="p-0 border border-gray-100 align-top relative group/cell hover:bg-gray-50/10 transition-colors"
                              style={{ width: `${width}px` }}
                            >
                              <Textarea
                                data-cell={`${group.id}-${rowIdx}-${colIdx}`}
                                value={cell}
                                onChange={(e) =>
                                  updateTableCell(
                                    group.id,
                                    rowIdx,
                                    colIdx,
                                    e.target.value,
                                  )
                                }
                                className="w-full min-h-[80px] border-none bg-transparent text-[12px] font-semibold resize-none focus:ring-0 p-4 leading-relaxed"
                                placeholder="..."
                              />
                              <div className="absolute top-2 right-2 opacity-0 group-hover/cell:opacity-100 transition-opacity z-10">
                                <button
                                  onClick={() =>
                                    insertGapToTableCell(
                                      group.id,
                                      rowIdx,
                                      colIdx,
                                    )
                                  }
                                  className="bg-white text-gray-900 p-1.5 rounded-lg shadow-lg hover:scale-110 transition-all border border-gray-300"
                                  title="Insert Gap"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            </td>
                          );
                        })}

                        {/* Row Actions */}
                        <td className="w-0 p-0 relative border-none">
                          {/* Handy Add Row Handle */}
                          <div className="absolute -left-10 bottom-0 translate-y-1/2 w-40 flex justify-center opacity-0 group-hover/row:opacity-100 transition-all z-40 pointer-events-none">
                            <button
                              onClick={() => addTableRow(group.id, rowIdx)}
                              className="bg-white text-gray-900 rounded-full px-4 py-2 shadow-xl hover:bg-blue-50 hover:scale-110 transition-all text-[10px] font-black pointer-events-auto flex items-center gap-1 border border-gray-300"
                              title="Add row below"
                            >
                              <Plus size={12} /> ADD ROW
                            </button>
                          </div>

                          {/* Delete Row Button */}
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 transition-all z-20">
                            <button
                              onClick={() => removeTableRow(group.id, rowIdx)}
                              className="bg-red-600 hover:bg-red-700 hover:scale-105 transition-all text-[9px] font-black whitespace-nowrap flex items-center gap-1 text-white p-1 rounded"
                              title="Delete row"
                            >
                              <Trash2 size={10} /> DELETE ROW
                            </button>
                          </div>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
            <button
              onClick={() => addTableRow(group.id)}
              className="mt-4 w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-[12px] font-black text-gray-400 hover:border-blue-300 hover:text-[#111] hover:bg-gray-50/50 transition-all flex items-center justify-center gap-3 uppercase tracking-widest"
            >
              <Plus size={18} /> Append New Row
            </button>

            {/* Table Answer Key Section */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-tight">
                    Table Answer Key
                  </h4>
                  <p className="text-[10px] text-gray-500 font-bold">
                    Write the correct answers for each gap in the table
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {groupQuestions.map((q, idx) => (
                  <div
                    key={q.id || q.temp_id}
                    className="flex items-center gap-3 bg-gray-50/50 p-3 rounded-2xl border border-gray-100 group/ans hover:border-green-200 transition-all"
                  >
                    <div className="w-7 h-7 rounded-lg bg-green-600 text-white flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <Label className="text-[8px] font-black uppercase text-gray-400 mb-1 block">
                        Correct Answer
                      </Label>
                      <Input
                        value={q.correct_answer}
                        onChange={(e) =>
                          updateQuestion(
                            q.id || q.temp_id,
                            "correct_answer",
                            e.target.value,
                          )
                        }
                        className="h-8 text-[11px] font-bold border-gray-200 rounded-xl focus:ring-green-500 focus:border-green-500"
                        placeholder="Enter answer..."
                      />
                    </div>
                  </div>
                ))}
                {groupQuestions.length === 0 && (
                  <div className="col-span-full py-8 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                    <p className="text-xs text-gray-400 font-bold">
                      No gaps created yet. Click the + button in table cells to
                      add gaps.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {group.type === "diagram_completion" && (
          <DiagramVisualEditor
            group={group}
            updateQuestionGroup={updateQuestionGroup}
            groupQuestions={groupQuestions}
            deleteQuestion={deleteQuestion}
            updateQuestion={updateQuestion}
            theme={theme}
            getGlobalIdx={getGlobalIdx}
            setQuestions={setQuestions}
            currentPart={currentPart}
            section={section}
            startNum={startNum}
          />
        )}

        {isFlowChart && (
          <div className="p-6 space-y-4 bg-white">
            <div className="flex items-center justify-center gap-4">
              <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() =>
                    updateQuestionGroup(group.id, { layout: "type1" })
                  }
                  className={cn(
                    "px-5 py-2 rounded-lg text-[10px] font-black uppercase transition-all",
                    group.layout === "type1" || !group.layout
                      ? "bg-white text-gray-800 shadow-sm"
                      : "text-gray-400 hover:text-gray-600",
                  )}
                >
                  Type 1 (Rounded)
                </button>
                <button
                  onClick={() =>
                    updateQuestionGroup(group.id, { layout: "type2" })
                  }
                  className={cn(
                    "px-5 py-2 rounded-lg text-[10px] font-black uppercase transition-all",
                    group.layout === "type2"
                      ? "bg-white text-gray-800 shadow-sm"
                      : "text-gray-400 hover:text-gray-600",
                  )}
                >
                  Type 2 (Bordered)
                </button>
              </div>
            </div>
          </div>
        )}

        {group.type === "matching_headings" && (
          <div className="p-6 bg-white border-b border-gray-100">
            <div className="space-y-6">
              {/* List of Headings Editor */}
              <div className="p-6 bg-gray-50/30 border border-gray-200 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-black text-sm text-blue-900 uppercase tracking-widest">
                      {group.optionsTitle || "List of Headings"}
                    </h4>
                    <p className="text-[10px] text-[#111] font-bold mt-1">
                      These headings will be draggable in the student preview
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const opts = [...(group.options || [])];
                      opts.push(toRoman(opts.length + 1));
                      updateQuestionGroup(group.id, { options: opts });
                    }}
                    className="px-3 py-1.5 bg-[#111] text-white rounded-lg text-[9px] font-black flex items-center gap-1.5 hover:bg-blue-700 shadow-sm"
                  >
                    <Plus size={12} /> ADD HEADING
                  </button>
                </div>
                <div className="space-y-2">
                  {(group.options || []).map((opt: string, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm group/opt"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#111] text-white flex items-center justify-center text-xs font-black shrink-0 shadow-sm">
                        {toRoman(idx + 1)}
                      </div>
                      <Input
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...(group.options || [])];
                          newOpts[idx] = e.target.value;
                          updateQuestionGroup(group.id, { options: newOpts });
                        }}
                        className="flex-1 h-9 border-gray-200 rounded-lg text-sm font-medium"
                        placeholder={`Heading ${toRoman(idx + 1)} text...`}
                      />
                      <button
                        onClick={() => {
                          const newOpts = (group.options || []).filter(
                            (_: any, i: number) => i !== idx,
                          );
                          updateQuestionGroup(group.id, { options: newOpts });
                        }}
                        className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-300 hover:text-red-500 opacity-0 group-hover/opt:opacity-100 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="p-2.5 space-y-2">
          {group.type === "paragraph_matching" ? (
            <div className="space-y-1">
              {groupQuestions.map((q, idx) => (
                <div
                  key={q.id || q.temp_id}
                  className="flex items-start gap-3 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm group/pm-q hover:border-gray-200 transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-[#111] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-md">
                    {startNum + idx}
                  </div>
                  <div className="flex-1 space-y-3">
                    <Textarea
                      value={q.question_text}
                      onChange={(e) =>
                        updateQuestion(
                          q.id || q.temp_id,
                          "question_text",
                          e.target.value,
                        )
                      }
                      className="w-full border border-gray-100 bg-white font-bold text-sm min-h-[44px] resize-none focus:ring-1 focus:ring-gray-200 p-3 rounded-xl text-gray-800 leading-tight shadow-sm"
                      placeholder="Enter statement/finding here..."
                    />
                    <div className="flex items-center gap-3 pt-2 border-t border-gray-50">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Correct Option:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {(group.options || []).map(
                          (_: unknown, oIdx: number) => {
                            const label = String.fromCharCode(65 + oIdx);
                            const isCorrect = getAnswerFieldParts(q.correct_answer).includes(label);
                            return (
                              <button
                                key={oIdx}
                                onClick={() =>
                                  updateQuestion(
                                    q.id || q.temp_id,
                                    "correct_answer",
                                    label,
                                  )
                                }
                                className={cn(
                                  "w-7 h-7 rounded-lg text-[10px] font-black transition-all border",
                                  isCorrect
                                    ? "bg-[#111] text-white border-blue-600 shadow-md scale-110"
                                    : "bg-gray-50 text-gray-400 border-gray-100 hover:border-blue-300 hover:text-blue-500",
                                )}
                              >
                                {label}
                              </button>
                            );
                          },
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteQuestion(q.id || q.temp_id)}
                    className="p-2 text-red-300 hover:text-red-500 hover:bg-gray-50 rounded-xl opacity-0 group-hover/pm-q:opacity-100 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  addQuestionToGroup(group.id, "paragraph_matching")
                }
                className="w-full py-3 mt-4 border-2 border-dashed border-gray-100 rounded-2xl text-[10px] font-black text-gray-400 uppercase tracking-widest hover:border-gray-200 hover:text-blue-500 hover:bg-gray-50/30 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={14} /> Add New Statement
              </button>
            </div>
          ) : !isFlowChart &&
            !showTableEditor &&
            !isDiagram &&
            group.type !== "matching_headings" &&
            group.type !== "matching_features" &&
            group.type !== "matching_sentence_endings" &&
            group.type !== "list_selection" &&
            group.type !== "choosing_a_title" &&
            !isInlineGapCompletionGroup(group) ? (
            <div className="space-y-2">
              {(() => {
                let displayOffset = globalStartIdx;
                return groupQuestions.map((q) => {
                  const rendered = renderQuestionEditor(q, displayOffset, group);
                  displayOffset += getQuestionDisplayCount(q);
                  return rendered;
                });
              })()}
              <button
                type="button"
                onClick={() => addQuestionToGroup(group.id, group.type)}
                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-[10px] font-black text-gray-400 uppercase tracking-widest hover:border-gray-300 hover:text-gray-700 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={14} /> Add Question
              </button>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  const renderQuestionEditor = (q: any, globalIdx: number, group: any) => {
    const showGapButton =
      group.type === "gap_fill" ||
      group.type === "sentence_completion_passage" ||
      group.type === "flow_chart" ||
      group.type === "short_answer";
    const answerFieldParts = getAnswerFieldParts(q.correct_answer);
    const updateAnswerField = (fieldIndex: number, value: string) => {
      const next = [...answerFieldParts];
      next[fieldIndex] = value;
      updateQuestion(q.id || q.temp_id, "correct_answer", next.join(","));
    };
    const addAnswerField = () => {
      updateQuestion(q.id || q.temp_id, "correct_answer", [...answerFieldParts, ""].join(","));
    };
    const removeAnswerField = (fieldIndex: number) => {
      if (answerFieldParts.length <= 1) return;
      updateQuestion(
        q.id || q.temp_id,
        "correct_answer",
        answerFieldParts.filter((_: string, idx: number) => idx !== fieldIndex).join(","),
      );
    };

    return (
      <div
        key={q.id || q.temp_id}
        className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-200 group/q"
      >
        <div
          className={cn(
            "w-8 h-8 rounded-md flex items-center justify-center font-bold text-sm shrink-0 border border-gray-300 bg-white text-gray-900",
          )}
        >
          {(() => {
            const displayStart = globalIdx + 1;
            const count = getQuestionDisplayCount(q);
            return count > 1 ? `${displayStart}-${displayStart + count - 1}` : displayStart;
          })()}
        </div>

        {group.type === "multiple_choice" ? (() => {
          const isMultiChoice =
            q.ieltsQuestionType === "multiple_choice_multiple" ||
            group.ieltsQuestionType === "multiple_choice_multiple";
          const selectedCorrect = String(q.correct_answer || "")
            .split(/[\/,]/)
            .map((v: string) => v.trim().toUpperCase())
            .filter(Boolean);
          const toggleCorrect = (label: string) => {
            if (!isMultiChoice) {
              updateQuestion(q.id || q.temp_id, "correct_answer", label);
              return;
            }
            const next = selectedCorrect.includes(label)
              ? selectedCorrect.filter((v: string) => v !== label)
              : [...selectedCorrect, label];
            updateQuestion(q.id || q.temp_id, "correct_answer", next.join(","));
          };
          return (
          <div className="space-y-3 w-full">
            <Textarea
              value={q.question_text}
              onChange={(e) =>
                updateQuestion(
                  q.id || q.temp_id,
                  "question_text",
                  e.target.value,
                )
              }
              className="w-full min-h-[64px] rounded-lg border border-gray-200 bg-white p-3 text-sm font-medium leading-relaxed text-gray-900 resize-none focus:ring-1 focus:ring-gray-300"
              placeholder="Write the question text here..."
            />

            <div className="space-y-2">
              {(
                q.options || ["Option A", "Option B", "Option C", "Option D"]
              ).map((opt: string, oIdx: number) => {
                const label = String.fromCharCode(65 + oIdx);
                const isCorrect = getAnswerFieldParts(q.correct_answer).includes(label);
                return (
                  <div
                    key={oIdx}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2 transition-all group/opt",
                      isCorrect
                        ? "border-[#1f7a8c] bg-[#d7eaf8]"
                        : "border-gray-200 bg-white hover:border-[#1f7a8c]",
                    )}
                  >
                    <button
                      onClick={() => toggleCorrect(label)}
                      className={cn(
                        "h-7 w-7 border text-xs font-bold shrink-0 transition-all",
                        isMultiChoice ? "rounded-sm" : "rounded-full",
                        isCorrect
                          ? "border-[#1f7a8c] bg-[#1f7a8c] text-white"
                          : "border-gray-300 bg-white text-gray-600 hover:border-[#1f7a8c]",
                      )}
                    >
                      {label}
                    </button>
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...(q.options || [])];
                        newOpts[oIdx] = e.target.value;
                        updateQuestion(q.id || q.temp_id, "options", newOpts);
                      }}
                      className="h-8 flex-1 border-0 bg-transparent p-0 text-sm font-medium shadow-none focus-visible:ring-0"
                      placeholder={`Option ${label}`}
                    />
                    <button
                      onClick={() => {
                        const newOpts = (q.options || []).filter(
                          (_: any, i: number) => i !== oIdx,
                        );
                        updateQuestion(q.id || q.temp_id, "options", newOpts);
                      }}
                      className="opacity-0 group-hover/opt:opacity-100 p-1.5 text-red-300 hover:text-red-500 hover:bg-gray-50 rounded-lg transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                    {isCorrect && <span className="text-[10px] font-bold text-[#1f7a8c]">Correct</span>}
                  </div>
                );
              })}
              {isMultiChoice && (
                <div className="rounded-lg bg-[#d7eaf8] px-3 py-2 text-[11px] font-bold text-[#111]">
                  Multiple answer mode: selected correct answers {selectedCorrect.length ? selectedCorrect.join(", ") : "none"}. This question uses {Math.max(1, selectedCorrect.length || 1)} question number{Math.max(1, selectedCorrect.length || 1) > 1 ? "s" : ""}.
                </div>
              )}
              <button
                onClick={() => {
                  const newOpts = [...(q.options || [])];
                  newOpts.push(
                    `Option ${String.fromCharCode(65 + newOpts.length)}`,
                  );
                  updateQuestion(q.id || q.temp_id, "options", newOpts);
                }}
                className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:border-gray-400 hover:bg-gray-50"
              >
                <Plus size={14} /> Add Option
              </button>
            </div>
          </div>
          );
        })() : (
          <div className="flex-1 space-y-4">
            <div className="relative">
              <Label className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-2 block">
                Question Text
              </Label>
              <Textarea
                value={q.question_text}
                onChange={(e) =>
                  updateQuestion(
                    q.id || q.temp_id,
                    "question_text",
                    e.target.value,
                  )
                }
                className="w-full min-h-[74px] rounded-2xl border border-gray-200 bg-gray-50/70 p-4 pr-20 text-sm font-semibold leading-relaxed text-gray-800 resize-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300"
                placeholder={getPlaceholderForType(group.type)}
              />
              {showGapButton && (
                <button
                  onClick={() => addGap(q.id || q.temp_id)}
                  className="absolute right-3 top-9 text-[9px] font-black bg-white border border-gray-200 px-3 py-1.5 rounded-xl hover:bg-gray-50 shadow-sm flex items-center gap-1 transition-all"
                >
                  GAP
                </button>
              )}
            </div>

            {group.type === "true_false_ng" && (
              <div className="flex flex-wrap gap-2">
                {["TRUE", "FALSE", "NG"].map((opt: string) => {
                  const value = opt === "NG" ? "not-given" : opt.toLowerCase();
                  const isCorrect = q.correct_answer === value;
                  return (
                    <button
                      key={opt}
                      onClick={() =>
                        updateQuestion(q.id || q.temp_id, "correct_answer", value)
                      }
                      className={cn(
                        "rounded-full border px-4 py-2 text-xs font-bold transition-all",
                        isCorrect
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-300 bg-white text-gray-600 hover:border-gray-900",
                      )}
                    >
                      {opt === "NG" ? "NOT GIVEN" : opt}
                    </button>
                  );
                })}
              </div>
            )}

            {group.type === "yes_no_ng" && (
              <div className="flex flex-wrap gap-2">
                {["YES", "NO", "NG"].map((opt: string) => {
                  const value = opt === "NG" ? "not-given" : opt.toLowerCase();
                  const isCorrect = q.correct_answer === value;
                  return (
                    <button
                      key={opt}
                      onClick={() =>
                        updateQuestion(q.id || q.temp_id, "correct_answer", value)
                      }
                      className={cn(
                        "rounded-full border px-4 py-2 text-xs font-bold transition-all",
                        isCorrect
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-300 bg-white text-gray-600 hover:border-gray-900",
                      )}
                    >
                      {opt === "NG" ? "NOT GIVEN" : opt}
                    </button>
                  );
                })}
              </div>
            )}

            {(group.type === "paragraph_matching" ||
              group.type === "matching" ||
              group.type === "matching_features" ||
              group.type === "drag_drop_matching" ||
              group.type === "matching_headings" ||
              group.type === "matching_sentence_endings" ||
              group.type === "matching_paragraph_info") && (
              <div className="flex flex-col gap-2 bg-white/50 p-2 rounded-lg border border-gray-100">
                <Label className="text-[8px] font-black uppercase text-gray-400">
                  Correct Answer Selection:
                </Label>
                <div className="flex flex-wrap gap-1">
                  {(group.options || ["A", "B", "C", "D", "E", "F", "G"]).map(
                    (opt: string, oIdx: number) => {
                      const label =
                        group.type === "matching_headings"
                          ? toRoman(oIdx + 1)
                          : String.fromCharCode(65 + oIdx);
                      const isCorrect = q.correct_answer === label;
                      const displayText =
                        group.type === "matching_headings"
                          ? `${label} - ${opt}`
                          : opt;
                      return (
                        <button
                          key={oIdx}
                          onClick={() =>
                            updateQuestion(
                              q.id || q.temp_id,
                              "correct_answer",
                              label,
                            )
                          }
                          className={cn(
                            "min-h-[28px] px-2 text-[10px] font-bold rounded-md border transition-all flex items-center gap-2 shadow-sm",
                            isCorrect
                              ? "bg-green-600 text-white border-green-700 ring-2 ring-green-100"
                              : "bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:bg-green-50",
                          )}
                          title={opt}
                        >
                          <span
                            className={cn(
                              "w-4 h-4 rounded flex items-center justify-center text-[9px] font-black",
                              isCorrect ? "bg-white/20" : "bg-gray-100",
                            )}
                          >
                            {group.type === "matching_headings"
                              ? oIdx + 1
                              : label}
                          </span>
                          <span className="max-w-[150px] truncate">
                            {displayText}
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>
                {q.correct_answer && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">
                      Selected:
                    </span>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold border border-green-200">
                      {(() => {
                        if (group.type === "matching_headings") {
                          const selectedIndex = (group.options || []).findIndex(
                            (_: any, idx: number) =>
                              toRoman(idx + 1) === q.correct_answer,
                          );
                          const headingText =
                            selectedIndex >= 0
                              ? group.options?.[selectedIndex]
                              : "Unknown";
                          const displayIndex =
                            selectedIndex >= 0 ? selectedIndex + 1 : "?";
                          return `${displayIndex} (${q.correct_answer}) - ${headingText}`;
                        }
                        const selectedIndex = q.correct_answer
                          ? q.correct_answer.charCodeAt(0) - 65
                          : -1;
                        return `${q.correct_answer} - ${group.options?.[selectedIndex] || "Unknown"}`;
                      })()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {group.type === "short_answer" ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                      Answer fields
                    </div>
                    <div className="text-[10px] font-semibold text-gray-400">
                      Add one field per numbered answer. Use / for alternatives.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={addAnswerField}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase text-gray-700 hover:bg-gray-100"
                  >
                    <Plus size={12} /> Add field
                  </button>
                </div>
                <div className="space-y-2">
                  {answerFieldParts.map((value: string, fieldIdx: number) => (
                    <div key={fieldIdx} className="flex items-center gap-2">
                      <div className="h-7 min-w-8 rounded-md bg-gray-900 px-2 text-white flex items-center justify-center text-[10px] font-black">
                        {globalIdx + fieldIdx + 1}
                      </div>
                      <Input
                        value={value}
                        onChange={(e) => updateAnswerField(fieldIdx, e.target.value)}
                        className="h-8 text-[11px] border-gray-200 rounded-md flex-1 font-bold bg-white"
                        placeholder="Correct answer or alt/answer..."
                      />
                      <button
                        type="button"
                        onClick={() => removeAnswerField(fieldIdx)}
                        disabled={answerFieldParts.length <= 1}
                        className="h-8 w-8 rounded-md border border-gray-200 bg-white text-red-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-red-400 flex items-center justify-center"
                        title="Remove answer field"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (group.type === "gap_fill" ||
              group.type === "sentence_completion_passage" ||
              group.type === "flow_chart") && (
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-black text-gray-400 uppercase">
                  Ans:
                </span>
                <Input
                  value={q.correct_answer}
                  onChange={(e) =>
                    updateQuestion(
                      q.id || q.temp_id,
                      "correct_answer",
                      e.target.value,
                    )
                  }
                  className="h-6 text-[10px] border-gray-200 rounded-md flex-1 max-w-[160px] font-bold"
                  placeholder="Answer(s) (use / for mult)..."
                />
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => deleteQuestion(q.id || q.temp_id)}
          className="p-1 hover:bg-gray-50 rounded text-gray-300 hover:text-red-500 opacity-0 group-hover/q:opacity-100 transition-opacity"
        >
          <Trash2 size={12} />
        </button>
      </div>
    );
  };

  const getPlaceholderForType = (type: string) => {
    switch (type) {
      case "flow_chart":
        return "e.g., he left __________ for financial reasons";
      case "true_false_ng":
        return "e.g., The public today has a positive view of frozen foods.";
      case "paragraph_matching":
        return "e.g., An explanation of the neurological process";
      case "gap_fill":
        return "e.g., It appears that placebos can treat or reduce the __________ of conditions.";
      case "sentence_completion_passage":
        return "e.g., Enter sentence text with __________ for blanks";
      case "matching":
        return "e.g., When did Francis Ronalds achieve a satisfactory result?";
      case "drag_drop_matching":
        return "e.g., Match the event to the correct person";
      default:
        return "Enter question text...";
    }
  };

  const ungroupedQuestions = partQuestions.filter((q) => !q.group_id);

  return (
    <div
      className="cdi-editor-root fixed inset-0 z-[100] bg-white flex flex-col font-sans select-none text-[#222] text-sm"
      ref={containerRef}
    >
      <header className="bg-white border-b border-gray-200 px-4 py-3 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0"><span className="text-xs font-semibold tracking-widest text-gray-600">JUMPTONINE / VISUAL EDITOR</span><h1 className="text-base font-semibold truncate">{testTitle} · {sectionType}</h1></div>
          <div className="flex flex-wrap items-center gap-2">
            {moduleTimeMinutes !== undefined && onModuleTimeChange && <label className="flex items-center gap-2 text-sm">Time <Input aria-label="Module time in minutes" type="number" min={1} max={240} value={moduleTimeMinutes} onChange={e => onModuleTimeChange(e.target.value)} className="w-16 h-9 border px-2" /> min</label>}
            {onPreview && <Button type="button" variant="outline" onClick={() => { try {
              const snapshot = normalizeDocument({ schemaVersion: 1, parts, questions, audioUrl: sectionAudioUrl || "", durationMinutes: Number(moduleTimeMinutes || (sectionType === "listening" ? 30 : 60)) }, sectionType as Module);
              setParts(snapshot.parts); setQuestions(snapshot.questions); onPreview(snapshot);
            } catch(e) { toast.error(e instanceof Error ? e.message : "Invalid module"); } }}><Eye size={16} /> Exam preview</Button>}
            <Button type="button" onClick={handleSaveAll} disabled={isSaving}><Save size={16} /> {isSaving ? "Saving…" : "Save changes"}</Button>
            <Button type="button" variant="ghost" onClick={onExit} aria-label="Exit editor"><LogOut size={18} /></Button>
          </div>
        </div>
      </header>

      {true && (
        <div className="h-9 bg-white border-b border-gray-100 flex items-center px-4 shrink-0 gap-4 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mr-1">
              Parts:
            </span>
            <div className="flex items-center gap-1">
              {parts.map((p: any, idx: number) => (
                <div
                  key={p.id || p.temp_id}
                  className="flex items-center group/p relative"
                >
                  <button
                    onClick={() => setCurrentPartIndex(idx)}
                    className={cn(
                      "h-6 px-3 rounded-md text-[9px] font-black uppercase tracking-wider transition-all border flex items-center gap-1.5",
                      currentPartIndex === idx
                        ? cn("bg-white text-[#111] shadow-sm border-[#222]", themeBorder)
                        : "bg-gray-100 border-transparent text-gray-500",
                    )}
                  >
                    PART {p.part_number}
                  </button>
                  <button
                    onClick={() => deletePart(idx)}
                    className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-gray-500 text-white opacity-0 group-hover/p:opacity-100 flex items-center justify-center hover:bg-black shadow-lg z-10"
                  >
                    <Trash2 size={8} />
                  </button>
                </div>
              ))}
              <button
                onClick={addPart}
                className={cn(
                  "w-6 h-6 rounded-md text-white flex items-center justify-center shadow-md",
                  themeBg,
                )}
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
          <div className="h-4 w-px bg-gray-200 shrink-0" />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGroupModal(true)}
              className="h-6 text-[8px] bg-white gap-1 font-black py-0 px-2 rounded-md"
            >
              <Layers size={10} /> ADD GROUP
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImageModal(true)}
              className="h-6 text-[8px] bg-white gap-1 font-black py-0 px-2 rounded-md"
            >
              <ImageIcon size={10} /> IMAGE
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTableModal(true)}
              className="h-6 text-[8px] bg-white gap-1 font-black py-0 px-2 rounded-md"
            >
              <TableIcon size={10} /> TABLE
            </Button>
          </div>
        </div>
      )}

      <main className="flex-1 flex relative overflow-hidden bg-[#f7f7f7]">
        {sectionType === "writing" ? (
          <WritingVisualEditor
            currentPart={currentPart}
            updatePart={updatePart}
            theme={theme}
          />
        ) : isSplitLayout ? (
          <>
            <div
              className="overflow-auto border-r border-gray-200 bg-white h-full shadow-lg z-10"
              style={{ width: `${leftPanelWidth}%` }}
            >
              <div className="p-4 max-w-4xl mx-auto space-y-4">
                <div
                  className={cn(
                    "p-3 rounded-xl border flex flex-col gap-1",
                    theme.lightBg,
                    theme.lightBorder,
                  )}
                >
                  <div className="flex items-center justify-between">
                    <Label
                      className={cn(
                        "text-[9px] font-black uppercase tracking-widest",
                        themeText,
                      )}
                    >
                      Part {currentPart?.part_number} Heading
                    </Label>
                  </div>
                  <input
                    type="text"
                    value={currentPart?.title || ""}
                    onChange={(e) =>
                      updatePart(
                        currentPart.id || currentPart.temp_id,
                        "title",
                        e.target.value,
                      )
                    }
                    className="text-xl font-black w-full outline-none bg-transparent placeholder:text-gray-300 py-0.5"
                    placeholder="Passage Title..."
                  />
                </div>
                {currentPart?.sourcePassage ? <SourcePassageEditor html={currentPart.passage_text||''} questions={questions.filter(q=>q.part_id===(currentPart.id||currentPart.temp_id)||q.temp_part_id===(currentPart.id||currentPart.temp_id))} onChange={html=>updatePart(currentPart.id||currentPart.temp_id,"passage_text",html)}/> : <PassageEditor
                  content={currentPart?.passage_text || ""}
                  onChange={(html) =>
                    updatePart(
                      currentPart.id || currentPart.temp_id,
                      "passage_text",
                      html,
                    )
                  }
                  onInsertGap={insertGapToPassage}
                  headingOptions={matchingHeadingsOptions}
                  placeholder="Type or paste passage content..."
                  className="flex-1"
                />}
              </div>
            </div>
            <div
              onMouseDown={handleMouseDown}
              className="w-1 bg-gray-200 hover:bg-[#111] cursor-col-resize flex-shrink-0 z-20"
            />
            <div className="overflow-auto flex-1 bg-[#f7f7f7] h-full relative">
              {resizingCol && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-gray-500 z-[100] pointer-events-none"
                  style={{
                    left: `${resizingCol.startX - containerRef.current!.getBoundingClientRect().left + (resizingCol.currentDelta || 0)}px`,
                  }}
                />
              )}
              <div className="p-4 max-w-6xl mx-auto space-y-4">
                {(() => {
                  let currentNum = 0;
                  // Calculate total questions in all parts before the current one
                  for (let i = 0; i < currentPartIndex; i++) {
                    const p = parts[i];
                    const pQs = questions.filter(
                      (q) =>
                        q.part_id === p.id ||
                        q.part_id === p.temp_id ||
                        q.temp_part_id === p.id ||
                        q.temp_part_id === p.temp_id,
                    );
                    currentNum += pQs.reduce((sum, q) => sum + getQuestionDisplayCount(q), 0);
                  }

                  return partGroups.map((group: any, idx: number) => {
                    const groupQs = questions.filter(
                      (q) => q.group_id === (group.id || group.temp_id),
                    );
                    const startNum = currentNum + 1;
                    currentNum += getGroupDisplayCount(group, groupQs);
                    const endNum = currentNum;
                    return renderQuestionGroup(
                      group,
                      idx,
                      startNum,
                      endNum > startNum ? endNum : startNum,
                    );
                  });
                })()}

                {ungroupedQuestions.length > 0 && (
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-black text-[10px] uppercase tracking-wide mb-3 text-gray-500">
                      Ungrouped Questions
                    </h3>
                    <div className="space-y-2">
                      {ungroupedQuestions.map((q, idx) =>
                        renderQuestionEditor(q, idx, { type: "short_answer" }),
                      )}
                    </div>
                  </div>
                )}
                <Button
                  onClick={() => setShowGroupModal(true)}
                  className={cn(
                    "w-full h-10 border-2 border-dashed bg-white rounded-xl font-black gap-2 shadow-sm text-xs hover:bg-opacity-5",
                    themeText,
                    themeBorder,
                  )}
                >
                  <Layers size={16} /> ADD QUESTION GROUP
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-auto bg-[#fafafa] p-3">
            <div className="max-w-4xl mx-auto space-y-3">
              <div
                className={cn(
                  "p-3 rounded-xl text-white shadow-md flex items-center justify-between",
                  themeBg,
                )}
              >
                <h2 className="text-base font-black uppercase">
                  Listening Editor
                </h2>
                <AudioLines className="h-4 w-4" />
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm space-y-3">
                {currentPartIndex === 0 && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">
                          Full Listening Audio
                        </p>
                        <p className="text-[11px] font-semibold text-blue-600/80">
                          One audio will play continuously for all listening parts.
                        </p>
                      </div>
                      {onSaveSectionAudio && (
                        <button
                          type="button"
                          onClick={() => onSaveSectionAudio(sectionAudioUrl || "")}
                          disabled={savingSectionAudio}
                          className="h-8 rounded-lg bg-blue-600 px-3 text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-60"
                        >
                          {savingSectionAudio ? "Saving" : "Save Audio"}
                        </button>
                      )}
                    </div>
                    <AdminAudioUploader
                      value={sectionAudioUrl || ""}
                      onChange={(url) => onSectionAudioChange?.(url)}
                      testId={testId}
                      sectionId={section?.id}
                      partId="shared-listening-audio"
                      label="Full listening audio"
                    />
                  </div>
                )}
                <Textarea
                  value={currentPart?.instructions || ""}
                  onChange={(e) =>
                    updatePart(
                      currentPart.id || currentPart.temp_id,
                      "instructions",
                      e.target.value,
                    )
                  }
                  className="w-full h-14 border-gray-100 rounded-lg bg-gray-50/30 text-[11px]"
                  placeholder="Instructions..."
                />
              </div>
              {(() => {
                let currentNum = 0;
                // Calculate total questions in all parts before the current one
                for (let i = 0; i < currentPartIndex; i++) {
                  const p = parts[i];
                  const pGroups = p.question_groups || [];
                  const groupedIds = new Set(
                    pGroups.flatMap((g: any) => [g.id, g.temp_id].filter(Boolean)),
                  );
                  const groupedDisplayCount = pGroups.reduce((sum: number, g: any) => {
                    const inlineCount = getInlineGapCount(g);
                    if (inlineCount != null) return sum + inlineCount;
                    const gQs = questions.filter((q) => q.group_id === g.id || q.group_id === g.temp_id);
                    return sum + getGroupDisplayCount(g, gQs);
                  }, 0);
                  const ungroupedCount = questions.filter(
                    (q) =>
                      (q.part_id === p.id ||
                        q.part_id === p.temp_id ||
                        q.temp_part_id === p.id ||
                        q.temp_part_id === p.temp_id) &&
                      !groupedIds.has(q.group_id),
                  ).length;
                  currentNum += groupedDisplayCount + ungroupedCount;
                }

                return partGroups.map((group: any, idx: number) => {
                  const groupQs = questions.filter(
                    (q) =>
                      q.group_id === group.id || q.group_id === group.temp_id,
                  );
                  const startNum = currentNum + 1;
                  currentNum += getGroupDisplayCount(group, groupQs);
                  const endNum = currentNum;
                  return renderQuestionGroup(group, idx, startNum, endNum);
                });
              })()}
              <Button
                onClick={() => setShowGroupModal(true)}
                className={cn(
                  "w-full h-10 border-2 border-dashed bg-white rounded-xl font-black text-[10px] gap-2 shadow-sm",
                  themeText,
                  themeBorder,
                )}
              >
                <Layers size={16} /> ADD QUESTION GROUP
              </Button>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-[#fafafa] border-t border-gray-200 h-10 shrink-0 shadow-lg z-[100]">
        <div className="flex justify-between items-center px-4 h-full gap-4">
          <div className="flex items-center h-full">
            {parts.map((p: any, idx: number) => (
              <button
                key={p.id || p.temp_id}
                onClick={() => setCurrentPartIndex(idx)}
                className={cn(
                  "h-full px-4 text-[9px] font-black uppercase tracking-widest border-t-2",
                  currentPartIndex === idx
                    ? cn(themeBorder, themeText, "bg-white")
                    : "border-transparent text-gray-400",
                )}
              >
                Part {p.part_number}
              </button>
            ))}
          </div>
          <div className="flex-1 flex justify-center gap-1 overflow-x-auto no-scrollbar">
            {partQuestions.map((q, idx) => {
              const qId = q.id || q.temp_id;
              const globalNum = getGlobalIdx(qId) + 1;
              return (
                <div
                  key={idx}
                  className={cn(
                    "min-w-[20px] h-5 rounded-md text-[8px] font-black flex items-center justify-center border-b-2",
                    q.correct_answer
                      ? "bg-[#222] border-black text-white"
                      : "bg-white border-gray-200 text-gray-400",
                  )}
                >
                  {globalNum > 0 ? globalNum : idx + 1}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            {currentPartIndex < parts.length - 1 ? (
              <button
                onClick={() => setCurrentPartIndex((prev) => prev + 1)}
                className={cn(
                  "text-white px-4 py-1 font-black h-7 text-[9px] rounded-lg shadow-md uppercase",
                  themeBg,
                )}
              >
                NEXT
              </button>
            ) : (
              <button
                onClick={handleSaveAll}
                className="bg-[#222] text-white px-4 py-1 font-black h-7 text-[9px] rounded-lg shadow-md uppercase"
              >
                SAVE
              </button>
            )}
          </div>
        </div>
      </footer>

      {showGroupModal && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden">
            <div
              className={cn(
                "p-6 text-white flex justify-between items-center",
                themeBg,
              )}
            >
              <h3 className="text-2xl font-black">Add Question Group</h3>
              <Button
                variant="ghost"
                onClick={() => setShowGroupModal(false)}
                className="text-white hover:bg-white/10 h-10 w-10 rounded-full"
              >
                <LogOut size={20} />
              </Button>
            </div>
            <div className="p-6 grid grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto">
              {QUESTION_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => addQuestionGroup(type.id)}
                  className="p-4 rounded-2xl border-2 border-gray-100 hover:border-[#222] text-left hover:shadow-lg transition-all"
                >
                  <div className="text-3xl mb-2">{type.icon}</div>
                  <h4 className="font-black text-sm">{type.label}</h4>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showImageModal && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-xl font-black">Insert Image</h3>
            <Input
              id="image-url-input"
              placeholder="https://example.com/image.png"
              className="h-12 border-gray-200 rounded-xl"
            />
            <Button
              onClick={() => {
                const val = (
                  document.getElementById("image-url-input") as HTMLInputElement
                )?.value;
                if (val) insertImageToPassage(val);
              }}
              className="w-full h-12 bg-green-600 hover:bg-green-700 rounded-xl font-black"
            >
              INSERT
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowImageModal(false)}
              className="w-full"
            >
              CANCEL
            </Button>
          </div>
        </div>
      )}

      {showTableModal && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-xl font-black">Insert Table</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="table-rows"
                type="number"
                defaultValue={3}
                className="h-12 rounded-xl"
              />
              <Input
                id="table-cols"
                type="number"
                defaultValue={3}
                className="h-12 rounded-xl"
              />
            </div>
            <Button
              onClick={() => {
                const r = parseInt(
                  (document.getElementById("table-rows") as HTMLInputElement)
                    ?.value,
                );
                const c = parseInt(
                  (document.getElementById("table-cols") as HTMLInputElement)
                    ?.value,
                );
                insertTableToPassage(r, c);
              }}
              className="w-full h-12 bg-[#111] hover:bg-[#333] rounded-xl font-black"
            >
              INSERT
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowTableModal(false)}
              className="w-full"
            >
              CANCEL
            </Button>
          </div>
        </div>
      )}

      {bulkQuestionGroupId && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black">Bulk Add Questions</h3>
              <button
                onClick={() => setBulkQuestionGroupId(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-gray-400 tracking-widest">
                Questions (One per line)
              </Label>
              <Textarea
                value={bulkQuestionText}
                onChange={(e) => setBulkQuestionText(e.target.value)}
                className="w-full min-h-[300px] border-2 border-gray-100 rounded-2xl p-4 font-bold text-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter each question on a new line..."
              />
            </div>
            <div className="flex gap-4">
              <Button
                onClick={bulkAddQuestions}
                className="flex-1 h-14 bg-[#111] hover:bg-blue-700 rounded-2xl font-black text-white shadow-xl"
              >
                ADD{" "}
                {bulkQuestionText.split("\n").filter((l) => l.trim()).length}{" "}
                QUESTIONS
              </Button>
              <Button
                variant="ghost"
                onClick={() => setBulkQuestionGroupId(null)}
                className="h-14 px-8 font-bold"
              >
                CANCEL
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
