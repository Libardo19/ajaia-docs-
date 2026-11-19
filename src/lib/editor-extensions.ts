import StarterKit from "@tiptap/starter-kit";

/**
 * The schema shared by the browser editor, server-side import and export.
 * Keeping one list guarantees imported/exported content matches what the editor can render.
 */
export const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: { openOnClick: false, autolink: true },
    codeBlock: false,
  }),
];

export const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] } as const;
