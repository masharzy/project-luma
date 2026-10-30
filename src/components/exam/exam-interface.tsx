"use client";
import "@/styles/exam-engine.css";
import DOMPurify from 'isomorphic-dompurify';

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  Fragment } from
"react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Wifi,
  Bell,
  Menu,
  Volume2,
  X,
  AlertTriangle,
  Image as ImageIcon,
  Upload,
  Loader2 } from
"lucide-react";
import { cn } from "@/lib/exam/utils";
import { Button } from "@/components/exam/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from
"@/components/exam/ui/alert-dialog";
import { toast } from "./feedback";
import {SourceQuestionGroup} from "./source-question-group";
import { isObjectiveAnswerCorrect } from "@/lib/exam/mock-scoring";

export interface ExamInterfaceProps {
  nonce?: string;
  testTitle: string;
  sectionType: string; // "reading", "listening", "writing"
  parts: any[];
  questions: any[];
  timeLeft: number;
  answers: Record<string, any>;
  onAnswerChange: (questionId: string, answer: any) => void;
  onPassageChange?: (partId: string, html: string) => void;
  onFinish: () => void;
  onExit: () => void;
  disablePause?: boolean;
  reviewMode?: boolean;
  waitForAudioStart?: boolean;
  sectionAudioUrl?: string;
  onAudioPlaybackStarted?: () => void | Promise<void>;
  autoStartTimerOnAudioBlock?: boolean;
}

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
    i: 1
  };
  let str = "";
  for (let i of Object.keys(roman)) {
    let q = Math.floor(num / roman[i]);
    num -= q * roman[i];
    str += i.repeat(q);
  }
  return str;
};


const isDigit = (ch: string) => ch >= "0" && ch <= "9";

/** Strip basic HTML tags and decode a few common entities (no regex literals; SWC-safe). */
const stripHtmlToText = (html: string): string => {
  if (!html) return "";
  let out = "";
  let inTag = false;
  for (let i = 0; i < html.length; i++) {
    const ch = html[i];
    if (ch === "<") {
      inTag = true;
      continue;
    }
    if (ch === ">") {
      inTag = false;
      continue;
    }
    if (!inTag) out += ch;
  }
  out = out.
  replaceAll("&nbsp;", " ").
  replaceAll("&amp;", "&").
  replaceAll("&lt;", "<").
  replaceAll("&gt;", ">").
  replaceAll("&#39;", "'").
  replaceAll("&quot;", '"');
  return out.trim();
};


/** Checks token like "[[12]]" or note token "[[n12]]" */
const isBlankToken = (s: string): boolean => {
  if (!s) return false;
  const t = s.trim();
  if (!(t.startsWith("[[") && t.endsWith("]]"))) return false;
  let mid = t.slice(2, -2);
  if (mid[0]?.toLowerCase() === "n") mid = mid.slice(1);
  if (!mid) return false;
  for (let i = 0; i < mid.length; i++) if (!isDigit(mid[i])) return false;
  return true;
};


/** Split a string into text + blank tokens like "[[12]]" without using regex literals (SWC-safe). */
const splitByBlankTokens = (input: string): string[] => {
  if (!input) return [""];
  const out: string[] = [];
  let i = 0;
  while (i < input.length) {
    const start = input.indexOf("[[", i);
    if (start === -1) {
      out.push(input.slice(i));
      break;
    }
    if (start > i) out.push(input.slice(i, start));
    const end = input.indexOf("]]", start + 2);
    if (end === -1) {
      out.push(input.slice(start));
      break;
    }
    const token = input.slice(start, end + 2);
    if (isBlankToken(token)) {
      out.push(token.trim());
      i = end + 2;
    } else {
      out.push(input.slice(start, start + 2));
      i = start + 2;
    }
  }
  return out.filter((x) => x !== "");
};

/** Normalize table cell content into an array of renderable items (text chunks and tokens). */
const normalizeTableCellItems = (cell: any): string[] => {
  if (Array.isArray(cell)) return cell.map((x) => x == null ? "" : String(x));
  if (typeof cell === "string") return splitByBlankTokens(cell);
  if (cell == null) return [""];
  return [String(cell)];
};


const extractBlankTokenDigits = (s: string): string | null => {
  if (!isBlankToken(s)) return null;
  let mid = s.trim().slice(2, -2);
  if (mid[0]?.toLowerCase() === "n") mid = mid.slice(1);
  return mid;
};

/** Split text by [[n]] tokens, keeping the tokens in the output array (no regex literals). */
const splitKeepBlankTokens = (raw: string): string[] => {
  const text = String(raw ?? "");
  const out: string[] = [];
  let start = 0;
  let i = 0;
  while (i < text.length) {
    if (text[i] === "[" && text[i + 1] === "[") {
      let j = i + 2;
      if (j < text.length && text[j]?.toLowerCase() === "n") j++;
      if (j < text.length && isDigit(text[j])) {
        while (j < text.length && isDigit(text[j])) j++;
        if (text[j] === "]" && text[j + 1] === "]") {
          if (start < i) out.push(text.slice(start, i));
          out.push(text.slice(i, j + 2));
          i = j + 2;
          start = i;
          continue;
        }
      }
    }
    i++;
  }
  if (start < text.length) out.push(text.slice(start));
  return out;
};

const extractBlankTokens = (raw: string): string[] =>
splitKeepBlankTokens(raw).filter(isBlankToken);

const stripLeadingBullet = (raw: string): string => {
  const s = String(raw ?? "");
  if (!s) return s;
  const t = s.trimStart();
  if (t.startsWith("•") || t.startsWith("*")) {
    // remove the bullet and following spaces
    let k = 1;
    while (k < t.length && (t[k] === " " || t[k] === "\t")) k++;
    return t.slice(k);
  }
  return t;
};

/** Checks token like "[f12]" (flowchart gaps) */
const isFlowToken = (s: string): boolean => {
  const t = String(s ?? "").trim();
  if (!(t.startsWith("[") && t.endsWith("]"))) return false;
  const mid = t.slice(1, -1);
  if (mid.length < 2) return false;
  if (mid[0].toLowerCase() !== "f") return false;
  const digits = mid.slice(1);
  if (!digits) return false;
  for (let i = 0; i < digits.length; i++) if (!isDigit(digits[i])) return false;
  return true;
};

const splitKeepFlowTokens = (raw: string): string[] => {
  const text = String(raw ?? "");
  const out: string[] = [];
  let start = 0;
  let i = 0;
  while (i < text.length) {
    if (text[i] === "[" && (text[i + 1] === "f" || text[i + 1] === "F")) {
      let j = i + 2;
      if (j < text.length && text[j]?.toLowerCase() === "n") j++;
      if (j < text.length && isDigit(text[j])) {
        while (j < text.length && isDigit(text[j])) j++;
        if (text[j] === "]") {
          if (start < i) out.push(text.slice(start, i));
          out.push(text.slice(i, j + 1));
          i = j + 1;
          start = i;
          continue;
        }
      }
    }
    i++;
  }
  if (start < text.length) out.push(text.slice(start));
  return out;
};

const splitOnWhitespace = (raw: string): string[] => {
  const s = String(raw ?? "");
  const out: string[] = [];
  let buf = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const isWs = ch === " " || ch === "\n" || ch === "\t" || ch === "\r" || ch === "\f" || ch === "\v";
    if (isWs) {
      if (buf) {
        out.push(buf);
        buf = "";
      }
    } else {
      buf += ch;
    }
  }
  if (buf) out.push(buf);
  return out;
};


/**
 * Extracts heading-gap number from tokens like "[H1]" (returns "1") or "H1".
 * Returns null when not a heading token.
 */
const getHeadingGapNumFromText = (raw: any): string | null => {
  const t = stripHtmlToText(String(raw ?? "")).trim();
  if (!t) return null;
  // Accept formats: [H12], [h12], H12, h12
  let s = t;
  if (s.startsWith("[") && s.endsWith("]")) s = s.slice(1, -1).trim();
  if (s.length < 2) return null;
  if (s[0].toLowerCase() !== "h") return null;
  const rest = s.slice(1);
  if (!rest) return null;
  for (let i = 0; i < rest.length; i++) {
    if (!isDigit(rest[i])) return null;
  }
  return rest;
};

const formatHeadingTokenForDisplay = (raw: any): string => {
  const n = getHeadingGapNumFromText(raw);
  if (!n) return String(raw ?? "");
  // User-facing label (avoid showing [H#])
  return `Paragraph ${n}`;
};

const buildHeadingDropzoneHtml = (
gapNum: string,
value: string,
isActive: boolean,
reviewMode?: boolean,
correctAnswer?: string,
headingLabelToText?: Record<string, string>) =>
{
  // Inline styles to avoid Tailwind safelist issues for HTML-injected nodes.
  let border = isActive ? "2px dashed #2563eb" : "2px dashed #cbd5e1";
  let bg = isActive ? "#eff6ff" : "#ffffff";

  if (reviewMode && value) {
    const isCorrect = correctAnswer && value.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    border = isCorrect ? "2px solid #16a34a" : "2px solid #dc2626";
    bg = isCorrect ? "#f0fdf4" : "#fef2f2";
  }

  const displayValue = value ? headingLabelToText?.[value.trim().toUpperCase()] || value : "";
  const txt = displayValue ? displayValue : reviewMode ? "—" : "";
  const txtColor = reviewMode && value ?
  correctAnswer && value.trim().toLowerCase() === correctAnswer.trim().toLowerCase() ? "#15803d" : "#dc2626" :
  value ? "#111827" : "#111827";

  const correctHint = reviewMode && correctAnswer && value && value.trim().toLowerCase() !== correctAnswer.trim().toLowerCase() ?
  `<span style="display:block;font-size:10px;font-weight:700;color:#16a34a;margin-top:2px;">${correctAnswer}</span>` :
  "";

  const clearButton = value && !reviewMode ? `<span class="ielts-heading-clear" data-heading-clear="${gapNum}" title="Remove heading" style="position:absolute;right:6px;top:50%;transform:translateY(-50%);display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:999px;background:#111827;color:#fff;font-size:12px;font-weight:900;line-height:1;cursor:pointer;z-index:2;pointer-events:auto;">×</span>` : "";

  return `
<span data-heading-gap="${gapNum}" data-heading-filled="${value ? "true" : "false"}" title="${value && !reviewMode ? "Click × to remove this heading" : "Drop a heading here"}" style="position:relative;display:flex;align-items:center;justify-content:center;width:100%;min-height:30px;padding:3px ${value && !reviewMode ? "30px" : "8px"} 3px 8px;border:${border};border-radius:0;background:${bg};box-shadow:none;user-select:none;cursor:pointer;margin:6px 0;color:${txtColor};font-weight:700;font-size:13px;line-height:1.15;">
  ${txt || gapNum}${clearButton}
</span>${correctHint}`;
};

const injectHeadingGapsIntoPassageHtml = (
rawHtml: string,
gapNumToQuestionId: Record<string, string>,
answersMap: Record<string, any>,
activeGap: string | null,
reviewMode?: boolean,
questionCorrectAnswers // qId → correct_answer
?: Record<string, string>,
headingLabelToText?: Record<string, string>) => {
  const src = String(rawHtml ?? "");
  if (!src) return "";

  let out = "";
  let i = 0;

  const attr = 'data-heading-gap="';

  while (i < src.length) {
    const idxToken = src.indexOf("[H", i);
    const idxAttr = src.indexOf(attr, i);

    let next = -1;
    let kind: "token" | "attr" | null = null;

    if (idxToken !== -1 && idxAttr !== -1) {
      next = Math.min(idxToken, idxAttr);
      kind = next === idxToken ? "token" : "attr";
    } else if (idxToken !== -1) {
      next = idxToken;
      kind = "token";
    } else if (idxAttr !== -1) {
      next = idxAttr;
      kind = "attr";
    } else {
      out += src.slice(i);
      break;
    }

    if (kind === "token") {
      // Try parse [H123]
      const start = next;
      let j = start + 2; // after [H
      let num = "";
      while (j < src.length && isDigit(src[j])) {
        num += src[j];
        j++;
      }
      if (num && j < src.length && src[j] === "]") {
        out += src.slice(i, start);
        const qId = gapNumToQuestionId[num] || "";
        const val = qId ? String(answersMap?.[qId] ?? "") : "";
        const correctAns = qId && questionCorrectAnswers ? questionCorrectAnswers[qId] : undefined;
        out += buildHeadingDropzoneHtml(num, val, activeGap === num, reviewMode, correctAns, headingLabelToText);
        i = j + 1;
        continue;
      }
      // Not a valid token, just copy "[H" and continue
      out += src.slice(i, start + 2);
      i = start + 2;
      continue;
    }

    // kind === "attr"
    // Replace tags like <span data-heading-gap="2" ...></span> with our dropzone.
    const attrPos = next + attr.length;
    let j = attrPos;
    let num = "";
    while (j < src.length && isDigit(src[j])) {
      num += src[j];
      j++;
    }
    if (!num) {
      out += src.slice(i, next);
      i = next + 1;
      continue;
    }

    const tagStart = src.lastIndexOf("<", next);
    const tagEnd = src.indexOf(">", next);
    if (tagStart === -1 || tagEnd === -1) {
      out += src.slice(i, next);
      i = next + 1;
      continue;
    }

    let after = tagEnd + 1;
    const selfClosing = src[tagEnd - 1] === "/";
    if (!selfClosing) {
      const closeTag = "</span>";
      const closeIdx = src.indexOf(closeTag, after);
      if (closeIdx !== -1) after = closeIdx + closeTag.length;
    }

    out += src.slice(i, tagStart);
    const qId = gapNumToQuestionId[num] || "";
    const val = qId ? String(answersMap?.[qId] ?? "") : "";
    const correctAns = qId && questionCorrectAnswers ? questionCorrectAnswers[qId] : undefined;
    out += buildHeadingDropzoneHtml(num, val, activeGap === num, reviewMode, correctAns, headingLabelToText);
    i = after;
  }

  return out;
};



// XSS sanitization helper
function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, { ADD_ATTR: ['data-heading-gap', 'data-heading-filled', 'data-heading-clear'] });
}
export default function ExamInterface({
  nonce,
  testTitle,
  sectionType,
  parts,
  questions,
  timeLeft,
  answers,
  onAnswerChange,
  onPassageChange,
  onFinish,
  onExit,
  disablePause,
  reviewMode = false,
  waitForAudioStart = false,
  sectionAudioUrl = "",
  onAudioPlaybackStarted,
  autoStartTimerOnAudioBlock = false
}: ExamInterfaceProps) {
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioPartIndex,setAudioPartIndex]=useState(0);
  const [audioFallbackIndex,setAudioFallbackIndex]=useState(0);
  const audioAttemptedForRef = useRef<string | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submittingModule, setSubmittingModule] = useState(false);
  const [highlightMenu, setHighlightMenu] = useState<{
    x: number;
    y: number;
    show: boolean;
    selectedRange: Range | null;
  }>({
    x: 0,
    y: 0,
    show: false,
    selectedRange: null
  });
  const [clearHighlightMenu, setClearHighlightMenu] = useState<{
    x: number;
    y: number;
    show: boolean;
    highlightId: string | null;
  }>({
    x: 0,
    y: 0,
    show: false,
    highlightId: null
  });
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [passageHtml, setPassageHtml] = useState<string>("");
  const [dragOverHeadingGap, setDragOverHeadingGap] = useState<string | null>(null);
  // Writing reference image: prevent layout jump + handle slow loading
  const [writingImageLoaded, setWritingImageLoaded] = useState(false);
  const [writingDrafts, setWritingDrafts] = useState<Record<string, string>>(
    {}
  );
  const [showOptionsPanel, setShowOptionsPanel] = useState(false);
  const [optionsView, setOptionsView] = useState<"main" | "contrast" | "text-size">("main");
  const [contrastMode, setContrastMode] = useState<"bw" | "wb" | "yb">("bw");
  const [textSizeMode, setTextSizeMode] = useState<"regular" | "large" | "extra">("regular");

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const currentPart = parts[currentPartIndex];
  const listeningSources=sectionAudioUrl?[sectionAudioUrl]:[parts[audioPartIndex]?.audio_url,...(parts[audioPartIndex]?.audio_fallbacks||[])].filter(Boolean);
  const listeningAudioUrl = sectionType === "listening" ? String(listeningSources[audioFallbackIndex]||"") : "";
  const officialContrastClass = contrastMode === "wb" ? "ielts-contrast-white-on-black" : contrastMode === "yb" ? "ielts-contrast-yellow-on-black" : "ielts-contrast-black-on-white";
  const officialTextSizeClass = textSizeMode === "large" ? "ielts-text-large" : textSizeMode === "extra" ? "ielts-text-extra" : "ielts-text-regular";
  const sectionLabel = String(sectionType || "test").charAt(0).toUpperCase() + String(sectionType || "test").slice(1);
  const getPartDisplayTitle = (part: any, index = currentPartIndex) => {
    const title = String(part?.title || "").trim();
    return title && !/^new\s+part$/i.test(title) ? title : `Part ${index + 1}`;
  };

  const headingGapNumToQuestionId = useMemo(() => {
    const map: Record<string, string> = {};
    const groups = (currentPart as any)?.question_groups || [];
    for (const g of groups) {
      const groupQs = questions.filter((q: any) => q.group_id === g.id);
      for (const q of groupQs) {
        const n = getHeadingGapNumFromText(q.question_text);
        if (n) map[n] = q.id;
      }
    }
    // Also catch ungrouped questions in this part (rare)
    for (const q of questions) {
      if (q.part_id !== (currentPart as any)?.id) continue;
      const n = getHeadingGapNumFromText(q.question_text);
      if (n) map[n] = q.id;
    }
    return map;
  }, [currentPart, questions]);

  const headingQuestionCorrectAnswers = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [gapNum, qId] of Object.entries(headingGapNumToQuestionId)) {
      const q = questions.find((qq: any) => qq.id === qId);
      if (q?.correct_answer) map[qId] = String(q.correct_answer).trim();
    }
    return map;
  }, [headingGapNumToQuestionId, questions]);

  const headingLabelToText = useMemo(() => {
    const map: Record<string, string> = {};
    const groups = (currentPart as any)?.question_groups || [];
    for (const group of groups) {
      if (getGroupType(group) !== "matching_headings") continue;
      const opts = Array.isArray(group.options) ? group.options : [];
      opts.forEach((opt: any, idx: number) => {
        const label = toRoman(idx + 1).toUpperCase();
        const text = String(opt || "").trim();
        if (text) map[label] = text;
      });
    }
    return map;
  }, [currentPart]);

  const injectedPassageHtml = useMemo(() => {
    const raw = passageHtml || (currentPart as any)?.passage_text || "";
    return injectHeadingGapsIntoPassageHtml(
      raw,
      headingGapNumToQuestionId,
      answers,
      dragOverHeadingGap,
      reviewMode,
      reviewMode ? headingQuestionCorrectAnswers : undefined,
      headingLabelToText
    );
  }, [passageHtml, currentPart, headingGapNumToQuestionId, answers, dragOverHeadingGap, reviewMode, headingQuestionCorrectAnswers, headingLabelToText]);


  const writingQuestionId = useMemo(() => {
    if (sectionType !== "writing") return "";
    // Primary: writing question linked to the current part
    const byPart = questions.find((q: any) => q.part_id === currentPart?.id);
    if (byPart?.id) return byPart.id;
    // Fallback: some schemas link writing questions only by section_id
    const bySection = questions.find(
      (q: any) => q.section_id && q.section_id === currentPart?.section_id
    );
    return bySection?.id || "";
  }, [sectionType, questions, currentPart?.id, currentPart?.section_id]);

  // Reset writing reference image loaded state when part/image changes
  useEffect(() => {
    if (sectionType !== "writing") return;
    setWritingImageLoaded(false);
  }, [sectionType, currentPartIndex, currentPart?.image_url]);

  useEffect(() => {
    if (!currentPart?.id) return;
    setPassageHtml(currentPart.passage_text || "");
  }, [currentPart?.id, currentPart?.passage_text]);

  useEffect(() => {
    audioAttemptedForRef.current = null;
    setAudioReady(false);
    setAudioStarted(false);
    setAudioError(null);
  }, [listeningAudioUrl]);

  const attemptListeningAudioPlayback = useCallback(async (source: 'auto' | 'manual') => {
    const audio = audioRef.current;
    const audioUrl = listeningAudioUrl;
    if (!audio || reviewMode || !audioUrl) return;
    if (source === 'auto' && audioAttemptedForRef.current === audioUrl) return;

    audioAttemptedForRef.current = audioUrl;

    try {
      setAudioError(null);
      if (audio.src !== audioUrl) audio.src = audioUrl;
      if (audio.error) audio.load();
      if (audio.paused) await audio.play();
      // Only the HTMLMediaElement "playing" event is allowed to start the clock.
    } catch (error) {
      if (source === 'manual') audioAttemptedForRef.current = null;
      const fallbackText = autoStartTimerOnAudioBlock
        ? 'Audio did not start automatically. Press Play to continue listening.'
        : source === 'auto'
          ? 'Audio is ready. Press "Play audio" to begin.'
          : 'Please tap Start Listening again. Your timer has not started yet.';
      setAudioError(fallbackText);
    }
  }, [autoStartTimerOnAudioBlock, listeningAudioUrl, onAudioPlaybackStarted, reviewMode]);

  const handleStartListeningAudio = useCallback(() => {
    void attemptListeningAudioPlayback('manual');
  }, [attemptListeningAudioPlayback]);

  useEffect(() => {
    const audioUrl = listeningAudioUrl;
    if (!audioUrl || reviewMode) return;
    const audio = audioRef.current;
    if (!audio) return;

    audio.preload = 'auto';
    if (audio.src !== audioUrl) {
      audio.src = audioUrl;
      audio.load();
    }

    // Load media early, but require user interaction before starting the first clip.
    if (waitForAudioStart) return;
    const id = window.setTimeout(() => {
      void attemptListeningAudioPlayback('auto');
    }, 300);
    return () => window.clearTimeout(id);
  }, [attemptListeningAudioPlayback, listeningAudioUrl, reviewMode, waitForAudioStart]);

  const savePassageHtml = useCallback(() => {
    if (!currentPart?.id) return;
    const el = document.querySelector(".tiptap-content") as HTMLElement | null;
    if (!el) return;
    const html = el.innerHTML;
    setPassageHtml(html);
    if (onPassageChange) onPassageChange(currentPart.id, html);
  }, [currentPart?.id, onPassageChange]);

  const handleHeadingPassageDragOver = useCallback(
    (e: React.DragEvent) => {
      if (sectionType !== "reading") return;
      const t = (e.target as HTMLElement | null)?.closest?.(
        "[data-heading-gap]"
      ) as HTMLElement | null;
      if (!t) return;
      e.preventDefault();
      const gap = t.getAttribute("data-heading-gap");
      if (gap && gap !== dragOverHeadingGap) setDragOverHeadingGap(gap);
    },
    [sectionType, dragOverHeadingGap]
  );

  const handleHeadingPassageDragLeave = useCallback(() => {
    if (dragOverHeadingGap) setDragOverHeadingGap(null);
  }, [dragOverHeadingGap]);

  const handleHeadingPassageDrop = useCallback(
    (e: React.DragEvent) => {
      if (sectionType !== "reading") return;
      const t = (e.target as HTMLElement | null)?.closest?.(
        "[data-heading-gap]"
      ) as HTMLElement | null;
      if (!t) return;
      e.preventDefault();
      const gapNum = t.getAttribute("data-heading-gap") || "";
      setDragOverHeadingGap(null);

      const qId = headingGapNumToQuestionId[gapNum];
      if (!qId) return;

      const droppedHeadingText =
      e.dataTransfer.getData("text/ielts-heading-text") ||
      e.dataTransfer.getData("text/plain") ||
      "";

      const headingText = String(droppedHeadingText || "").trim();
      if (!headingText) return;
      onAnswerChange(qId, headingText);
    },
    [sectionType, headingGapNumToQuestionId, onAnswerChange]
  );

  const handleHeadingPassageClick = useCallback(
    (e: React.MouseEvent) => {
      if (sectionType !== "reading" || reviewMode) return;
      const target = e.target as HTMLElement | null;
      const clearTarget = target?.closest?.(
        "[data-heading-clear], .ielts-heading-clear"
      ) as HTMLElement | null;
      if (!clearTarget) return;
      e.preventDefault();
      e.stopPropagation();
      const gapHost = clearTarget.closest("[data-heading-gap]") as HTMLElement | null;
      const gapNum = clearTarget.getAttribute("data-heading-clear") || gapHost?.getAttribute("data-heading-gap") || "";
      const qId = headingGapNumToQuestionId[gapNum];
      if (!qId) return;
      onAnswerChange(qId, "");
    },
    [sectionType, reviewMode, headingGapNumToQuestionId, onAnswerChange]
  );

  const handleHeadingPassageDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (sectionType !== "reading") return;
      const t = (e.target as HTMLElement | null)?.closest?.(
        "[data-heading-gap]"
      ) as HTMLElement | null;
      if (!t) return;
      const gapNum = t.getAttribute("data-heading-gap") || "";
      const qId = headingGapNumToQuestionId[gapNum];
      if (!qId) return;
      onAnswerChange(qId, "");
    },
    [sectionType, headingGapNumToQuestionId, onAnswerChange]
  );

  const handleConfirmSubmit = useCallback(async () => {
    if (submittingModule) return;
    setSubmittingModule(true);
    try {
      savePassageHtml();
      // Writing section in question not if present drafts to answer as save do
      if (sectionType === "writing" && Object.keys(writingDrafts).length > 0) {
        Object.entries(writingDrafts).forEach(([partId, text]) => {
          if (text && text.trim().length > 0) {
            onAnswerChange(`writing_draft_${partId}`, text);
          }
        });
        await new Promise((r) => setTimeout(r, 50));
      }
      await Promise.resolve(onFinish());
      setShowSubmitConfirm(false);
    } catch (err) {
      console.error("Submit failed:", err);
      toast.error("Submit failed. Please try again.");
    } finally {
      if (isMountedRef.current) setSubmittingModule(false);
    }
  }, [onFinish, savePassageHtml, submittingModule, sectionType, writingDrafts, onAnswerChange]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = (e.clientX - rect.left) / rect.width * 100;
      setLeftPanelWidth(Math.max(20, Math.min(80, newWidth)));
    };
    const handleMouseUp = () => setIsDragging(false);
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const handleTextSelection = useCallback((e: React.MouseEvent) => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      const selected = selection.toString().trim();
      if (selected.length > 0) {
        const range = selection.getRangeAt(0);
        setSelectedText(selected);
        const rect = range.getBoundingClientRect();
        setHighlightMenu({
          x: rect.right,
          y: rect.top,
          show: true,
          selectedRange: range.cloneRange()
        });
        setClearHighlightMenu((prev) => ({ ...prev, show: false }));
        return;
      }
    }
    setHighlightMenu((prev) => ({ ...prev, show: false }));
  }, []);

  const addHighlight = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    const highlightId = `hl-${Date.now()}`;
    try {
      const range = selection.getRangeAt(0);
      const span = document.createElement("span");
      span.className =
      "bg-yellow-200 cursor-pointer highlight-item transition-all hover:bg-yellow-300 px-0.5 rounded select-text";
      span.id = highlightId;
      span.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = span.getBoundingClientRect();
        setClearHighlightMenu({
          x: rect.right,
          y: rect.top,
          show: true,
          highlightId
        });
      });
      range.surroundContents(span);
      window.getSelection()?.removeAllRanges();
      setHighlightMenu((prev) => ({ ...prev, show: false }));
      savePassageHtml();
    } catch (err) {
      const range = highlightMenu.selectedRange;
      if (!range) return;
      const span = document.createElement("span");
      span.className =
      "bg-yellow-200 cursor-pointer highlight-item transition-all hover:bg-yellow-300 px-0.5 rounded select-text";
      span.id = highlightId;
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
      span.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = span.getBoundingClientRect();
        setClearHighlightMenu({
          x: rect.right,
          y: rect.top,
          show: true,
          highlightId
        });
      });
      savePassageHtml();
      window.getSelection()?.removeAllRanges();
      setHighlightMenu((prev) => ({ ...prev, show: false }));
    }
  };

  const handleAddNote = () => {
    setShowNoteDialog(true);
    setHighlightMenu((prev) => ({ ...prev, show: false }));
  };

  const saveNote = () => {
    if (!highlightMenu.selectedRange || !noteText) return;
    const range = highlightMenu.selectedRange;
    const noteId = `note-${Date.now()}`;
    const span = document.createElement("span");
    span.className =
    "border-b-2 border-dashed border-red-400 cursor-help note-item group relative inline-block";
    span.id = noteId;
    try {
      const content = range.extractContents();
      span.appendChild(content);
      const tooltip = document.createElement("span");
      tooltip.className =
      "invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-[10px] rounded shadow-xl z-50 text-center font-medium leading-tight";
      tooltip.textContent = noteText;
      span.appendChild(tooltip);
      range.insertNode(span);
      span.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        setClearHighlightMenu({
          x: e.clientX,
          y: e.clientY - 20,
          show: true,
          highlightId: noteId
        });
      });
      savePassageHtml();
      window.getSelection()?.removeAllRanges();
      setShowNoteDialog(false);
      setNoteText("");
    } catch (err) {
      console.error(err);
    }
  };

  const removeHighlight = () => {
    if (!clearHighlightMenu.highlightId) return;
    const el = document.getElementById(clearHighlightMenu.highlightId);
    if (el) {
      const parent = el.parentNode;
      const tooltip = el.querySelector(".group-hover\\:visible");
      if (tooltip) el.removeChild(tooltip);
      while (el.firstChild) parent?.insertBefore(el.firstChild, el);
      parent?.removeChild(el);
      parent?.normalize();
      savePassageHtml();
    }
    setClearHighlightMenu((prev) => ({ ...prev, show: false }));
  };

  const isAnswered = (questionId: string) => {
    const ans = answers[questionId];
    return ans !== undefined && ans !== "" && ans !== null;
  };


  const getAnswerFieldParts = (answer: any) => {
    const raw = String(answer || "");
    if (!raw.trim()) return [""];
    return raw.split(",").map((part) => part.trim());
  };

  const getQuestionDisplayCount = (question: any) => {
    if (Number.isInteger(question?.answerCount) && question.answerCount > 0) return question.answerCount;
    const parentGroup = question?.group_id
      ? parts
          .flatMap((part: any) => part?.question_groups || [])
          .find((group: any) => group?.id === question.group_id || group?.temp_id === question.group_id)
      : null;
    const variant = String(question?.ieltsQuestionType || parentGroup?.ieltsQuestionType || "");
    const correctParts = getAnswerFieldParts(question?.correct_answer);
    if (question?.question_type === "short_answer" || variant === "multiple_choice_multiple" || (question?.question_type === "multiple_choice" && String(question?.correct_answer || "").includes(","))) {
      return Math.max(1, correctParts.filter((part) => part.trim()).length || correctParts.length);
    }
    return 1;
  };

  const sortedQuestions = useMemo(() => {
    return [...questions].sort((a, b) => {
      const pA = parts.findIndex((p) => p.id === a.part_id);
      const pB = parts.findIndex((p) => p.id === b.part_id);
      if (pA !== pB) return pA - pB;
      return (a.order_index || 0) - (b.order_index || 0);
    });
  }, [questions, parts]);

  const getGlobalIdx = (qId: string) => {
    let current = 1;
    for (const q of sortedQuestions) {
      if (q.id === qId) return current;
      current += getQuestionDisplayCount(q);
    }
    return 0;
  };

  const getQuestionEndIdx = (q: any) => {
    const start = getGlobalIdx(q?.id);
    return start ? start + getQuestionDisplayCount(q) - 1 : 0;
  };

  const getPartQuestionBounds = (part: any) => {
    const partQs = questions.filter((q) => q.part_id === part?.id);
    if (partQs.length === 0) return { first: 0, last: 0 };
    const first = getGlobalIdx(partQs[0].id);
    const last = getQuestionEndIdx(partQs[partQs.length - 1]);
    return { first, last };
  };

  const getDefaultQuestionInstructions = (qs: any[]) => {
    const first = qs[0];
    if (!first) return "";
    const type = String(first.question_type || "").toLowerCase();
    const optionCount = Array.isArray(first.options) ? first.options.length : 0;
    const lastLetter = optionCount > 0 ? normalizeOptionLabel(optionCount - 1) : "C";
    if (type === "multiple_choice") return `Choose the correct letter, A, B or ${lastLetter}.`;
    if (type === "matching_features") return "Choose the correct letter.";
    if (type === "diagram_completion") return "Label the plan/map/diagram below. Choose the correct letter.";
    return "";
  };

  const renderQuestionRun = (qs: any[], key: string) => {
    if (!qs.length) return null;
    const start = getGlobalIdx(qs[0].id);
    const end = getQuestionEndIdx(qs[qs.length - 1]);
    return (
      <div key={key} className="ielts-official-group">
        {renderOfficialQuestionHeader(start, end, getDefaultQuestionInstructions(qs))}
        {qs.map((q) => renderQuestionItem(q))}
      </div>
    );
  };

  const renderPartQuestionContent = (isListening = false) => {
    const partQs = questions.filter((q) => q.part_id === currentPart?.id);
    const groups = currentPart?.question_groups || [];
    const rendered: React.ReactNode[] = [];
    let ungroupedRun: any[] = [];
    const flushRun = () => {
      if (ungroupedRun.length) {
        rendered.push(renderQuestionRun(ungroupedRun, `run-${rendered.length}`));
        ungroupedRun = [];
      }
    };

    const renderGroup = (group: any) => {
      const groupType = getGroupType(group);
      if (groupType === "source_html") return <SourceQuestionGroup key={group.id} group={group} questions={questions.filter(q=>q.group_id===group.id)} answers={answers} onAnswerChange={onAnswerChange} reviewMode={reviewMode}/>;
      if (groupType === "flowchart_completion" || groupType === "flow_chart") return renderFlowChartGroup(group);
      if (groupType === "table_completion") return renderTableGroup(group);
      if (groupType === "summary_completion") return renderSummaryGroup(group);
      if (groupType === "note_completion") return renderNoteGroup(group);
      if (groupType === "sentence_completion") return renderSentenceGroup(group);
      if (groupType === "diagram_completion") return renderDiagramGroup(group);
      if (groupType === "matching_features") return renderMatchingFeaturesGroup(group);
      if (groupType === "list_selection") return renderListSelectionGroup(group);
      if (groupType === "choosing_a_title") return renderChoosingTitleGroup(group);

      const groupQs = questions.filter((q) => q.group_id === group.id);
      if (groupType === "matching_headings" || groupQs.some((q: any) => q.question_type === "matching_headings")) {
        return (
          <div key={group.id} className="ielts-official-group">
            {renderOfficialQuestionHeader(getGlobalIdx(groupQs[0]?.id), groupQs.length ? getQuestionEndIdx(groupQs[groupQs.length - 1]) : getGlobalIdx(groupQs[0]?.id), group.instructions)}
            {renderHeadingsPalette(group, groupQs)}
          </div>
        );
      }

      const isSentenceEndings = groupType === "matching_sentence_endings" || groupQs.some((q: any) => q.question_type === "matching_sentence_endings");
      if (isSentenceEndings) return renderSentenceEndingsPalette(group, groupQs);

      if (groupQs.length > 0) {
        return (
          <div key={group.id} className="ielts-official-group">
            {renderOfficialQuestionHeader(getGlobalIdx(groupQs[0].id), getQuestionEndIdx(groupQs[groupQs.length - 1]), group.instructions)}
            {group.referenceImage && <img className="ielts-group-reference-image" src={group.referenceImage} alt={group.referenceImageAlt || "Question reference"} />}
            {groupQs.map((q) => renderQuestionItem(q, group))}
          </div>
        );
      }
      return null;
    };

    partQs.forEach((q) => {
      if (!q.group_id) {
        ungroupedRun.push(q);
        return;
      }
      flushRun();
      const group = groups.find((g: any) => g.id === q.group_id || g.temp_id === q.group_id);
      if (group && !rendered.some((node: any) => node?.key === group.id)) {
        rendered.push(renderGroup(group));
      }
    });
    flushRun();

    if (rendered.length === 0 && partQs.length > 0) return partQs.map((q) => renderQuestionItem(q));
    return rendered;
  };

  const renderGapFill = (
  qId: string,
  placeholderIndex: number,
  orderIndex: number,
  allowDrop = false) =>
  {
    const q = questions.find((qq) => qq.id === qId);
    const currentVal = answers[qId] || "";
    const answerParts =
    typeof currentVal === "string" ? currentVal.split(",") : [];
    const userPart = (answerParts[placeholderIndex] || "").trim();

    if (reviewMode && q) {
      const correctRaw = String(q.correct_answer ?? "").trim();
      const allPlaceholders = extractBlankTokens(String(q.question_text || ""));
      const correctParts = correctRaw.split(",").map((s: string) => s.trim());
      const correctPart = allPlaceholders.length > 1 ? correctParts[placeholderIndex] || correctRaw : correctRaw;
      // Support "/" for alternative correct answers (admin panel convention)
      const correctOptions = correctPart.split("/").map((s: string) => s.trim().toLowerCase()).filter(Boolean);
      const isEmpty = userPart === "";
      const isOk = !isEmpty && correctOptions.length > 0 && correctOptions.some((c: string) => c === userPart.toLowerCase());
      return (
        <span className="inline-flex flex-col items-center mx-1">
          <input
            type="text"
            disabled
            value={userPart}
            placeholder={orderIndex.toString()}
            className={cn(
              "ielts-gap-input inline-block w-[92px] h-[26px] border text-center text-[13px] outline-none rounded-none px-1",
              isEmpty ? "border-orange-400 bg-orange-50 text-orange-700" : isOk ? "border-green-500 bg-green-50 text-green-800" : "border-red-500 bg-red-50 text-red-800"
            )} />
          
          {!isOk && correctPart &&
          <span className="mt-0.5 text-[10px] font-bold text-red-600 whitespace-nowrap">✓ {correctPart}</span>
          }
        </span>);

    }

    const group = parts.flatMap(p => p.question_groups || []).find((g: any) => g.id === q?.group_id);
    if (!reviewMode && group?.matchingMode === "dropdown" && Array.isArray(group.options) && group.options.length) {
      return <select className="ielts-gap-input border bg-white px-1 mx-1 text-sm" aria-label={`Question ${orderIndex}`} value={answerParts[placeholderIndex] || ""} onChange={e => { const next = [...answerParts]; next[placeholderIndex] = e.target.value; onAnswerChange(qId, next.join(",")); }}><option value="">{orderIndex}</option>{group.options.map((option: string, i: number) => <option key={i} value={String(option)}>{String(option)}</option>)}</select>;
    }

    return (
      <input
        type="text"
        className="ielts-gap-input inline-block w-[92px] h-[26px] border border-[#8a8a8a] text-center text-[13px] bg-white outline-none focus:border-[#2c5fb8] focus:ring-1 focus:ring-[#2c5fb8] rounded-none px-1 mx-1 align-baseline"
        value={answerParts[placeholderIndex] || ""}
        onChange={(e) => {
          if (!q) return;
          const allPlaceholders =
          extractBlankTokens(String(q.question_text || ""));
          const newAnswers = [...answerParts];
          while (newAnswers.length < Math.max(allPlaceholders.length, placeholderIndex + 1))
          newAnswers.push("");
          newAnswers[placeholderIndex] = e.target.value;
          onAnswerChange(qId, newAnswers.join(","));
        }}
        onDragOver={(e) => {
          if (!allowDrop || reviewMode) return;
          e.preventDefault();
        }}
        onDrop={(e) => {
          if (!allowDrop || reviewMode || !q) return;
          e.preventDefault();
          const dropped = (e.dataTransfer.getData("text/ielts-word-bank") || e.dataTransfer.getData("text/plain")).trim();
          if (!dropped) return;
          const allPlaceholders = extractBlankTokens(String(q.question_text || ""));
          const newAnswers = [...answerParts];
          while (newAnswers.length < Math.max(allPlaceholders.length, placeholderIndex + 1)) newAnswers.push("");
          newAnswers[placeholderIndex] = dropped;
          onAnswerChange(qId, newAnswers.join(","));
        }}
        placeholder={orderIndex.toString()} />);


  };


  function getGroupType(group: any) {
    return String(group?.type || group?.ieltsQuestionType || group?.question_type || "");
  }

  const getOptionListForGroup = (group: any, groupQs: any[]): string[] => {
    const a = group?.options;
    if (Array.isArray(a) && a.length > 0) return a.map((x: any) => String(x));
    for (const q of groupQs || []) {
      const b = q?.options;
      if (Array.isArray(b) && b.length > 0) return b.map((x: any) => String(x));
    }
    return [];
  };

  const normalizeOptionLabel = (idx: number) => String.fromCharCode(65 + idx);
  const labelValueMatches = (value: any, label: string) =>
    String(value ?? "").trim().toUpperCase() === String(label || "").trim().toUpperCase();

  const isCorrectChoice = (q: any, label: string) => {
    const vals = String(q?.correct_answer ?? "").split(/[\/,]/).map((s: string) => s.trim()).filter(Boolean);
    return vals.some((value: string) => labelValueMatches(value, label));
  };

  const renderOfficialQuestionHeader = (startNum: number, endNum: number, instructions?: string) => (
    <div className="ielts-question-block-header">
      <h3>Questions {startNum}{endNum !== startNum ? `–${endNum}` : ""}</h3>
      {instructions && <p>{instructions}</p>}
    </div>
  );

  const renderOfficialMatrixGroup = (group: any, title = "Options") => {
    const groupQs = questions.filter((q) => q.group_id === group.id).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    if (groupQs.length === 0) return null;
    const startNum = getGlobalIdx(groupQs[0].id);
    const endNum = getQuestionEndIdx(groupQs[groupQs.length - 1]);
    const opts = getOptionListForGroup(group, groupQs);
    return (
      <div key={group.id} className="ielts-official-group">
        {renderOfficialQuestionHeader(startNum, endNum, group.instructions)}
        <div className="ielts-matrix-scroll">
          <table className={cn("ielts-choice-matrix", group.type === "matching_features" && "ielts-diagram-choice-matrix ielts-feature-choice-matrix")}>
            <thead>
              <tr>
                <th className="ielts-matrix-question-col"></th>
                {opts.map((_: string, idx: number) => <th key={idx}>{normalizeOptionLabel(idx)}</th>)}
              </tr>
            </thead>
            <tbody>
              {groupQs.map((q: any) => {
                const displayNum = getGlobalIdx(q.id);
                const selected = String(answers[q.id] || "").trim();
                return (
                  <tr key={q.id} id={`q-${q.id}`}>
                    <td className="ielts-matrix-question-col"><span className="ielts-qnum-inline">{displayNum}</span>{formatHeadingTokenForDisplay(q.question_text)}</td>
                    {opts.map((_: string, idx: number) => {
                      const label = normalizeOptionLabel(idx);
                      const checked = labelValueMatches(selected, label);
                      const correct = reviewMode && isCorrectChoice(q, label);
                      return (
                        <td key={label} className={cn(correct && "ielts-correct-cell")}>
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            checked={checked}
                            disabled={reviewMode}
                            onChange={() => !reviewMode && onAnswerChange(q.id, label)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {opts.length > 0 && (
          <div className="ielts-options-key">
            <div className="ielts-options-key-title">{group.optionsTitle || title}</div>
            {opts.map((opt: string, idx: number) => (
              <div key={idx}><strong>{normalizeOptionLabel(idx)}</strong><span>{opt}</span></div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderOfficialChoiceQuestion = (q: any, group?: any) => {
    const displayNum = getGlobalIdx(q.id);
    const opts = Array.isArray(q.options) && q.options.length > 0 ? q.options : getOptionListForGroup(group, [q]);
    const rawCorrect = String(q.correct_answer || "");
    const variant = String(q.ieltsQuestionType || group?.ieltsQuestionType || "");
    const multi = q.question_type === "list_selection" || variant === "multiple_choice_multiple" || Number(q.answerCount) > 1 || rawCorrect.includes(",");
    const selectedValues = multi ? String(answers[q.id] || "").split(",").map((v) => v.trim().toUpperCase()).filter(Boolean) : [String(answers[q.id] || "").toUpperCase()];
    const maxSelections = multi ? Math.max(1, Number(q.answerCount) || rawCorrect.split(/[\/,]/).map((v) => v.trim()).filter(Boolean).length || 1) : 1;
    const setMulti = (label: string, checked: boolean) => {
      const next = new Set(selectedValues);
      if (checked) {
        if (!next.has(label) && next.size >= maxSelections) return;
        next.add(label);
      } else {
        next.delete(label);
      }
      onAnswerChange(q.id, Array.from(next).join(","));
    };

    return (
      <div key={q.id} id={`q-${q.id}`} className="ielts-question-row">
        <div className="ielts-question-text"><span className="ielts-qnum-inline">{multi && maxSelections > 1 ? `${displayNum}-${displayNum + maxSelections - 1}` : displayNum}</span>{formatHeadingTokenForDisplay(q.question_text)}</div>
        <div className={cn("ielts-choice-list", q.optionLabelOnly && "ielts-picture-choice")}>
          {opts.map((opt: string, idx: number) => {
            const label = normalizeOptionLabel(idx);
            const selected = selectedValues.includes(label) || selectedValues.includes(String(opt).trim().toUpperCase());
            const correct = reviewMode && isCorrectChoice(q, label);
            const inputType = multi ? "checkbox" : "radio";
            return (
              <label key={idx} className={cn("ielts-choice-option", correct && "ielts-correct-option")}>
                <input
                  type={inputType}
                  name={`q-${q.id}`}
                  checked={selected}
                  disabled={reviewMode || q.exampleOptions?.includes(label) || (multi && !selected && selectedValues.length >= maxSelections)}
                  onChange={(e) => {
                    if (reviewMode) return;
                    if (multi) setMulti(label, e.currentTarget.checked);
                    else onAnswerChange(q.id, label);
                  }}
                />
                <span className="ielts-choice-letter">{label}</span>
                {!q.optionLabelOnly && <span>{opt}</span>}
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  const renderOfficialTfngQuestion = (q: any) => {
    const displayNum = getGlobalIdx(q.id);
    const type = String(q.question_type || "");
    const yn = type.includes("yes_no") || type.includes("yng");
    const opts = yn ? ["YES", "NO", "NOT GIVEN"] : ["TRUE", "FALSE", "NOT GIVEN"];
    return (
      <div key={q.id} id={`q-${q.id}`} className="ielts-question-row">
        <div className="ielts-question-text"><span className="ielts-qnum-inline">{displayNum}</span>{formatHeadingTokenForDisplay(q.question_text)}</div>
        <div className="ielts-inline-radio-row">
          {opts.map((opt) => {
            const value = opt.toLowerCase().replaceAll(" ", "-");
            const selected = String(answers[q.id] || "").toLowerCase() === value || String(answers[q.id] || "").toUpperCase() === opt;
            return (
              <label key={opt}>
                <input type="radio" name={`q-${q.id}`} checked={selected} disabled={reviewMode} onChange={() => !reviewMode && onAnswerChange(q.id, value)} />
                <span>{opt}</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  };


  const findQuestionForToken = (groupQs: any[], token: string) =>
    groupQs.find((qq: any) => String(qq.question_text || "").includes(token));

  const renderOfficialWordBank = (group: any, options: string[], groupQs: any[]) => {
    if (!options.length) return null;
    const used = new Set(
      groupQs
        .map((q: any) => String(answers?.[q.id] || ""))
        .flatMap((value: string) => value.split(","))
        .map((value: string) => value.trim())
        .filter(Boolean)
    );
    return (
      <div className="ielts-word-bank">
        <div>{group.optionsTitle || "Choose from the following options"}</div>
        <div className="ielts-word-bank-grid">
          {options.map((opt, idx) => {
            const value = String(opt || "").trim();
            return used.has(value) ? (
              <span key={idx} className="ielts-word-bank-placeholder" aria-hidden="true" />
            ) : (
              <button
                key={idx}
                type="button"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/ielts-word-bank", value);
                  e.dataTransfer.setData("text/plain", value);
                  e.dataTransfer.effectAllowed = "move";
                }}
              >
                <span>{value}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderOfficialInlineCompletionGroup = (group: any, mode: "summary" | "note" | "sentence" | "flow" = "summary") => {
    const groupQs = questions.filter((q) => q.group_id === group.id).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    if (groupQs.length === 0) return null;
    const startNum = getGlobalIdx(groupQs[0].id);
    const endNum = getQuestionEndIdx(groupQs[groupQs.length - 1]);
    const options = getOptionListForGroup(group, groupQs);
    const variant = String(group.ieltsQuestionType || "");
    const shouldShowWordBank = group.matchingMode !== "dropdown" && options.length > 0 && (variant === "summary_completion_drag" || variant === "flowchart_completion_drag" || options.some((opt: string) => String(opt || "").trim()));
    const rawText = String(group.groupText || group.text || "");
    const flowSteps = mode === "flow" && Array.isArray(group.flowchartData?.steps)
      ? group.flowchartData.steps.flatMap((step: any) => {
          if (step?.type === "split" && Array.isArray(step.theories)) {
            return step.theories.map((t: any) => String(t?.title ? `${t.title}: ${t.text || ""}` : t?.text || "").trim()).filter(Boolean);
          }
          return [String(step?.text || "").trim()].filter(Boolean);
        })
      : [];
    const blocks = flowSteps.length > 0
      ? flowSteps
      : rawText
        ? rawText.split(mode === "sentence" ? "\n" : "\n\n").filter((x: string) => x.trim())
        : groupQs.map((q: any) => q.question_text || `[[${getGlobalIdx(q.id)}]]`);

    const renderChunk = (chunk: string, chunkIndex: number) => {
      if (isBlankToken(chunk)) {
        const q = findQuestionForToken(groupQs, chunk);
        if (q?.id) {
          return <Fragment key={chunkIndex}>{renderGapFill(q.id, extractBlankTokens(String(q.question_text || "")).indexOf(chunk), getGlobalIdx(q.id), shouldShowWordBank)}</Fragment>;
        }
      }
      if (isFlowToken(chunk)) {
        const q = groupQs.find((qq: any) => String(qq.question_text || "").trim() === chunk.trim());
        if (q?.id) {
          return <Fragment key={chunkIndex}>{renderGapFill(q.id, 0, getGlobalIdx(q.id), shouldShowWordBank)}</Fragment>;
        }
      }
      return <span key={chunkIndex}>{chunk}</span>;
    };

    const renderHtmlCompletion = (html: string) => {
      const safeHtml = sanitizeHtml(String(html || ""));
      const renderTextWithGaps = (text: string, keyPrefix: string) =>
        String(text || "")
          .split(/(\[\[n?\d+\]\]|\[f\d+\])/g)
          .map((part, idx) => {
            if (isBlankToken(part)) return renderChunk(part, idx);
            if (isFlowToken(part)) return renderChunk(part, idx);
            return part ? <Fragment key={`${keyPrefix}-${idx}`}>{part}</Fragment> : null;
          });

      if (typeof window === "undefined" || typeof DOMParser === "undefined") {
        return renderTextWithGaps(safeHtml.replace(/<[^>]+>/g, ""), "ssr");
      }

      const doc = new DOMParser().parseFromString(`<div>${safeHtml}</div>`, "text/html");
      const allowedTags = new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "UL", "OL", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "SPAN", "DIV"]);

      const renderNode = (node: ChildNode, key: string): React.ReactNode => {
        if (node.nodeType === Node.TEXT_NODE) return renderTextWithGaps(node.textContent || "", key);
        if (node.nodeType !== Node.ELEMENT_NODE) return null;
        const el = node as HTMLElement;
        const tag = el.tagName.toUpperCase();
        const children = Array.from(el.childNodes).map((child, idx) => renderNode(child, `${key}-${idx}`));
        if (!allowedTags.has(tag)) return <Fragment key={key}>{children}</Fragment>;
        if (tag === "BR") return <br key={key} />;
        const props = { key };
        switch (tag) {
          case "P": return <p {...props}>{children}</p>;
          case "STRONG":
          case "B": return <strong {...props}>{children}</strong>;
          case "EM":
          case "I": return <em {...props}>{children}</em>;
          case "U": return <u {...props}>{children}</u>;
          case "UL": return <ul {...props}>{children}</ul>;
          case "OL": return <ol {...props}>{children}</ol>;
          case "LI": return <li {...props}>{children}</li>;
          case "H1": return <h1 {...props}>{children}</h1>;
          case "H2": return <h2 {...props}>{children}</h2>;
          case "H3": return <h3 {...props}>{children}</h3>;
          case "H4": return <h4 {...props}>{children}</h4>;
          case "H5": return <h5 {...props}>{children}</h5>;
          case "H6": return <h6 {...props}>{children}</h6>;
          case "DIV": return <div {...props}>{children}</div>;
          default: return <span {...props}>{children}</span>;
        }
      };

      return Array.from(doc.body.firstElementChild?.childNodes || []).map((node, idx) => renderNode(node, `html-${idx}`));
    };

    const hasHtmlContent = /<\/?(p|div|ul|ol|li|strong|b|em|i|h[1-6]|br|span)[\s>]/i.test(rawText);
    const titleText = String(group.diagramTitle || "").trim();
    const shouldShowTitle = titleText && !/^enter\s+title$/i.test(titleText);

    return (
      <div key={group.id} className={cn("ielts-official-group", mode === "note" && "ielts-note-completion", mode === "flow" && "ielts-flow-completion")}>
        {renderOfficialQuestionHeader(startNum, endNum, group.instructions)}
        {shouldShowTitle && <div className="ielts-completion-title">{titleText}</div>}
        <div className={cn(
          mode === "flow" && shouldShowWordBank && "ielts-flow-with-bank",
          mode === "summary" && variant === "summary_completion_drag" && shouldShowWordBank && "ielts-summary-with-bank",
        )}>
        <div className={cn("ielts-completion-body", mode === "note" && "ielts-completion-notes", mode === "flow" && "ielts-completion-flow")}> 
          {hasHtmlContent ? (
            <div className="ielts-rich-completion-content">
              {renderHtmlCompletion(rawText)}
            </div>
          ) : blocks.map((block: string, blockIdx: number) => {
            const lines = mode === "note" ? block.split("\n").filter((line: string) => line.trim()) : [block];
            if (mode === "note") {
              return lines.map((line: string, lineIdx: number) => {
                const trimmed = line.trim();
                const isBullet = trimmed.startsWith("•") || trimmed.startsWith("-");
                const content = splitKeepFlowTokens(stripLeadingBullet(line)).flatMap((flowPart: string) => isFlowToken(flowPart) ? [flowPart] : splitKeepBlankTokens(flowPart)).map(renderChunk);
                return isBullet ? <ul key={`${blockIdx}-${lineIdx}`}><li>{content}</li></ul> : <p key={`${blockIdx}-${lineIdx}`}>{content}</p>;
              });
            }
            return <p key={blockIdx}>{splitKeepFlowTokens(block).flatMap((flowPart: string) => isFlowToken(flowPart) ? [flowPart] : splitKeepBlankTokens(flowPart)).map(renderChunk)}</p>;
          })}
        </div>
        {shouldShowWordBank && renderOfficialWordBank(group, options, groupQs)}
        </div>
      </div>
    );
  };

  const renderOfficialTableCompletionGroup = (group: any) => {
    const groupQs = questions.filter((q) => q.group_id === group.id).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    if (groupQs.length === 0) return null;
    const startNum = getGlobalIdx(groupQs[0].id);
    const endNum = getQuestionEndIdx(groupQs[groupQs.length - 1]);
    return (
      <div key={group.id} className="ielts-official-group">
        {renderOfficialQuestionHeader(startNum, endNum, group.instructions)}
        <div className="ielts-matrix-scroll">
          <table className="ielts-completion-table">
            <thead>
              <tr>{(group.tableHeaders || []).map((h: string, i: number) => <th key={i}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {(group.tableRows || []).map((row: any, rIdx: number) => (
                <tr key={rIdx}>
                  {(Array.isArray(row) ? row : []).map((cell: any, cIdx: number) => (
                    <td key={cIdx}>{normalizeTableCellItems(cell).map((item, i) => {
                      if (isBlankToken(item)) {
                        const q = findQuestionForToken(groupQs, item);
                        if (q?.id) return <Fragment key={i}>{renderGapFill(q.id, extractBlankTokens(String(q.question_text || "")).indexOf(item), getGlobalIdx(q.id))}</Fragment>;
                      }
                      return <span key={i}>{item}</span>;
                    })}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderOfficialDiagramCompletionGroup = (group: any) => {
    const groupQs = questions.filter((q) => q.group_id === group.id).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    if (groupQs.length === 0) return null;
    const startNum = getGlobalIdx(groupQs[0].id);
    const endNum = getQuestionEndIdx(groupQs[groupQs.length - 1]);
    const variant = String(group.ieltsQuestionType || "");
    const rawOptions = getOptionListForGroup(group, groupQs);
    const options = variant === "diagram_labelling_type_a" && rawOptions.length === 0
      ? Array.from({ length: 8 }, (_, idx) => normalizeOptionLabel(idx))
      : rawOptions;
    const hasOptions = options.length > 0 && (variant === "diagram_labelling_type_a" || options.some((opt: string) => String(opt || "").trim()));
    return (
      <div key={group.id} className="ielts-official-group">
        {renderOfficialQuestionHeader(startNum, endNum, group.instructions)}
        <div className="ielts-diagram-layout">
          <div className="ielts-diagram-image-panel">
            {group.diagramTitle && <div>{group.diagramTitle}</div>}
            {group.diagramImage ? <img src={group.diagramImage} alt={group.diagramTitle || "Diagram"} /> : <span>No diagram image</span>}
          </div>
          <div className="ielts-diagram-answer-panel">
            {hasOptions ? (
              <table className="ielts-choice-matrix ielts-diagram-choice-matrix">
                <thead><tr><th className="ielts-matrix-question-col"></th>{options.map((opt: string, idx: number) => <th key={idx}>{variant === "diagram_labelling_type_a" ? String(opt || normalizeOptionLabel(idx)).trim() : normalizeOptionLabel(idx)}</th>)}</tr></thead>
                <tbody>
                  {groupQs.map((q: any) => {
                    const selected = String(answers[q.id] || "").trim();
                    return (
                      <tr key={q.id} id={`q-${q.id}`}>
                        <td className="ielts-matrix-question-col"><span className="ielts-qnum-inline">{getGlobalIdx(q.id)}</span>{formatHeadingTokenForDisplay(q.question_text)}</td>
                        {options.map((opt: string, idx: number) => {
                          const label = variant === "diagram_labelling_type_a" ? String(opt || normalizeOptionLabel(idx)).trim().toUpperCase() : normalizeOptionLabel(idx);
                          const checked = labelValueMatches(selected, label);
                          return (
                            <td
                              key={label}
                              className="ielts-clickable-choice-cell"
                              onClick={() => !reviewMode && onAnswerChange(q.id, label)}
                            >
                              <input
                                type="radio"
                                name={`q-${q.id}`}
                                checked={checked}
                                disabled={reviewMode}
                                onChange={() => !reviewMode && onAnswerChange(q.id, label)}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="ielts-diagram-label-list">
                {groupQs.map((q: any) => <div key={q.id} id={`q-${q.id}`}><span className="ielts-qnum-inline">{getGlobalIdx(q.id)}</span><span>{q.question_text}</span>{renderGapFill(q.id, 0, getGlobalIdx(q.id))}</div>)}
              </div>
            )}
            {hasOptions && variant !== "diagram_labelling_type_a" && renderOfficialWordBank(group, options, groupQs)}
          </div>
        </div>
      </div>
    );
  };

  const renderOptionListBox = (options: string[]) => {
    if (!options || options.length === 0) return null;
    return (
      <div className="bg-gray-100 border border-gray-300 rounded p-4 mb-6 text-sm text-gray-900">
        <div className="font-semibold mb-2">Choose from the following options:</div>
        <div className="space-y-1">
          {options.map((opt, idx) => {
            const label = String.fromCharCode(65 + idx);
            return (
              <div key={idx} className="flex items-start gap-2">
                <span className="font-bold">{label}</span>
                <span>{opt}</span>
              </div>);

          })}
        </div>
      </div>);

  };

  const renderSentenceEndingsPalette = useCallback(
    (group: any, groupQs: any[]) => {
      const opts = getOptionListForGroup(group, groupQs);
      if (opts.length === 0) return null;

      const title =
      group?.optionsTitle ||
      group?.options_title ||
      groupQs?.[0]?.optionsTitle ||
      "List of Endings";

      const used = new Set(groupQs.map((q: any) => String(answers[q.id] || "").trim()).filter(Boolean));
      return (
        <div className="ielts-sentence-ending-panel">
          <div className="space-y-4">
            {groupQs.map((q: any) => {
              const displayNum = getGlobalIdx(q.id);
              const selected = String(answers[q.id] || "").trim();
              return (
                <div key={q.id} id={`q-${q.id}`} className="ielts-ending-question-row">
                  <p>{formatHeadingTokenForDisplay(q.question_text)}</p>
                  <div
                    className={cn("ielts-ending-drop", selected && "filled")}
                    onDragOver={(e) => !reviewMode && e.preventDefault()}
                    onDrop={(e) => {
                      if (reviewMode) return;
                      e.preventDefault();
                      const dropped = (e.dataTransfer.getData("text/ielts-ending") || e.dataTransfer.getData("text/plain")).trim();
                      if (dropped) onAnswerChange(q.id, dropped);
                    }}
                    onDoubleClick={() => !reviewMode && onAnswerChange(q.id, "")}
                  >
                    {selected || displayNum}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="ielts-ending-bank" aria-label={title}>
            {opts.map((opt: string, idx: number) => {
              const value = String(opt || "").trim();
              return used.has(value) ? (
                <span key={idx} className="ielts-ending-placeholder" />
              ) : (
                <button
                  key={idx}
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/ielts-ending", value);
                    e.dataTransfer.setData("text/plain", value);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>);

    },
    [answers, getGlobalIdx, onAnswerChange, reviewMode]
  );

  const renderHeadingsPalette = useCallback(
    (group: any, groupQs: any[]) => {
      const opts: any[] = (group?.options || groupQs?.[0]?.options || []).filter(
        (x: any) => x !== null && x !== undefined && String(x).trim() !== ""
      );
      if (opts.length === 0) return null;

      const used = new Set(groupQs.map((q: any) => String(answers?.[q.id] || "").trim().toLowerCase()).filter(Boolean));
      return (
        <div className="ielts-headings-box">
          <div className="ielts-headings-title">List of Headings</div>
          <div className="ielts-headings-list">
            {opts.map((opt: any, idx: number) => {
              const label = toRoman(idx + 1).toUpperCase();
              const txt = String(opt);
              const isUsed = used.has(txt.trim().toLowerCase()) || used.has(label.toLowerCase());
              return isUsed ? (
                <div key={idx} className="ielts-heading-row ielts-heading-placeholder" aria-hidden="true" />
              ) : (
                <div
                  key={idx}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/ielts-heading", label);
                    e.dataTransfer.setData("text/ielts-heading-text", txt);
                    e.dataTransfer.setData("text/plain", txt);
                    e.dataTransfer.effectAllowed = "move";
                    const dragPreview = document.createElement("div");
                    dragPreview.textContent = txt;
                    dragPreview.style.position = "fixed";
                    dragPreview.style.top = "-1000px";
                    dragPreview.style.left = "-1000px";
                    dragPreview.style.maxWidth = "320px";
                    dragPreview.style.padding = "8px 12px";
                    dragPreview.style.border = "1px solid #c9c9c9";
                    dragPreview.style.borderRadius = "3px";
                    dragPreview.style.background = "#fff";
                    dragPreview.style.color = "#111";
                    dragPreview.style.fontSize = "13px";
                    dragPreview.style.fontWeight = "700";
                    dragPreview.style.boxShadow = "0 8px 20px rgba(0,0,0,.18)";
                    dragPreview.style.pointerEvents = "none";
                    document.body.appendChild(dragPreview);
                    e.dataTransfer.setDragImage(dragPreview, 14, 14);
                    window.setTimeout(() => dragPreview.remove(), 0);
                  }}
                  className="ielts-heading-row"
                  title="Drag to the gap in the passage">
                  <span className="ielts-heading-label">{label}</span>
                  <span>{txt}</span>
                </div>
              );
            })}
          </div>
        </div>);

    },
    [answers]
  );

  const renderQuestionItem = (q: any, group?: any) => {
    const qType = String(q.question_type || group?.type || "").toLowerCase();
    if (qType === "multiple_choice" || qType === "list_selection" || qType === "choosing_a_title") {
      return renderOfficialChoiceQuestion(q, group);
    }
    if (["true_false_ng", "true_false_not_given", "tfng", "true_false", "yes_no_ng", "yes_no_not_given", "yng"].includes(qType)) {
      return renderOfficialTfngQuestion(q);
    }
    const displayNum = getGlobalIdx(q.id);
    const userAns = String(answers[q.id] ?? "").trim().toLowerCase();
    // Support both "," (multi-answer) and "/" (alternative answers) from admin panel
    const expandWithSlash = (vals: string[]): string[] => {
      const out: string[] = [];
      for (const v of vals) {
        for (const alt of v.split("/").map((s: string) => s.trim()).filter(Boolean)) {
          out.push(alt);
        }
      }
      return out;
    };
    const correctAnsRaw = expandWithSlash(
      String(q.correct_answer ?? "").split(",").map((x: string) => x.trim().toLowerCase())
    );

    // Multiple choice: correct_answer may be a letter (A/B/C/D) while answer is stored as full option text
    // Resolve both sides to comparable values
    const resolveToOptionText = (val: string): string => {
      if (!q.options || q.options.length === 0) return val;
      const letterMatch = val.match(/^([a-d])$/i);
      if (letterMatch) {
        const idx = letterMatch[1].toLowerCase().charCodeAt(0) - 97;
        return String(q.options[idx] ?? val).trim().toLowerCase();
      }
      return val;
    };

    const resolveToLetter = (val: string): string => {
      if (!q.options) return val;
      const idx = q.options.findIndex((opt: string) => String(opt).trim().toLowerCase() === val);
      if (idx >= 0) return String.fromCharCode(65 + idx).toLowerCase();
      return val;
    };

    const userAnsNorm = q.question_type === "multiple_choice" ?
    resolveToLetter(userAns) // convert "you are a fool" → "d"
    : userAns;

    const correctAnsNorm = correctAnsRaw.map((c) =>
    q.question_type === "multiple_choice" ? resolveToLetter(resolveToOptionText(c)) : c
    );

    const hasAnswer = userAns !== "" && userAns !== null && userAns !== undefined;
    const isCorrectAns = hasAnswer && correctAnsNorm.some((c) => c !== "" && c === userAnsNorm);
    const isWrongAns = reviewMode && hasAnswer && !isCorrectAns;
    const isUnanswered = reviewMode && !hasAnswer;
    return (
      <div key={q.id} id={`q-${q.id}`} className={cn("mb-6 rounded-xl p-2", isWrongAns ? "bg-red-50 border border-red-200" : isUnanswered ? "bg-orange-50 border border-orange-200" : "")}>
        {reviewMode && isWrongAns && q.correct_answer &&
        <div className="text-xs font-black text-red-600 uppercase tracking-widest mb-2 ml-9">
            ✗ Correct Answer: {q.correct_answer}
          </div>
        }
        {reviewMode && isUnanswered && q.correct_answer &&
        <div className="text-xs font-black text-orange-600 uppercase tracking-widest mb-2 ml-9">
            ○ Unanswered — Correct: {q.correct_answer}
          </div>
        }
        <div className="flex items-start space-x-3">
          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-1 shrink-0", isWrongAns ? "bg-red-600 text-white" : "bg-red-600 text-white")}>
            {displayNum}
          </div>
            <div className="flex-1">
              <div className="text-sm font-medium mb-3 text-gray-800">
                {q.question_type === "matching" ||
              q.question_type === "paragraph_matching" ||
              q.question_type === "matching_features" ||
              q.question_type === "matching_paragraph_info" ||
              q.question_type === "matching_sentence_endings" ?
              <div className="flex items-center justify-around gap-4">
                    <div className="flex-1">
                      {q.question_text.includes("[[") ?
                  <div className="flex flex-wrap items-center gap-1">
                          {splitKeepBlankTokens(String(q.question_text || "")).
                    map((part: string, i: number) => {
                      const isTok = isBlankToken(part);
                      if (isTok) {
                        const allPlaceholders = extractBlankTokens(String(q.question_text || ""));
                        const pIndex = allPlaceholders.indexOf(part);
                        return (
                          <Fragment key={i}>
                                    {renderGapFill(q.id, pIndex, displayNum)}
                                  </Fragment>);

                      }
                      return <span key={i}>{part}</span>;
                    })}
                        </div> :

                  q.question_text
                  }
                    </div>
                    <div className="shrink-0">
                      {reviewMode ? (() => {
                    const userVal = String(answers[q.id] || "").trim().toUpperCase();
                    const correctVals = String(q.correct_answer ?? "").split("/").map((s: string) => s.trim().toUpperCase()).filter(Boolean);
                    const isEmpty = !answers[q.id] || answers[q.id] === "";
                    const isOk = !isEmpty && correctVals.some((c: string) => c === userVal);
                    return (
                      <div className="flex flex-col items-center gap-0.5">
                            <div className={cn(
                          "w-24 h-9 border-2 rounded flex items-center justify-center text-sm font-bold",
                          isEmpty ? "border-orange-400 bg-orange-50 text-orange-700" : isOk ? "border-green-500 bg-green-50 text-green-800" : "border-red-500 bg-red-50 text-red-800"
                        )}>
                              {answers[q.id] || "—"}
                            </div>
                            {!isOk && q.correct_answer &&
                        <span className="text-[10px] font-bold text-red-600 whitespace-nowrap">✓ {q.correct_answer}</span>
                        }
                          </div>);

                  })() :
                  <select
                    value={answers[q.id] || ""}
                    onChange={(e) => onAnswerChange(q.id, e.target.value)}
                    className="w-24 h-9 border-2 border-gray-400 bg-white text-sm font-bold px-2 rounded outline-none focus:border-red-500">
                    
                        <option value="">{displayNum}</option>
                        {getOptionListForGroup(group, [q]).map(
                      (opt: any, idx: number) => {
                        const label = String.fromCharCode(65 + idx);
                        return (
                          <option key={idx} value={label}>
                                {label}
                              </option>);

                      }
                    )}
                      </select>
                  }
                    </div>
                  </div> :

              q.question_text.includes("[[") ?
              <div className="flex flex-wrap items-center gap-1">
                    {splitKeepBlankTokens(String(q.question_text || "")).

                map((part: string, i: number) => {
                  const isTok = isBlankToken(part);
                  if (isTok) {
                    const allPlaceholders = extractBlankTokens(String(q.question_text || ""));

                    const pIndex = allPlaceholders.indexOf(part);
                    return (
                      <Fragment key={i}>
                              {renderGapFill(q.id, pIndex, displayNum)}
                            </Fragment>);

                  }
                  return <span key={i}>{part}</span>;
                })}
                  </div> :

              formatHeadingTokenForDisplay(q.question_text)

              }
            </div>
            {q.question_type === "multiple_choice" &&
            <div className="space-y-2 mt-2">
                {q.options?.map((opt: string, i: number) => {
                const optLetter = String.fromCharCode(65 + i).toLowerCase();
                const isSelected = answers[q.id] === opt;
                // Correct option: correct_answer letter matches this index, OR correct_answer is the full text
                const correctLetters = (q.correct_answer || "").split(",").map((c: string) => c.trim().toLowerCase());
                const isCorrectOption = correctLetters.includes(optLetter) ||
                correctLetters.includes(String(opt).trim().toLowerCase());

                let optClass = "flex items-center space-x-3 p-3 border rounded-lg transition-colors ";
                if (reviewMode) {
                  if (isCorrectOption) {
                    optClass += "border-green-400 bg-green-50"; // correct answer always green
                  } else if (isSelected && !isCorrectOption) {
                    optClass += "border-red-400 bg-red-50"; // selected wrong = red
                  } else {
                    optClass += "border-gray-200 opacity-50";
                  }
                } else {
                  optClass += "border-gray-200 hover:bg-gray-50 cursor-pointer";
                }

                return (
                  <label key={i} className={optClass}>
                      <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={opt}
                      checked={isSelected}
                      onChange={() => !reviewMode && onAnswerChange(q.id, opt)}
                      disabled={reviewMode}
                      className={`w-4 h-4 ${isCorrectOption && reviewMode ? "accent-green-500" : "text-red-600"} focus:ring-red-500`} />
                    
                      <span className={`text-sm font-medium ${reviewMode && isCorrectOption ? "text-green-700 font-bold" : reviewMode && isSelected ? "text-red-700 font-bold" : "text-gray-700"}`}>
                        <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
                        {opt}
                        {reviewMode && isCorrectOption && <span className="ml-2 text-xs font-black text-green-600">✓</span>}
                      </span>
                    </label>);

              })}
              </div>
            }
            
{(
            // TRUE / FALSE / NOT GIVEN
            q.question_type === "true_false_ng" ||
            q.question_type === "true_false_not_given" ||
            q.question_type === "tfng" ||
            q.question_type === "true_false") &&

            <div className="mt-2 flex flex-wrap items-center gap-x-8 gap-y-2">
    {([
              { value: "true", label: "TRUE" },
              { value: "false", label: "FALSE" },
              { value: "not-given", label: "NOT GIVEN" }] as
              const).map((opt) => {
                const isSelected = answers[q.id] === opt.value;
                const correctVals = String(q.correct_answer ?? "").split("/").map((s: string) => s.trim().toLowerCase());
                const isCorrectOpt = reviewMode && correctVals.includes(opt.value);
                const isWrongSel = reviewMode && isSelected && !isCorrectOpt;
                return (
                  <label
                    key={opt.value}
                    className={cn(
                      "inline-flex items-center gap-2 cursor-pointer select-none px-3 py-1 rounded-lg border transition-colors",
                      reviewMode ?
                      isCorrectOpt ? "border-green-400 bg-green-50" : isWrongSel ? "border-red-400 bg-red-50" : "border-transparent opacity-60" :
                      "border-transparent"
                    )}>
                    
          <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={opt.value}
                      checked={isSelected}
                      onChange={() => !reviewMode && onAnswerChange(q.id, opt.value)}
                      disabled={reviewMode}
                      className="w-4 h-4 text-red-600 focus:ring-red-500" />
                    
          <span className={cn("text-sm font-medium",
                    reviewMode && isCorrectOpt ? "text-green-700 font-bold" : reviewMode && isWrongSel ? "text-red-700 font-bold" : "text-gray-800"
                    )}>
            {opt.label}
            {reviewMode && isCorrectOpt && <span className="ml-1 text-xs font-black text-green-600">✓</span>}
          </span>
        </label>);

              })}
  </div>
            }

{(
            // YES / NO / NOT GIVEN
            q.question_type === "yes_no_ng" ||
            q.question_type === "yes_no_not_given" ||
            q.question_type === "yng" ||
            q.question_type === "yes_no") &&

            <div className="mt-2 flex flex-wrap items-center gap-x-8 gap-y-2">
    {([
              { value: "yes", label: "YES" },
              { value: "no", label: "NO" },
              { value: "not-given", label: "NOT GIVEN" }] as
              const).map((opt) => {
                const isSelected = answers[q.id] === opt.value;
                const correctVals = String(q.correct_answer ?? "").split("/").map((s: string) => s.trim().toLowerCase());
                const isCorrectOpt = reviewMode && correctVals.includes(opt.value);
                const isWrongSel = reviewMode && isSelected && !isCorrectOpt;
                return (
                  <label
                    key={opt.value}
                    className={cn(
                      "inline-flex items-center gap-2 cursor-pointer select-none px-3 py-1 rounded-lg border transition-colors",
                      reviewMode ?
                      isCorrectOpt ? "border-green-400 bg-green-50" : isWrongSel ? "border-red-400 bg-red-50" : "border-transparent opacity-60" :
                      "border-transparent"
                    )}>
                    
          <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={opt.value}
                      checked={isSelected}
                      onChange={() => !reviewMode && onAnswerChange(q.id, opt.value)}
                      disabled={reviewMode}
                      className="w-4 h-4 text-red-600 focus:ring-red-500" />
                    
          <span className={cn("text-sm font-medium",
                    reviewMode && isCorrectOpt ? "text-green-700 font-bold" : reviewMode && isWrongSel ? "text-red-700 font-bold" : "text-gray-800"
                    )}>
            {opt.label}
            {reviewMode && isCorrectOpt && <span className="ml-1 text-xs font-black text-green-600">✓</span>}
          </span>
        </label>);

              })}
  </div>
            }

{(q.question_type === "short_answer" ||
            !q.question_text.includes("[[") &&
            q.question_type !== "multiple_choice" &&
            q.question_type !== "true_false_ng" &&
            q.question_type !== "true_false_not_given" &&
            q.question_type !== "tfng" &&
            q.question_type !== "true_false" &&
            q.question_type !== "yes_no_ng" &&
            q.question_type !== "yes_no_not_given" &&
            q.question_type !== "yng" &&
            q.question_type !== "yes_no" &&
            q.question_type !== "matching_sentence_endings" &&
            q.question_type !== "matching" &&
            q.question_type !== "paragraph_matching" &&
            q.question_type !== "matching_headings") && (() => {
              const correctParts = String(q.correct_answer ?? "").split(",").map((s: string) => s.trim());
              const userParts = String(answers[q.id] || "").split(",");
              const fieldCount = q.question_type === "short_answer"
                ? Math.max(1, correctParts.filter(Boolean).length, userParts.filter((s: string) => s.trim()).length)
                : 1;
              const setFieldAnswer = (fieldIdx: number, value: string) => {
                const next = [...userParts];
                while (next.length < fieldCount) next.push("");
                next[fieldIdx] = value;
                onAnswerChange(q.id, next.join(","));
              };
              const renderField = (fieldIdx: number) => {
                const correctForField = correctParts[fieldIdx] || String(q.correct_answer ?? "");
                const alternatives = correctForField.split("/").map((s: string) => s.trim().toLowerCase()).filter(Boolean);
                const userVal = String(userParts[fieldIdx] || "").trim();
                const isEmpty = userVal === "";
                const isOk = !isEmpty && alternatives.length > 0 && alternatives.some((c: string) => c === userVal.toLowerCase());
                if (reviewMode) {
                  return (
                    <div key={fieldIdx} className="flex flex-col gap-1 max-w-sm">
                      <div className="flex items-center gap-2">
                        {fieldCount > 1 && <span className="min-w-6 text-center text-sm font-bold">{displayNum + fieldIdx}</span>}
                        <input
                          type="text"
                          disabled
                          className={cn(
                            "w-full h-10 border-2 text-sm outline-none rounded px-3",
                            isEmpty ? "border-orange-400 bg-orange-50 text-orange-700" : isOk ? "border-green-500 bg-green-50 text-green-800" : "border-red-500 bg-red-50 text-red-800"
                          )}
                          value={userVal}
                          placeholder="(unanswered)" />
                      </div>
                      {!isOk && correctForField &&
                        <span className="text-xs font-bold text-red-600 ml-8">✓ {correctForField}</span>
                      }
                    </div>
                  );
                }
                return (
                  <div key={fieldIdx} className="flex items-center gap-2 max-w-sm">
                    {fieldCount > 1 && <span className="min-w-6 text-center text-sm font-bold">{displayNum + fieldIdx}</span>}
                    <input
                      type="text"
                      className="w-full h-10 border-2 border-gray-400 text-sm bg-white outline-none focus:border-red-500 rounded px-3"
                      placeholder="Type your answer..."
                      value={userParts[fieldIdx] || ""}
                      onChange={(e) => setFieldAnswer(fieldIdx, e.target.value)} />
                  </div>
                );
              };
              return <div className="mt-2 flex flex-col gap-2">{Array.from({ length: fieldCount }).map((_, idx) => renderField(idx))}</div>;
            })()
            }
          </div>
        </div>
      </div>);

  };

  const renderFlowChartGroup = (group: any) => {
    return renderOfficialInlineCompletionGroup(group, "flow");
    const groupQs = questions.filter((q) => q.group_id === group.id);
    if (groupQs.length === 0) return null;
    const startNum = getGlobalIdx(groupQs[0].id);
    const endNum = startNum + groupQs.length - 1;
    const hasQuestionLabels = groupQs.some((q: any) => String(q.question_text || "").trim());

    const renderAnswerInput = (q: any, displayNum: number) => {
      const userVal = String(answers[q.id] || "").trim();
      const correctVals = String(q.correct_answer ?? "")
        .split("/")
        .map((s: string) => s.trim().toLowerCase())
        .filter(Boolean);
      const isEmpty = userVal === "";
      const isOk =
        !isEmpty &&
        correctVals.length > 0 &&
        correctVals.some((c: string) => c === userVal.toLowerCase());

      if (reviewMode) {
        return (
          <div className="flex flex-col items-start gap-1">
            <input
              type="text"
              disabled
              value={userVal}
              placeholder={displayNum.toString()}
              className={cn(
                "w-full h-9 border-2 text-center text-sm font-bold outline-none rounded px-2 bg-white",
                isEmpty
                  ? "border-orange-400 text-orange-700"
                  : isOk
                    ? "border-green-500 text-green-800"
                    : "border-red-500 text-red-800",
              )}
            />
            {!isOk && q.correct_answer && (
              <span className="text-[10px] font-bold text-red-600 whitespace-nowrap">
                ✓ {q.correct_answer}
              </span>
            )}
          </div>
        );
      }

      return (
        <input
          type="text"
          className="w-full h-9 border-2 border-gray-300 bg-white text-center text-sm font-bold text-gray-800 outline-none focus:border-red-500 rounded px-2"
          value={answers[q.id] || ""}
          onChange={(e) => onAnswerChange(q.id, e.target.value)}
          placeholder={displayNum.toString()}
        />
      );
    };

    // Flowchart in CDI admin editor is stored in group.flowchartData and uses [f#] tags.
    // Older flowchart content uses group.groupText + [[n]] placeholders.

    const renderFlowGap = (tag: string) => {
      const q = groupQs.find(
        (qq: any) => String(qq.question_text || "").trim() === tag.trim()
      );
      if (!q?.id) {
        return (
          <span className="inline-block w-24 h-7 align-middle border-2 border-dashed border-gray-300 rounded mx-1" />);

      }
      const displayNum = getGlobalIdx(q.id);
      if (reviewMode) {
        const userVal = String(answers[q.id] || "").trim();
        const correctVals = String(q.correct_answer ?? "").split("/").map((s: string) => s.trim().toLowerCase()).filter(Boolean);
        const isEmpty = userVal === "";
        const isOk = !isEmpty && correctVals.length > 0 && correctVals.some((c: string) => c === userVal.toLowerCase());
        return (
          <span className="inline-flex flex-col items-center mx-1">
            <input
              type="text"
              disabled
              value={userVal}
              placeholder={displayNum.toString()}
              className={cn(
                "inline-block w-32 h-7 border-2 text-center text-sm outline-none rounded px-2",
                isEmpty ? "border-orange-400 bg-orange-50 text-orange-700" : isOk ? "border-green-500 bg-green-50 text-green-800" : "border-red-500 bg-red-50 text-red-800"
              )} />
            
            {!isOk && q.correct_answer &&
            <span className="mt-0.5 text-[10px] font-bold text-red-600 whitespace-nowrap">✓ {q.correct_answer}</span>
            }
          </span>);

      }
      return (
        <input
          type="text"
          className="inline-block w-32 h-7 border-2 border-gray-400 text-center text-sm bg-white outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded px-2 mx-1"
          value={answers[q.id] || ""}
          onChange={(e) => onAnswerChange(q.id, e.target.value)}
          placeholder={displayNum.toString()} />);


    };

    const renderTextWithFtags = (text: string) => {
      // Split and keep [f#] tags
      return splitKeepFlowTokens(text).map((chunk: string, i: number) => {
        const m = isFlowToken(chunk);
        if (m) return <Fragment key={i}>{renderFlowGap(chunk)}</Fragment>;
        return <span key={i}>{chunk}</span>;
      });
    };
    // New: flowchartData-based rendering (scientific / boxed)
    const fc = group.flowchartData;
    if (fc?.steps && Array.isArray(fc.steps) && fc.steps.length > 0) {
      const diagramTitle =
      group.diagramTitle || (
      fc.type === "boxed" ? "Flow-chart" : "Flow-chart");
      const isBoxed = fc.type === "boxed";

      return (
        <div key={group.id} className="mb-10">
          <h3 className="font-bold mb-4">
            Questions {startNum}–{endNum}
          </h3>
          <p className="text-sm text-gray-700 mb-4">{group.instructions}</p>



          <table className="w-full mt-6 text-center border-2 border-gray-300 border-collapse">
            <thead>
              <tr>
                <th className="text-2xl font-bold py-2">{diagramTitle}</th>
              </tr>
            </thead>

            <tbody>
              {fc.steps.map((step: any, idx: number) => {
                const showArrow = idx < fc.steps.length - 1;
                const key = step.id || idx;

                // Split step
                if (
                step.type === "split" &&
                Array.isArray(step.theories) &&
                step.theories.length > 0)
                {
                  return (
                    <React.Fragment key={key}>
                      <tr>
                        <td
                          className={cn(
                            "border border-gray-300 p-4",
                            "grid gap-4",
                            step.theories.length === 2 ?
                            "grid-cols-1 md:grid-cols-2" :
                            "grid-cols-1 md:grid-cols-3"
                          )}>
                          
                          {step.theories.map((t: any, tIdx: number) =>
                          <div
                            key={tIdx}
                            className={cn(
                              "p-4",
                              isBoxed ? "border-gray-300" : "border-gray-200"
                            )}>
                            
                              <div className="text-lg font-bold text-black mb-2 uppercase tracking-wide">
                                {t.title || `Option ${tIdx + 1}`}:
                              </div>
                              <div className="text-lg leading-relaxed text-gray-800">
                                {renderTextWithFtags(String(t.text || ""))}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>

                      {showArrow &&
                      <tr>
                          <td className="py-3 text-xl text-black font-bold">
                            ↓
                          </td>
                        </tr>
                      }
                    </React.Fragment>);

                }

                // Normal step
                return (
                  <React.Fragment key={key}>
                    <tr>
                      <td className="border border-gray-300 p-4">
                        <div
                          className={cn(
                            "",
                            isBoxed ? "border-gray-300" : "border-gray-200"
                          )}>
                          
                          <div className="text-sm leading-relaxed text-gray-800">
                            {renderTextWithFtags(String(step.text || ""))}
                          </div>
                        </div>
                      </td>
                    </tr>

                    {showArrow &&
                    <tr>
                        <td className="py-3 text-xl text-black font-bold">↓</td>
                      </tr>
                    }
                  </React.Fragment>);

              })}
            </tbody>
          </table>
        </div>);

    }

    // Fallback: legacy groupText + [[n]] placeholders
    return (
      <div key={group.id} className="mb-10">
        <h3 className="font-bold mb-4">
          Questions {startNum}–{endNum}
        </h3>
        <p className="text-sm text-gray-700 mb-4">{group.instructions}</p>
        <div className="bg-gray-50 p-6 rounded border border-gray-200 shadow-sm text-left space-y-4">
          {group.diagramTitle &&
          <div className="bg-white p-3 text-center border border-gray-200 rounded font-bold shadow-sm uppercase tracking-wide">
              {group.diagramTitle}
            </div>
          }
          <div className="space-y-6">
            {group.groupText?.
            split("\n\n").
            map((para: string, pIdx: number) =>
            <div
              key={pIdx}
              className="bg-white p-5 border border-gray-200 rounded shadow-sm relative">
              
                  {pIdx > 0 &&
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xl text-gray-400">
                      ↓
                    </div>
              }
                  <ul className="flow-chart-list">
                    {para.split("\n").map((line: string, lIdx: number) =>
                <li
                  key={lIdx}
                  className={cn(
                    "text-sm leading-relaxed mb-2",
                    line.trim().startsWith("•") ||
                    line.trim().startsWith("*") ?
                    "pl-5 relative before:content-['●'] before:text-red-600 before:absolute before:left-0 before:top-0 before:text-base" :
                    ""
                  )}>
                  
                        {splitKeepBlankTokens(stripLeadingBullet(line)).



                  map((item: string, i: number) => {
                    const isTok = isBlankToken(item);
                    if (isTok) {
                      const q = groupQs.find((qq: any) =>
                      String(qq.question_text || "").includes(
                        item
                      )
                      );
                      if (q?.id)
                      return (
                        <Fragment key={i}>
                                    {renderGapFill(
                            q.id,

                            extractBlankTokens(String(q.question_text || "")).


                            indexOf(item),
                            getGlobalIdx(q.id)
                          )}
                                  </Fragment>);

                    }
                    return <span key={i}>{item}</span>;
                  })}
                      </li>
                )}
                  </ul>
                </div>
            )}
          </div>
        </div>
      </div>);

  };

  const renderTableGroup = (group: any) => {
    return renderOfficialTableCompletionGroup(group);
    const groupQs = questions.filter((q) => q.group_id === group.id);
    if (groupQs.length === 0) return null;
    const startNum = getGlobalIdx(groupQs[0].id);
    const endNum = startNum + groupQs.length - 1;
    return (
      <div key={group.id} className="mb-10">
        <h3 className="font-bold mb-4">
          Questions {startNum}–{endNum}
        </h3>
        <p className="text-sm text-gray-700 mb-4">{group.instructions}</p>
        <div className="overflow-x-auto border-2 border-gray-300 rounded shadow-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                {(group.tableHeaders || []).map((h: string, i: number) =>
                <th
                  key={i}
                  className="border border-gray-300 p-3 text-left font-bold text-xs uppercase tracking-wider text-gray-700">
                  
                    {h}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {(group.tableRows || []).map((row: any, rIdx: number) =>
              <tr key={rIdx} className="hover:bg-gray-50 transition-colors">
                  {(Array.isArray(row) ? row : []).map((cell: any, cIdx: number) =>
                <td
                  key={cIdx}
                  className="border border-gray-300 p-4 text-sm align-top leading-relaxed text-gray-800">
                  
                      {normalizeTableCellItems(cell).map((item, i) => {
                    const isTok = isBlankToken(item);
                    if (isTok) {
                      const q = groupQs.find((q) =>
                      q.question_text.includes(item)
                      );
                      if (q)
                      return (
                        <Fragment key={i}>
                                {renderGapFill(
                            q.id,

                            extractBlankTokens(String(q.question_text || "")).
                            indexOf(item),
                            getGlobalIdx(q.id)
                          )}
                              </Fragment>);

                    }
                    return <span key={i}>{item}</span>;
                  })}
                    </td>
                )}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>);

  };

  const renderSummaryGroup = (group: any) => {
    return renderOfficialInlineCompletionGroup(group, "summary");
    const groupQs = questions.filter((q) => q.group_id === group.id);
    if (groupQs.length === 0) return null;
    const startNum = getGlobalIdx(groupQs[0].id);
    const endNum = startNum + groupQs.length - 1;
    const opts: string[] = Array.isArray(group.options) && group.options.length > 0 ? group.options : [];
    const hasWordList = opts.length > 0;

    return (
      <div key={group.id} className="mb-10">
        <h3 className="font-bold mb-4">Questions {startNum}–{endNum}</h3>
        <p className="text-sm text-gray-700 mb-6 font-medium bg-blue-50/50 p-4 rounded border border-blue-100 italic">
          {group.instructions}
        </p>
        {hasWordList &&
        <div className="bg-gray-100 border border-gray-300 rounded p-4 mb-6 text-sm text-gray-900">
            <div className="font-semibold mb-3">{group.optionsTitle || "Word List"}</div>
            <table className="w-full border-collapse text-sm">
              <tbody>
                {Array.from({ length: Math.ceil(opts.length / 4) }).map((_, rowIdx) =>
              <tr key={rowIdx}>
                    {opts.slice(rowIdx * 4, rowIdx * 4 + 4).map((opt: string, colIdx: number) => {
                  const idx = rowIdx * 4 + colIdx;
                  return (
                    <td key={idx} className="border border-gray-300 px-3 py-2">
                          <span className="font-bold mr-2">{String.fromCharCode(65 + idx)}</span>
                          {opt}
                        </td>);

                })}
                  </tr>
              )}
              </tbody>
            </table>
          </div>
        }
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-base leading-loose font-sans">
          {group.diagramTitle &&
          <div className="font-bold text-center mb-4 text-lg border-b pb-2">{group.diagramTitle}</div>
          }
          {(group.groupText || "").split("\n\n").map((para: string, pIdx: number) =>
          <p key={pIdx} className="mb-4">
              {splitKeepBlankTokens(para).map((item: string, i: number) => {
              if (isBlankToken(item)) {
                const q = groupQs.find((qq: any) =>
                String(qq.question_text || "").includes(item)
                );
                if (q?.id) {
                  const displayNum = getGlobalIdx(q.id);
                  if (reviewMode) {
                    const uv = String(answers[q.id] || "").trim();
                    const cvs = String(q.correct_answer ?? "").split("/").map((s: string) => s.trim().toLowerCase()).filter(Boolean);
                    const empty = uv === "";
                    const ok = !empty && cvs.length > 0 && cvs.some((c: string) => c === uv.toLowerCase());
                    return (
                      <span key={i} className="inline-flex flex-col items-baseline gap-0 mx-1">
                          <span className="inline-flex items-baseline gap-1">
                            <span className="font-bold text-sm text-gray-500">{displayNum}</span>
                            <input
                            type="text"
                            disabled
                            className={cn("w-28 border-b-2 bg-transparent text-center text-sm font-bold outline-none px-1",
                            empty ? "border-orange-400 text-orange-700" : ok ? "border-green-500 text-green-800" : "border-red-500 text-red-800"
                            )}
                            value={uv}
                            placeholder="" />
                          
                          </span>
                          {!ok && q.correct_answer &&
                        <span className="text-[10px] font-bold text-red-600 whitespace-nowrap ml-5">✓ {q.correct_answer}</span>
                        }
                        </span>);

                  }
                  return (
                    <span key={i} className="inline-flex items-baseline gap-1 mx-1">
                        <span className="font-bold text-sm text-gray-500">{displayNum}</span>
                        <input
                        type="text"
                        className="w-28 border-b-2 border-gray-400 bg-transparent text-center text-sm font-bold text-blue-700 outline-none focus:border-red-500 px-1"
                        placeholder=""
                        value={answers[q.id] || ""}
                        onChange={(e) => onAnswerChange(q.id, e.target.value)} />
                      
                      </span>);

                }
              }
              return <span key={i}>{item}</span>;
            })}
            </p>
          )}
        </div>
      </div>);

  };

  const renderNoteGroup = (group: any) => {
    return renderOfficialInlineCompletionGroup(group, "note");
    const groupQs = questions.filter((q) => q.group_id === group.id);
    if (groupQs.length === 0) return null;
    const startNum = getGlobalIdx(groupQs[0].id);
    const endNum = startNum + groupQs.length - 1;

    return (
      <div key={group.id} className="mb-10">
        <h3 className="font-bold mb-4">Questions {startNum}–{endNum}</h3>
        <p className="text-sm text-gray-700 mb-6 font-medium bg-blue-50/50 p-4 rounded border border-blue-100 italic">
          {group.instructions}
        </p>
        <div className="border border-gray-400 rounded p-6 bg-white">
          {group.diagramTitle &&
          <div className="font-bold mb-4 text-base border-b border-gray-200 pb-2">
              {group.diagramTitle}
            </div>
          }
          <ul className="space-y-3">
            {(group.groupText || "").split("\n").filter((line: string) => line.trim()).map((line: string, lIdx: number) =>
            <li key={lIdx} className="flex items-baseline gap-2 text-sm leading-relaxed">
                <span className="text-gray-500 shrink-0">•</span>
                <span>
                  {String(stripLeadingBullet(line)).split(/(\[\[n?\d+\]\])/g).map((item: string, i: number) => {
                  const isToken = /^\[\[n?\d+\]\]$/.test(item.trim());
                  if (isToken) {
                    const q = groupQs.find((qq: any) =>
                    String(qq.question_text || "").includes(item.trim())
                    );
                    if (q?.id) {
                      const displayNum = getGlobalIdx(q.id);
                      if (reviewMode) {
                        const uv = String(answers[q.id] || "").trim();
                        const cvs = String(q.correct_answer ?? "").split("/").map((s: string) => s.trim().toLowerCase()).filter(Boolean);
                        const empty = uv === "";
                        const ok = !empty && cvs.length > 0 && cvs.some((c: string) => c === uv.toLowerCase());
                        return (
                          <span key={i} className="inline-flex flex-col items-start mx-0.5">
                              <span className="inline-flex items-baseline gap-1">
                                <span className="font-bold text-sm text-gray-600">{displayNum}</span>
                                <input type="text" disabled
                              className={cn("w-28 border-b-2 bg-transparent text-center text-sm font-bold outline-none px-1",
                              empty ? "border-orange-400 text-orange-700" : ok ? "border-green-500 text-green-800" : "border-red-500 text-red-800"
                              )}
                              value={uv} placeholder="" />
                              
                              </span>
                              {!ok && q.correct_answer &&
                            <span className="text-[10px] font-bold text-red-600 whitespace-nowrap ml-5">✓ {q.correct_answer}</span>
                            }
                            </span>);

                      }
                      return (
                        <span key={i} className="inline-flex items-baseline gap-1 mx-0.5">
                            <span className="font-bold text-sm text-gray-600">{displayNum}</span>
                            <input
                            type="text"
                            className="w-28 border-b-2 border-gray-400 bg-transparent text-center text-sm font-bold text-blue-700 outline-none focus:border-red-500 px-1"
                            placeholder=""
                            value={answers[q.id] || ""}
                            onChange={(e) => onAnswerChange(q.id, e.target.value)} />
                          
                          </span>);

                    }
                  }
                  return <span key={i}>{item}</span>;
                })}
                </span>
              </li>
            )}
          </ul>
        </div>
      </div>);

  };

  const renderMatchingFeaturesGroup = (group: any) => {
    return renderOfficialMatrixGroup(group, "List of features");
    const groupQs = questions.filter((q) => q.group_id === group.id);
    if (groupQs.length === 0) return null;
    const startNum = getGlobalIdx(groupQs[0].id);
    const endNum = startNum + groupQs.length - 1;
    const opts: string[] = Array.isArray(group.options) && group.options.length > 0 ? group.options : [];

    return (
      <div key={group.id} className="mb-10">
        <h3 className="font-bold mb-4">Questions {startNum}–{endNum}</h3>
        <p className="text-sm text-gray-700 mb-6 font-medium bg-blue-50/50 p-4 rounded border border-blue-100 italic">
          {group.instructions}
        </p>
        {opts.length > 0 &&
        <div className="bg-gray-100 border border-gray-300 rounded p-4 mb-6 text-sm">
            <div className="font-semibold mb-2">{group.optionsTitle || "List of Features"}</div>
            <div className="space-y-1">
              {opts.map((opt: string, idx: number) =>
            <div key={idx} className="flex items-start gap-2">
                  <span className="font-bold shrink-0">{String.fromCharCode(65 + idx)}</span>
                  <span>{opt}</span>
                </div>
            )}
            </div>
          </div>
        }
        <div className="space-y-4">
          {groupQs.map((q: any) => {
            const displayNum = getGlobalIdx(q.id);
            return (
              <div key={q.id} id={`q-${q.id}`} className={cn("flex items-center justify-between gap-4 p-4 bg-white border rounded-lg", (() => {
                if (!reviewMode) return "border-gray-200";
                const uv = String(answers[q.id] || "").trim().toUpperCase();
                const cvs = String(q.correct_answer ?? "").split("/").map((s: string) => s.trim().toUpperCase()).filter(Boolean);
                const empty = !answers[q.id] || answers[q.id] === "";
                if (empty) return "border-orange-300 bg-orange-50";
                return cvs.some((c: string) => c === uv) ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50";
              })())}>
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    {displayNum}
                  </div>
                  <span className="text-sm text-gray-800">{q.question_text}</span>
                </div>
                {reviewMode ? (() => {
                  const uv = String(answers[q.id] || "").trim().toUpperCase();
                  const cvs = String(q.correct_answer ?? "").split("/").map((s: string) => s.trim().toUpperCase()).filter(Boolean);
                  const empty = !answers[q.id] || answers[q.id] === "";
                  const ok = !empty && cvs.some((c: string) => c === uv);
                  return (
                    <div className="flex flex-col items-center shrink-0 gap-0.5">
                      <div className={cn("w-20 h-9 border-2 rounded flex items-center justify-center text-sm font-bold",
                      empty ? "border-orange-400 bg-orange-100 text-orange-700" : ok ? "border-green-500 bg-green-100 text-green-800" : "border-red-500 bg-red-100 text-red-800"
                      )}>
                        {answers[q.id] || "—"}
                      </div>
                      {!ok && q.correct_answer &&
                      <span className="text-[10px] font-bold text-red-600 whitespace-nowrap">✓ {q.correct_answer}</span>
                      }
                    </div>);

                })() :
                <select
                  value={answers[q.id] || ""}
                  onChange={(e) => onAnswerChange(q.id, e.target.value)}
                  className="w-20 h-9 border-2 border-gray-300 bg-white text-sm font-bold px-2 rounded outline-none focus:border-red-500 shrink-0">
                  
                  <option value="">{displayNum}</option>
                  {opts.map((_: any, idx: number) =>
                  <option key={idx} value={String.fromCharCode(65 + idx)}>
                      {String.fromCharCode(65 + idx)}
                    </option>
                  )}
                </select>
                }
              </div>);

          })}
        </div>
      </div>);

  };

  const renderListSelectionGroup = (group: any) => {
    const groupQs = questions.filter((q) => q.group_id === group.id);
    if (groupQs.length > 0) return <div key={group.id} className="ielts-official-group">{renderOfficialQuestionHeader(getGlobalIdx(groupQs[0].id), getQuestionEndIdx(groupQs[groupQs.length - 1]), group.instructions)}{groupQs.map((q: any) => renderOfficialChoiceQuestion(q, group))}</div>;
    if (groupQs.length === 0) return null;
    const startNum = getGlobalIdx(groupQs[0].id);
    const endNum = startNum + groupQs.length - 1;
    const opts: string[] = Array.isArray(group.options) && group.options.length > 0 ? group.options : [];

    return (
      <div key={group.id} className="mb-10">
        <h3 className="font-bold mb-4">Questions {startNum}–{endNum}</h3>
        <p className="text-sm text-gray-700 mb-6 font-medium bg-blue-50/50 p-4 rounded border border-blue-100 italic">
          {group.instructions}
        </p>
        {opts.length > 0 &&
        <div className="bg-gray-100 border border-gray-300 rounded p-4 mb-6 text-sm">
            <div className="font-semibold mb-2">{group.optionsTitle || "List of Options"}</div>
            <div className="space-y-1">
              {opts.map((opt: string, idx: number) =>
            <div key={idx} className="flex items-start gap-2">
                  <span className="font-bold shrink-0">{String.fromCharCode(65 + idx)}</span>
                  <span>{opt}</span>
                </div>
            )}
            </div>
          </div>
        }
        <div className="space-y-6">
          {groupQs.map((q: any) => {
            const displayNum = getGlobalIdx(q.id);
            const selected: string[] = answers[q.id] ? String(answers[q.id]).split(",").map((s: string) => s.trim()) : [];
            return (
              <div key={q.id} id={`q-${q.id}`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {displayNum}
                  </div>
                  <span className="text-sm font-medium text-gray-800">{q.question_text || group.instructions}</span>
                </div>
                <div className="grid grid-cols-1 gap-2 ml-10">
                  {opts.map((opt: string, idx: number) => {
                    const label = String.fromCharCode(65 + idx);
                    const isChecked = selected.includes(label);
                    if (reviewMode) {
                      const correctVals = String(q.correct_answer ?? "").split(/[,\/]/).map((s: string) => s.trim().toUpperCase()).filter(Boolean);
                      const isCorrectOpt = correctVals.includes(label);
                      const isWrongSel = isChecked && !isCorrectOpt;
                      return (
                        <label key={idx} className={cn("flex items-center gap-3 p-3 border rounded-lg",
                        isCorrectOpt ? "border-green-400 bg-green-50" : isWrongSel ? "border-red-400 bg-red-50" : "border-gray-200 bg-white opacity-60"
                        )}>
                          <input type="checkbox" disabled className="w-4 h-4" checked={isChecked} readOnly />
                          <span className="font-bold text-sm mr-1">{label}</span>
                          <span className={cn("text-sm", isCorrectOpt ? "text-green-800 font-bold" : isWrongSel ? "text-red-800 font-bold" : "text-gray-600")}>{opt}</span>
                          {isCorrectOpt && <span className="ml-auto text-xs font-black text-green-600">✓</span>}
                        </label>);

                    }
                    return (
                      <label
                        key={idx}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                        isChecked ? "border-red-500 bg-red-50" : "border-gray-200 bg-white hover:bg-gray-50"}`
                        }>
                        
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-red-600"
                          checked={isChecked}
                          onChange={() => {
                            const newSelected = isChecked ?
                            selected.filter((s: string) => s !== label) :
                            [...selected, label].sort();
                            onAnswerChange(q.id, newSelected.join(","));
                          }} />
                        
                        <span className="font-bold text-sm mr-1">{label}</span>
                        <span className="text-sm text-gray-700">{opt}</span>
                      </label>);

                  })}
                </div>
              </div>);

          })}
        </div>
      </div>);

  };

  const renderChoosingTitleGroup = (group: any) => {
    const groupQs = questions.filter((q) => q.group_id === group.id);
    if (groupQs.length > 0) return <div key={group.id} className="ielts-official-group">{renderOfficialQuestionHeader(getGlobalIdx(groupQs[0].id), getQuestionEndIdx(groupQs[groupQs.length - 1]), group.instructions || "Choose the best title for the passage.")}{groupQs.map((q: any) => renderOfficialChoiceQuestion(q, group))}</div>;
    if (groupQs.length === 0) return null;
    const startNum = getGlobalIdx(groupQs[0].id);

    return (
      <div key={group.id} className="mb-10">
        <h3 className="font-bold mb-4">Question {startNum}</h3>
        <p className="text-sm text-gray-700 mb-6 font-medium bg-blue-50/50 p-4 rounded border border-blue-100 italic">
          {group.instructions || "Choose the best title for the passage."}
        </p>
        {groupQs.map((q: any) => {
          const opts: string[] = Array.isArray(q.options) && q.options.length > 0 ?
          q.options :
          Array.isArray(group.options) && group.options.length > 0 ?
          group.options :
          [];
          return (
            <div key={q.id} id={`q-${q.id}`} className="space-y-2">
              {opts.map((opt: string, idx: number) => {
                const label = String.fromCharCode(65 + idx);
                const isSelected = answers[q.id] === label;
                if (reviewMode) {
                  const correctVals = String(q.correct_answer ?? "").split("/").map((s: string) => s.trim().toUpperCase()).filter(Boolean);
                  const isCorrectOpt = correctVals.includes(label);
                  const isWrongSel = isSelected && !isCorrectOpt;
                  return (
                    <label key={idx} className={cn("flex items-start gap-3 p-4 border rounded-lg",
                    isCorrectOpt ? "border-green-400 bg-green-50" : isWrongSel ? "border-red-400 bg-red-50" : "border-gray-200 bg-white opacity-60"
                    )}>
                      <input type="radio" name={`q-${q.id}`} disabled className="w-4 h-4 mt-0.5" checked={isSelected} readOnly />
                      <span className="font-bold text-sm mr-1 shrink-0">{label}</span>
                      <span className={cn("text-sm", isCorrectOpt ? "text-green-800 font-bold" : isWrongSel ? "text-red-800 font-bold" : "text-gray-800")}>{opt}</span>
                      {isCorrectOpt && <span className="ml-auto text-xs font-black text-green-600 shrink-0">✓</span>}
                    </label>);

                }
                return (
                  <label
                    key={idx}
                    className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                    isSelected ? "border-red-500 bg-red-50" : "border-gray-200 bg-white hover:bg-gray-50"}`
                    }>
                    
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      className="w-4 h-4 mt-0.5 accent-red-600"
                      checked={isSelected}
                      onChange={() => onAnswerChange(q.id, label)} />
                    
                    <span className="font-bold text-sm mr-1 shrink-0">{label}</span>
                    <span className="text-sm text-gray-800">{opt}</span>
                  </label>);

              })}
            </div>);

        })}
      </div>);

  };

  const renderSentenceGroup = (group: any) => {
    return renderOfficialInlineCompletionGroup(group, "sentence");
    const groupQs = questions.filter((q) => q.group_id === group.id);
    if (groupQs.length === 0) return null;
    const startNum = getGlobalIdx(groupQs[0].id);
    const endNum = startNum + groupQs.length - 1;

    const lines = (group.groupText || "").
    split("\n").
    filter((l: string) => l.trim());

    return (
      <div key={group.id} className="mb-10">
        <h3 className="font-bold mb-4">Questions {startNum}–{endNum}</h3>
        <p className="text-sm text-gray-700 mb-6 font-medium bg-blue-50/50 p-4 rounded border border-blue-100 italic">
          {group.instructions}
        </p>
        <div className="border border-gray-300 rounded p-6 bg-white space-y-5">
          {lines.map((line: string, lineIdx: number) =>
          <div key={lineIdx} className="text-sm leading-relaxed text-gray-800">
              {line.split(/(\[\[\d+\]\])/g).map((item: string, i: number) => {
              const match = item.match(/^\[\[(\d+)\]\]$/);
              if (match) {
                const q = groupQs.find((qq: any) =>
                String(qq.question_text || "").includes(item)
                );
                if (q?.id) {
                  const displayNum = getGlobalIdx(q.id);
                  if (reviewMode) {
                    const uv = String(answers[q.id] || "").trim();
                    const cvs = String(q.correct_answer ?? "").split("/").map((s: string) => s.trim().toLowerCase()).filter(Boolean);
                    const empty = uv === "";
                    const ok = !empty && cvs.length > 0 && cvs.some((c: string) => c === uv.toLowerCase());
                    return (
                      <span key={i} className="inline-flex flex-col items-start mx-1">
                          <span className="inline-flex items-baseline gap-1">
                            <span className="font-bold text-gray-600">{displayNum}</span>
                            <input type="text" disabled
                          className={cn("w-32 border-b-2 bg-transparent text-center text-sm font-bold outline-none px-1",
                          empty ? "border-orange-400 text-orange-700" : ok ? "border-green-500 text-green-800" : "border-red-500 text-red-800"
                          )}
                          value={uv} placeholder="" />
                          
                          </span>
                          {!ok && q.correct_answer &&
                        <span className="text-[10px] font-bold text-red-600 whitespace-nowrap ml-5">✓ {q.correct_answer}</span>
                        }
                        </span>);

                  }
                  return (
                    <span key={i} className="inline-flex items-baseline gap-1 mx-1">
                        <span className="font-bold text-gray-600">{displayNum}</span>
                        <input
                        type="text"
                        className="w-32 border-b-2 border-gray-400 bg-transparent text-center text-sm font-bold text-blue-700 outline-none focus:border-red-500 px-1"
                        placeholder=""
                        value={answers[q.id] || ""}
                        onChange={(e) => onAnswerChange(q.id, e.target.value)} />
                      
                      </span>);

                }
              }
              return <span key={i}>{item}</span>;
            })}
            </div>
          )}
        </div>
      </div>);

  };

  const renderDiagramGroup = (group: any) => renderOfficialDiagramCompletionGroup(group);

  return (
    <div
      className={cn("fixed inset-0 z-[100] ielts-official-root flex flex-col text-gray-900 select-none", officialContrastClass, officialTextSizeClass)}
      ref={containerRef}>
      
      {!reviewMode && <header className="ielts-official-header select-none">
        <div className="ielts-brand-lockup">
          <div className="ielts-logo-mark">IELTS</div>
          <div className="ielts-test-title">{testTitle}</div>
        </div>
        <div className="ielts-candidate-id">Test taker ID</div>
        <div className="ielts-header-actions">
          <div className="ielts-clock"><Clock className="w-4 h-4" /><span>{formatTime(timeLeft)}</span></div>
          <button type="button" aria-label="Connection"><Wifi className="w-5 h-5" /></button>
          <button type="button" aria-label="Notifications"><Bell className="w-5 h-5" /></button>
          <button type="button" aria-label="Options" onClick={() => { setShowOptionsPanel(true); setOptionsView("main"); }}><Menu className="w-6 h-6" /></button>
        </div>
      </header>}

      <div className="ielts-part-strip">
        <strong>Part {currentPartIndex + 1}</strong>
        <span>{currentPart?.instructions || `${sectionLabel} questions`}</span>
        {sectionType === "listening" && listeningAudioUrl && (
          <div className="ielts-audio-status">
            <Volume2 className="w-4 h-4" />
            <span>{audioStarted ? "Audio is playing" : audioReady ? "Audio ready" : "Preparing audio"}</span>
            {!reviewMode && !audioStarted && (
              <button type="button" onClick={handleStartListeningAudio}>Play audio</button>
            )}
          </div>
        )}
        {sectionType === "listening" && listeningAudioUrl && (
          <audio
            ref={audioRef}
            controls={false}
            preload="auto"
            src={listeningAudioUrl}
            onCanPlayThrough={() => setAudioReady(true)}
            onCanPlay={() => setAudioReady(true)}
            onPlaying={() => {
              setAudioStarted(true);
              void Promise.resolve(onAudioPlaybackStarted?.()).catch(() => {
                audioRef.current?.pause();
                setAudioStarted(false);
                setAudioError('Could not start the test clock. Tap Play to retry.');
              });
            }}
            onEnded={()=>{if(!sectionAudioUrl && audioPartIndex<parts.length-1){setAudioFallbackIndex(0);setAudioPartIndex(i=>i+1);setCurrentPartIndex(audioPartIndex+1);}}}
            onError={() => {if(audioFallbackIndex<listeningSources.length-1)setAudioFallbackIndex(i=>i+1);else setAudioError('Audio could not load. Please check your connection and try again.');}}
          />
        )}
      </div>

      <main
        className="flex-1 flex overflow-hidden relative select-none"
        style={{ height: "calc(100vh - 128px)" }}>
        {sectionType === "listening" && listeningAudioUrl && waitForAudioStart && !reviewMode && !audioStarted && (
          <div className="ielts-audio-start-overlay">
            <div className="ielts-audio-start-card">
              <div className="ielts-headphone-icon">
                <Volume2 className="h-16 w-16" />
              </div>
              <p>You will be listening to an audio clip during this test. You will not be permitted to pause or rewind the audio while answering the questions.</p>
              <p>To continue, click Play.</p>
              <button type="button" onClick={handleStartListeningAudio}>
                <span>▶</span> Play
              </button>
              {audioError && <small>{audioError}</small>}
            </div>
          </div>
        )}
        
        {sectionType === "reading" || sectionType === "writing" ?
        <>
            <div
            id="left-panel"
            className="h-full overflow-y-auto border-r border-gray-200 bg-gray-50/30 select-text"
            style={{ width: `${leftPanelWidth}%` }}
            onMouseUp={handleTextSelection}>
            
              <div className="ielts-pane-inner ielts-passage-pane-inner">
                {sectionType === "writing" ?
                  <div className="ielts-writing-prompt">
                    <div className="ielts-writing-task-label">Writing Task {currentPartIndex + 1}</div>
                    <div className="ielts-writing-prompt-text">{currentPart?.passage_text || "No question text provided."}</div>
                    {currentPart?.image_url && (
                      <div className="ielts-writing-image-frame">
                        {!writingImageLoaded && <div className="absolute inset-0 animate-pulse bg-gray-100" />}
                        <img
                          src={currentPart.image_url}
                          alt="Writing Task Reference"
                          loading="eager"
                          onLoad={() => setWritingImageLoaded(true)}
                          onError={() => setWritingImageLoaded(true)}
                          className={`h-full w-full object-contain transition-opacity duration-300 ${writingImageLoaded ? "opacity-100" : "opacity-0"}`}
                        />
                      </div>
                    )}
                  </div> :
                  <div className="ielts-reading-passage">
                    <h2>{getPartDisplayTitle(currentPart)}</h2>
                    {currentPart?.sourcePassage ? <SourceQuestionGroup group={{sourceHtml:currentPart.passage_text,sourceHeading:''}} questions={questions.filter(q=>q.part_id===currentPart.id)} answers={answers} onAnswerChange={onAnswerChange} reviewMode={reviewMode}/> : <div
                      className="ielts-reading-text select-text tiptap-content"
                      onDragOver={handleHeadingPassageDragOver}
                      onDrop={handleHeadingPassageDrop}
                      onDragLeave={handleHeadingPassageDragLeave}
                      onClick={handleHeadingPassageClick}
                      onDoubleClick={handleHeadingPassageDoubleClick}
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(injectedPassageHtml || "") }}
                    />}
                  </div>
                }
              </div>
            </div>

            <div
            onMouseDown={handleMouseDown}
            className="w-2 bg-gray-200 hover:bg-gray-300 cursor-col-resize transition-all shrink-0 z-20 flex items-center justify-center group">
            
              <div className="w-1 h-8 bg-gray-400 rounded-full group-hover:bg-gray-500" />
            </div>

            <div
            id="right-panel"
            className="flex-1 h-full overflow-y-auto bg-white select-text"
            onMouseUp={handleTextSelection}>
            
              <div className="ielts-pane-inner ielts-questions-pane-inner">
                {sectionType === "writing" ?
                  <div className="ielts-writing-answer-panel">
                    <textarea
                      onMouseUp={(e) => e.stopPropagation()}
                      className="ielts-writing-textarea"
                      placeholder=""
                      value={writingQuestionId ? answers[writingQuestionId] || "" : answers[`writing_draft_${currentPart?.id}`] || writingDrafts[currentPart?.id || ""] || ""}
                      onChange={(e) => {
                        if (writingQuestionId) {
                          onAnswerChange(writingQuestionId, e.target.value);
                        } else if (currentPart?.id) {
                          setWritingDrafts((prev) => ({ ...prev, [currentPart.id]: e.target.value }));
                          onAnswerChange(`writing_draft_${currentPart.id}`, e.target.value);
                        }
                      }}
                    />
                    {!writingQuestionId && !currentPart?.passage_text?.trim() && (
                      <div className="ielts-writing-sync-warning">The task prompt is unavailable. Your draft is kept in this browser. Please contact support before submitting.</div>
                    )}
                    <div className="ielts-word-count">Words: {splitOnWhitespace(((writingQuestionId ? answers[writingQuestionId] || "" : answers[`writing_draft_${currentPart?.id}`] || writingDrafts[currentPart?.id || ""] || "") as string).trim()).length}</div>
                  </div> :

              <div className="max-w-2xl mx-auto space-y-12 select-text">
                    {questions.length === 0 &&
                      <div className="flex items-center justify-center py-24 gap-3 text-gray-500 font-bold">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span>Loading questions…</span>
                      </div>
                    }
                    {renderPartQuestionContent(false)}
                  </div>
              }
              </div>
            </div>
          </> :

        <div
          className="flex-1 h-full overflow-y-auto bg-white select-text"
          onMouseUp={handleTextSelection}>
          
            <div className="ielts-listening-shell">
              <div className="ielts-listening-title">
                <h2>{getPartDisplayTitle(currentPart)}</h2>
                <p>{currentPart?.instructions}</p>
              </div>
              <div className="space-y-12 pb-20">
                {questions.length === 0 &&
                  <div className="flex items-center justify-center py-24 gap-3 text-gray-500 font-bold">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Loading questions…</span>
                  </div>
                }
                {renderPartQuestionContent(true)}
              </div>
            </div>
          </div>
        }
      </main>

      <footer className="ielts-bottom-nav">
        <div className="ielts-bottom-left">
          {parts.map((p, idx) => {
            const { first, last } = getPartQuestionBounds(p);
            return (
              <button key={p.id} type="button" onClick={() => setCurrentPartIndex(idx)} className={cn("ielts-part-tab", currentPartIndex === idx && "active")}>
                <span>Part {idx + 1}</span>
                {first > 0 && <small>{first}-{last}</small>}
              </button>
            );
          })}
        </div>
        <div className="ielts-question-number-strip">
          {questions.filter((q) => q.part_id === currentPart?.id).flatMap((q) => {
            const displayNum = getGlobalIdx(q.id);
            const fieldCount = getQuestionDisplayCount(q);
            const answerParts = String(answers[q.id] || "").split(",");
            const correctParts = getAnswerFieldParts(q.correct_answer);
            const wholeQuestionCorrect = reviewMode ? isObjectiveAnswerCorrect(answers[q.id], q) : false;
            const stripGroup = q?.group_id
              ? parts
                  .flatMap((part: any) => part?.question_groups || [])
                  .find((group: any) => group?.id === q.group_id || group?.temp_id === q.group_id)
              : null;
            const isOrderlessMultiChoice =
              String(q.ieltsQuestionType || stripGroup?.ieltsQuestionType || "") === "multiple_choice_multiple" ||
              q.question_type === "list_selection" ||
              (q.question_type === "multiple_choice" && String(q.correct_answer || "").includes(","));
            return Array.from({ length: fieldCount }).map((_, fieldIdx) => {
              const fieldAnswer = String(answerParts[fieldIdx] || "").trim();
              const answered = isOrderlessMultiChoice ? answerParts.filter((part) => part.trim()).length > fieldIdx : fieldAnswer !== "";
              const isWrong = reviewMode && answered && (fieldCount === 1 || isOrderlessMultiChoice ? !wholeQuestionCorrect : (() => {
                const c = String(correctParts[fieldIdx] || q.correct_answer || "").split("/").map((x: string) => x.trim().toLowerCase());
                return !c.some((cv: string) => cv !== "" && cv === fieldAnswer.toLowerCase());
              })());
              return (
                <button
                  key={`${q.id}-${fieldIdx}`}
                  type="button"
                  onClick={() => {
                    setTimeout(() => {
                      const el = document.getElementById(`q-${q.id}`);
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                    }, 50);
                  }}
                  className={cn("ielts-qnav", answered && "answered", isWrong && "wrong", reviewMode && !answered && "missing")}
                >
                  {displayNum + fieldIdx}
                </button>
              );
            });
          })}
        </div>
        <div className="ielts-bottom-actions">
          <button
            type="button"
            className="ielts-prev-next"
            onClick={() => setCurrentPartIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentPartIndex === 0}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            className="ielts-prev-next"
            onClick={() => setCurrentPartIndex((prev) => Math.min(parts.length - 1, prev + 1))}
            disabled={currentPartIndex === parts.length - 1}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => reviewMode ? onFinish() : setShowSubmitConfirm(true)}
            disabled={submittingModule}
            className="ielts-submit-btn"
          >
            {submittingModule ? "Submitting..." : reviewMode ? "Close" : "Submit"}
          </button>
        </div>
      </footer>

      {showOptionsPanel && (
        <div className="ielts-options-overlay">
          <div className="ielts-options-topbar">
            {optionsView !== "main" ? (
              <button type="button" onClick={() => setOptionsView("main")} className="ielts-options-back"><ChevronLeft className="w-5 h-5" /> Back</button>
            ) : <span />}
            <h2>{optionsView === "main" ? "Options" : optionsView === "contrast" ? "Contrast" : "Text size"}</h2>
            <button type="button" onClick={() => setShowOptionsPanel(false)} aria-label="Close"><X className="w-7 h-7" /></button>
          </div>
          {optionsView === "main" && (
            <div className="ielts-options-list">
              <button type="button" className="danger" onClick={() => reviewMode ? onFinish() : setShowSubmitConfirm(true)}>Go to submission page</button>
              <button type="button" onClick={() => setOptionsView("contrast")}>Contrast <ChevronRight className="w-5 h-5" /></button>
              <button type="button" onClick={() => setOptionsView("text-size")}>Text size <ChevronRight className="w-5 h-5" /></button>
            </div>
          )}
          {optionsView === "contrast" && (
            <div className="ielts-options-list">
              {[{id: "bw", label: "Black on white"}, {id: "wb", label: "White on black"}, {id: "yb", label: "Yellow on black"}].map((item) => (
                <button key={item.id} type="button" onClick={() => setContrastMode(item.id as any)}>{item.label}{contrastMode === item.id && <span>✓</span>}</button>
              ))}
            </div>
          )}
          {optionsView === "text-size" && (
            <div className="ielts-options-list">
              {[{id: "regular", label: "Regular"}, {id: "large", label: "Large"}, {id: "extra", label: "Extra large"}].map((item) => (
                <button key={item.id} type="button" onClick={() => setTextSizeMode(item.id as any)}>{item.label}{textSizeMode === item.id && <span>✓</span>}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {highlightMenu.show &&
      <div
        className="ielts-selection-toolbar"
        style={{
          left: highlightMenu.x,
          top: highlightMenu.y,
          transform: "translate(-50%, -110%)"
        }}>
          <button onClick={addHighlight} title="Highlight">▰</button>
          <button onClick={handleAddNote} title="Note">✎</button>
        </div>
      }
      {clearHighlightMenu.show &&
      <div
        className="ielts-selection-toolbar"
        style={{
          left: clearHighlightMenu.x,
          top: clearHighlightMenu.y,
          transform: "translate(-50%, -110%)"
        }}>
          <button onClick={removeHighlight} title="Clear">Delete</button>
        </div>
      }
      {showNoteDialog &&
      <div className="ielts-note-backdrop">
          <div className="ielts-note-card">
            <div className="ielts-note-header">
              <button type="button" onClick={() => setShowNoteDialog(false)}><X size={16} /></button>
              <button type="button" onClick={removeHighlight}>Delete</button>
            </div>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add note"
              autoFocus
            />
            <div className="ielts-note-actions">
              <button type="button" onClick={() => setShowNoteDialog(false)}>Cancel</button>
              <button type="button" onClick={saveNote}>Save</button>
            </div>
          </div>
        </div>
      }

      <AlertDialog open={showSubmitConfirm} onOpenChange={open=>{if(!submittingModule)setShowSubmitConfirm(open);}}>
        <AlertDialogContent className="luma-submit-dialog">
          <AlertDialogHeader>
            <span className="luma-submit-eyebrow">FINISH THIS MODULE</span>
            <AlertDialogTitle>Ready to submit?</AlertDialogTitle>
            <AlertDialogDescription>You cannot change these answers after submitting. Check your work before you continue.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="luma-submit-time"><span>Time remaining</span><strong>{formatTime(timeLeft)}</strong></div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submittingModule}>Keep working</AlertDialogCancel>
            <AlertDialogAction disabled={submittingModule} onClick={e=>{e.preventDefault();void handleConfirmSubmit();}}>{submittingModule?'Submitting…':'Submit module ↗'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


    </div>);

}
