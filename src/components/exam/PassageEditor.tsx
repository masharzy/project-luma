"use client";

import React, { useEffect, useCallback, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import { Image } from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Image as ImageIcon,
  Table as TableIcon,
  Type,
  Heading1,
  Heading2,
  Heading3,
  Plus,
  Highlighter,
  Palette,
  Undo,
  Redo,
  Quote,
  Minus,
  RowsIcon,
  Columns,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/exam/utils";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
      headingGap: {
        insertHeadingGap: (gapNum: number, correctAnswer?: string) => ReturnType;
      };
      standardGap: {
        insertStandardGap: (gapNum: number) => ReturnType;
      };
    }
  }


const toRoman = (num: number): string => {
  const roman: Record<string, number> = {
    m: 1000, cm: 900, d: 500, cd: 400, c: 100, xc: 90, l: 50, xl: 40, x: 10, ix: 9, v: 5, iv: 4, i: 1
  };
  let str = "";
  for (const i of Object.keys(roman)) {
    const q = Math.floor(num / roman[i]);
    num -= q * roman[i];
    str += i.repeat(q);
  }
  return str.toUpperCase();
};

const HeadingGapComponent = ({ node, updateAttributes, editor, getPos }: any) => {
  const { gapNum, correctAnswer } = node.attrs;
  const gapLetter = String.fromCharCode(96 + gapNum);

  const options = editor?.options?.editorProps?.attributes?.["data-heading-options"]
    ? JSON.parse(editor.options.editorProps.attributes["data-heading-options"])
    : [];

  return (
    <NodeViewWrapper as="span" className="inline-flex align-middle">
      <span
        contentEditable={false}
        className="inline-flex items-center gap-1 mx-1 px-2 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 border-2 border-blue-400 rounded-xl font-sans align-middle shadow-md select-none"
      >
        <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">
          {gapLetter}
        </span>
        <select
          value={correctAnswer || ""}
          onChange={(e) => {
            e.stopPropagation();
            updateAttributes({ correctAnswer: e.target.value });
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="h-6 text-[10px] font-bold border border-blue-300 rounded-lg bg-white px-2 outline-none cursor-pointer min-w-[65px]"
        >
          <option value="">Select</option>
            {options.map((opt: string, idx: number) => {
              const roman = toRoman(idx + 1);
              return (
                <option key={idx} value={roman}>
                  {`${idx + 1} (${roman}) - ${opt || "Heading"}`}
                </option>
              );
            })}

        </select>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            if (typeof getPos === 'function') {
              const pos = getPos();
              editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
            } else {
              editor?.chain().focus().deleteNode("headingGap").run();
            }
          }}
          className="w-5 h-5 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center text-xs font-bold transition-colors"
        >
          ×
        </button>
      </span>
    </NodeViewWrapper>
  );
};

const HeadingGapExtension = Node.create({
  name: "headingGap",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      gapNum: { default: 1 },
      correctAnswer: { default: "" },
    };
  },

  parseHTML() {
    return [
      { 
        tag: 'span[data-heading-gap]',
        getAttrs: (node: HTMLElement) => ({
          gapNum: parseInt(node.getAttribute('data-heading-gap') || '1'),
          correctAnswer: node.getAttribute('data-correct-answer') || '',
        }),
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      {
        "data-heading-gap": HTMLAttributes.gapNum,
        "data-correct-answer": HTMLAttributes.correctAnswer || "",
        "data-type": "heading-gap",
      },
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(HeadingGapComponent);
  },

  addCommands() {
    return {
      insertHeadingGap:
        (gapNum: number, correctAnswer?: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { gapNum, correctAnswer: correctAnswer || "" },
          });
        },
    };
  },
});

const StandardGapComponent = ({ node, editor, getPos }: any) => {
  const { gapNum } = node.attrs;

  return (
    <NodeViewWrapper as="span" className="inline-flex align-middle">
      <span
        contentEditable={false}
        className="inline-flex items-center gap-1 mx-1 px-2 py-1 bg-gradient-to-r from-amber-100 to-orange-100 border-2 border-amber-400 rounded-xl font-sans align-middle shadow-md select-none"
      >
        <span className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center text-[10px] font-black">
          {gapNum}
        </span>
        <span className="text-[10px] font-bold text-amber-800 px-1">Gap</span>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            if (typeof getPos === 'function') {
              const pos = getPos();
              editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
            }
          }}
          className="w-5 h-5 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center text-xs font-bold transition-colors"
        >
          ×
        </button>
      </span>
    </NodeViewWrapper>
  );
};

const StandardGapExtension = Node.create({
  name: "standardGap",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      gapNum: { default: 1 },
    };
  },

  parseHTML() {
    return [
      { 
        tag: 'span[data-standard-gap]',
        getAttrs: (node: HTMLElement) => ({
          gapNum: parseInt(node.getAttribute('data-standard-gap') || '1'),
        }),
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      {
        "data-standard-gap": HTMLAttributes.gapNum,
        "data-type": "standard-gap",
      },
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(StandardGapComponent);
  },

  addCommands() {
    return {
      insertStandardGap:
        (gapNum: number) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { gapNum },
          });
        },
    };
  },
});

const FONTS = [
  { label: "Default", value: "" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Sans", value: "Arial, sans-serif" },
  { label: "Mono", value: "monospace" },
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Times", value: "Times New Roman, serif" },
];

const COLORS = [
  "#000000",
  "#374151",
  "#DC2626",
  "#EA580C",
  "#CA8A04",
  "#16A34A",
  "#0891B2",
  "#2563EB",
  "#7C3AED",
  "#DB2777",
];

interface PassageEditorProps {
  content: string;
  onChange: (html: string) => void;
  onInsertGap?: () => { gapNum: number; correctAnswer?: string; type?: string };
  headingOptions?: string[];
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export default function PassageEditor({
  content,
  onChange,
  onInsertGap,
  headingOptions = [],
  placeholder = "Start typing your passage...",
  className,
  minHeight = "400px",
}: PassageEditorProps) {
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);

  const editor = useEditor({
    injectCSS: false,
    extensions: [
      StarterKit.configure({
        underline: false,
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({ inline: true, allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TextStyle,
      FontFamily,
      Color,
        Highlight.configure({ multicolor: true }),
        Placeholder.configure({ placeholder }),
        HeadingGapExtension,
        StandardGapExtension,
      ],

    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-full p-5 font-serif text-[15px] leading-[2]",
        "data-heading-options": JSON.stringify(headingOptions),
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && headingOptions.length > 0) {
      editor.setOptions({
        editorProps: {
          attributes: {
            class:
              "prose prose-sm max-w-none focus:outline-none min-h-full p-5 font-serif text-[15px] leading-[2]",
            "data-heading-options": JSON.stringify(headingOptions),
          },
        },
      });
    }
  }, [headingOptions, editor]);

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      // Use setTimeout to avoid flushSync error during React lifecycle
      const timer = setTimeout(() => {
        editor.commands.setContent(content, { emitUpdate: false });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [content, editor]);

  useEffect(() => {
    if (!editor) return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ gapNum: number; correctAnswer?: string }>).detail;
      if (!detail?.gapNum) return;
      editor.chain().focus().insertHeadingGap(detail.gapNum, detail.correctAnswer).run();
    };
    window.addEventListener("passage-editor-insert-heading-gap", handler as EventListener);
    return () => window.removeEventListener("passage-editor-insert-heading-gap", handler as EventListener);
  }, [editor]);

  const handleInsertGap = useCallback(() => {
    if (!editor || !onInsertGap) return;

    const gapData = onInsertGap();
    if (gapData && gapData.gapNum) {
      if (gapData.type === 'heading') {
        editor.chain().focus().insertHeadingGap(gapData.gapNum, gapData.correctAnswer).run();
      } else {
        editor.chain().focus().insertStandardGap(gapData.gapNum).run();
      }
    }
  }, [editor, onInsertGap]);

  const addImage = useCallback(() => {
    const url = window.prompt("Enter image URL:");
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const insertTable = useCallback(
    (rows: number, cols: number) => {
      if (editor) {
        editor
          .chain()
          .focus()
          .insertTable({ rows, cols, withHeaderRow: true })
          .run();
        setShowTableMenu(false);
      }
    },
    [editor]
  );

  if (!editor) return null;

  const ToolbarButton = ({
    onClick,
    isActive = false,
    disabled = false,
    children,
    title,
  }: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "p-1.5 rounded-lg transition-all",
        isActive
          ? "bg-blue-600 text-white shadow-md"
          : "text-gray-600 hover:bg-gray-100",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );

  const ToolbarDivider = () => <div className="w-px h-6 bg-gray-200 mx-1" />;

  return (
    <div className={cn("border-2 border-gray-200 rounded-xl overflow-hidden bg-white", className)}>
      <div className="border-b border-gray-200 bg-gray-50 p-2 flex flex-wrap items-center gap-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo size={16} />
        </ToolbarButton>

        <ToolbarDivider />

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowFontMenu(!showFontMenu)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100"
          >
            <Type size={14} />
            Font
            <ChevronDown size={12} />
          </button>
          {showFontMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[140px]">
              {FONTS.map((font) => (
                <button
                  key={font.label}
                  type="button"
                  onClick={() => {
                    if (font.value) {
                      editor.chain().focus().setFontFamily(font.value).run();
                    } else {
                      editor.chain().focus().unsetFontFamily().run();
                    }
                    setShowFontMenu(false);
                  }}
                  className="block w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50"
                  style={{ fontFamily: font.value || "inherit" }}
                >
                  {font.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive("heading", { level: 1 })}
          title="Heading 1"
        >
          <Heading1 size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          <Heading2 size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
        >
          <Heading3 size={16} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="Bold"
        >
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="Italic"
        >
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
          title="Underline"
        >
          <UnderlineIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          title="Strikethrough"
        >
          <Strikethrough size={16} />
        </ToolbarButton>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowColorMenu(!showColorMenu)}
            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100"
            title="Text Color"
          >
            <Palette size={16} />
          </button>
          {showColorMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2 grid grid-cols-5 gap-1">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    editor.chain().focus().setColor(color).run();
                    setShowColorMenu(false);
                  }}
                  className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowHighlightMenu(!showHighlightMenu)}
            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100"
            title="Highlight"
          >
            <Highlighter size={16} />
          </button>
          {showHighlightMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2 grid grid-cols-5 gap-1">
              {["#fef08a", "#bbf7d0", "#bfdbfe", "#fecaca", "#e9d5ff"].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    editor.chain().focus().toggleHighlight({ color }).run();
                    setShowHighlightMenu(false);
                  }}
                  className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}
        </div>

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          isActive={editor.isActive({ textAlign: "left" })}
          title="Align Left"
        >
          <AlignLeft size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          isActive={editor.isActive({ textAlign: "center" })}
          title="Align Center"
        >
          <AlignCenter size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          isActive={editor.isActive({ textAlign: "right" })}
          title="Align Right"
        >
          <AlignRight size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          isActive={editor.isActive({ textAlign: "justify" })}
          title="Justify"
        >
          <AlignJustify size={16} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="Bullet List"
        >
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          title="Numbered List"
        >
          <ListOrdered size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          title="Quote"
        >
          <Quote size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >
          <Minus size={16} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton onClick={addImage} title="Insert Image">
          <ImageIcon size={16} />
        </ToolbarButton>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTableMenu(!showTableMenu)}
            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100"
            title="Insert Table"
          >
            <TableIcon size={16} />
          </button>
          {showTableMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3">
              <p className="text-xs font-bold text-gray-500 mb-2">Insert Table</p>
              <div className="grid grid-cols-5 gap-1">
                {[1, 2, 3, 4, 5].map((rows) =>
                  [1, 2, 3, 4, 5].map((cols) => (
                    <button
                      key={`${rows}-${cols}`}
                      type="button"
                      onClick={() => insertTable(rows, cols)}
                      className="w-5 h-5 border border-gray-300 rounded hover:bg-blue-100 hover:border-blue-400"
                      title={`${rows}x${cols}`}
                    />
                  ))
                )}
              </div>
              {editor.isActive("table") && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().addRowAfter().run()}
                    className="w-full text-left px-2 py-1 text-xs font-medium hover:bg-gray-50 rounded flex items-center gap-2"
                  >
                    <RowsIcon size={12} /> Add Row
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().addColumnAfter().run()}
                    className="w-full text-left px-2 py-1 text-xs font-medium hover:bg-gray-50 rounded flex items-center gap-2"
                  >
                    <Columns size={12} /> Add Column
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().deleteTable().run()}
                    className="w-full text-left px-2 py-1 text-xs font-medium hover:bg-red-50 text-red-600 rounded flex items-center gap-2"
                  >
                    <Trash2 size={12} /> Delete Table
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {onInsertGap && (
          <>
            <ToolbarDivider />
            <button
              type="button"
              onClick={handleInsertGap}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-black hover:bg-blue-700 transition-all shadow-md"
            >
              <Plus size={14} /> INSERT GAP
            </button>
          </>
        )}
      </div>

      <div
        className="overflow-y-auto"
        style={{ minHeight }}
        onClick={() => editor.chain().focus().run()}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export function parseEditorHtml(html: string): { text: string; gaps: { gapNum: number; correctAnswer: string }[] } {
  const gaps: { gapNum: number; correctAnswer: string }[] = [];
  const headingGapRegex = /<span[^>]*data-heading-gap="(\d+)"[^>]*data-correct-answer="([^"]*)"[^>]*>/g;
  
  let match;
  while ((match = headingGapRegex.exec(html)) !== null) {
    gaps.push({
      gapNum: parseInt(match[1]),
      correctAnswer: match[2] || "",
    });
  }

  const plainText = html
    .replace(/<span[^>]*data-heading-gap="(\d+)"[^>]*>.*?<\/span>/g, "[H$1]")
    .replace(/<span[^>]*data-standard-gap="(\d+)"[^>]*>.*?<\/span>/g, "[[$1]]")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();

  return { text: plainText, gaps };
}

export function convertPlainTextToHtml(text: string, gaps: { gapNum: number; correctAnswer: string }[]): string {
  const gapMap = new Map(gaps.map(g => [g.gapNum, g.correctAnswer]));
  
  let html = text
    .replace(/\n/g, "<br>")
    .replace(/\[H(\d+)\]/g, (_, num) => {
      const gapNum = parseInt(num);
      const correctAnswer = gapMap.get(gapNum) || "";
      return `<span data-heading-gap="${gapNum}" data-correct-answer="${correctAnswer}"></span>`;
    })
    .replace(/\[\[(\d+)\]\]/g, (_, num) => {
      const gapNum = parseInt(num);
      return `<span data-standard-gap="${gapNum}"></span>`;
    });

  return `<p>${html}</p>`;
}
