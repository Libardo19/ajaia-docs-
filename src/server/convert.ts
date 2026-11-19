import { generateHTML, generateJSON } from "@tiptap/html/server";
import type { JSONContent } from "@tiptap/core";
import mammoth from "mammoth";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import TurndownService from "turndown";
import { editorExtensions } from "@/lib/editor-extensions";
import { BadRequestError, PayloadTooLargeError, UnsupportedMediaError } from "@/lib/errors";

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export const SUPPORTED_IMPORT_EXTENSIONS = [".txt", ".md", ".markdown", ".docx"] as const;

/** Only tags the editor schema understands survive; everything else is unwrapped or dropped. */
function sanitize(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "h1", "h2", "h3", "strong", "b", "em", "i", "u", "s", "strike", "del",
      "ul", "ol", "li", "blockquote", "code", "hr", "a",
    ],
    allowedAttributes: { a: ["href"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      // The editor supports H1–H3; deeper headings collapse to H3 instead of being lost.
      h4: "h3",
      h5: "h3",
      h6: "h3",
      pre: "p",
    },
  });
}

export function htmlToDoc(html: string): JSONContent {
  const doc = generateJSON(sanitize(html), editorExtensions) as JSONContent;
  if (!doc.content || doc.content.length === 0) {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }
  return doc;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function textToHtml(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function markdownToHtml(md: string): string {
  return marked.parse(md, { async: false, gfm: true }) as string;
}

function extensionOf(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i === -1 ? "" : filename.slice(i).toLowerCase();
}

function titleFrom(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "").trim();
  return (base || "Imported document").slice(0, 200);
}

/** Converts an uploaded file into a title + editor document. Throws typed errors for the UI. */
export async function fileToDocument(
  filename: string,
  bytes: Buffer,
): Promise<{ title: string; content: JSONContent }> {
  if (bytes.byteLength === 0) throw new BadRequestError("The file is empty.");
  if (bytes.byteLength > MAX_IMPORT_BYTES) {
    throw new PayloadTooLargeError("File is larger than 2 MB.");
  }
  const ext = extensionOf(filename);
  let html: string;
  switch (ext) {
    case ".txt":
      html = textToHtml(bytes.toString("utf8"));
      break;
    case ".md":
    case ".markdown":
      html = markdownToHtml(bytes.toString("utf8"));
      break;
    case ".docx": {
      try {
        // mammoth drops underline by default; map it explicitly so formatting survives.
        const result = await mammoth.convertToHtml({ buffer: bytes }, { styleMap: ["u => u"] });
        html = result.value;
      } catch {
        throw new BadRequestError("That .docx file could not be read. Is it a valid Word document?");
      }
      break;
    }
    default:
      throw new UnsupportedMediaError(
        `Unsupported file type "${ext || "none"}". Use .txt, .md or .docx.`,
      );
  }
  return { title: titleFrom(filename), content: htmlToDoc(html) };
}

const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  emDelimiter: "*",
});
// Markdown has no underline; keep it as inline HTML so it survives a round trip.
turndown.addRule("underline", {
  filter: ["u"],
  replacement: (content) => `<u>${content}</u>`,
});
turndown.addRule("strikethrough", {
  filter: ["s", "del"],
  replacement: (content) => `~~${content}~~`,
});

// Tight list items: "- item" / "1. item" without turndown's default padding and blank lines.
turndown.addRule("listItem", {
  filter: "li",
  replacement: (content, node) => {
    const body = content.replace(/^\n+/, "").replace(/\n+$/, "\n").replace(/\n(?!$)/g, "\n   ");
    const parent = node.parentNode as HTMLElement | null;
    let prefix = "- ";
    if (parent?.nodeName === "OL") {
      const start = Number(parent.getAttribute("start") ?? 1);
      prefix = `${start + Array.prototype.indexOf.call(parent.children, node)}. `;
    }
    return prefix + body + (node.nextSibling && !body.endsWith("\n") ? "\n" : "");
  },
});

function firstHeadingText(doc: JSONContent): string | null {
  const first = doc.content?.[0];
  if (first?.type !== "heading" || first.attrs?.level !== 1) return null;
  return (first.content ?? []).map((n) => n.text ?? "").join("").trim();
}

export function docToMarkdown(doc: JSONContent, title?: string): string {
  // Tiptap wraps list item text in <p>; unwrap so lists export tight.
  const html = generateHTML(doc, editorExtensions)
    .replace(/<li><p>/g, "<li>")
    .replace(/<\/p><\/li>/g, "</li>");
  const body = turndown.turndown(html).trim();
  // Don't duplicate the title if the document already opens with it as an H1.
  const addTitle = title && firstHeadingText(doc) !== title.trim();
  return addTitle ? `# ${title}\n\n${body}\n` : `${body}\n`;
}
