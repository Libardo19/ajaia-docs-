"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";

type Btn = {
  key: string;
  label: string;
  shortcut?: string;
  icon: React.ComponentType<{ className?: string }>;
  run: (e: Editor) => void;
  active?: (e: Editor) => boolean;
  disabled?: (e: Editor) => boolean;
};

const GROUPS: Btn[][] = [
  [
    { key: "undo", label: "Undo", shortcut: "Ctrl+Z", icon: Undo2, run: (e) => e.chain().focus().undo().run(), disabled: (e) => !e.can().undo() },
    { key: "redo", label: "Redo", shortcut: "Ctrl+Shift+Z", icon: Redo2, run: (e) => e.chain().focus().redo().run(), disabled: (e) => !e.can().redo() },
  ],
  [
    { key: "p", label: "Normal text", icon: Pilcrow, run: (e) => e.chain().focus().setParagraph().run(), active: (e) => e.isActive("paragraph") },
    { key: "h1", label: "Heading 1", icon: Heading1, run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(), active: (e) => e.isActive("heading", { level: 1 }) },
    { key: "h2", label: "Heading 2", icon: Heading2, run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(), active: (e) => e.isActive("heading", { level: 2 }) },
    { key: "h3", label: "Heading 3", icon: Heading3, run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(), active: (e) => e.isActive("heading", { level: 3 }) },
  ],
  [
    { key: "bold", label: "Bold", shortcut: "Ctrl+B", icon: Bold, run: (e) => e.chain().focus().toggleBold().run(), active: (e) => e.isActive("bold") },
    { key: "italic", label: "Italic", shortcut: "Ctrl+I", icon: Italic, run: (e) => e.chain().focus().toggleItalic().run(), active: (e) => e.isActive("italic") },
    { key: "underline", label: "Underline", shortcut: "Ctrl+U", icon: Underline, run: (e) => e.chain().focus().toggleUnderline().run(), active: (e) => e.isActive("underline") },
    { key: "strike", label: "Strikethrough", icon: Strikethrough, run: (e) => e.chain().focus().toggleStrike().run(), active: (e) => e.isActive("strike") },
  ],
  [
    { key: "ul", label: "Bulleted list", icon: List, run: (e) => e.chain().focus().toggleBulletList().run(), active: (e) => e.isActive("bulletList") },
    { key: "ol", label: "Numbered list", icon: ListOrdered, run: (e) => e.chain().focus().toggleOrderedList().run(), active: (e) => e.isActive("orderedList") },
    { key: "quote", label: "Quote", icon: Quote, run: (e) => e.chain().focus().toggleBlockquote().run(), active: (e) => e.isActive("blockquote") },
  ],
];

const ALL = GROUPS.flat();

export function Toolbar({ editor }: { editor: Editor }) {
  // Re-render only when the active/disabled flags actually change.
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      Object.fromEntries(
        ALL.map((b) => [b.key, { active: b.active?.(e) ?? false, disabled: b.disabled?.(e) ?? false }]),
      ),
  });

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex flex-wrap items-center gap-1 rounded-xl border border-gray-200 bg-white px-2 py-1 shadow-sm"
    >
      {GROUPS.map((group, i) => (
        <div key={i} className="flex items-center gap-0.5 border-r border-gray-200 pr-1 last:border-r-0">
          {group.map((b) => {
            const s = state[b.key];
            const Icon = b.icon;
            return (
              <button
                key={b.key}
                type="button"
                title={b.shortcut ? `${b.label} (${b.shortcut})` : b.label}
                aria-label={b.label}
                aria-pressed={s.active}
                disabled={s.disabled}
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => b.run(editor)}
                className={`rounded-md p-1.5 transition disabled:opacity-30 ${
                  s.active ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
