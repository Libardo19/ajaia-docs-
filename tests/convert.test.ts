import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/core";
import { docToMarkdown, fileToDocument } from "@/server/convert";
import { AppError } from "@/lib/errors";

const types = (doc: JSONContent) => (doc.content ?? []).map((n) => n.type);
const marksIn = (node: JSONContent): string[] => [
  ...(node.marks ?? []).map((m) => m.type),
  ...(node.content ?? []).flatMap(marksIn),
];

const md = [
  "# Plan",
  "",
  "Some **bold**, *italic* and <u>underlined</u> text.",
  "",
  "## Steps",
  "",
  "- first",
  "- second",
  "",
  "1. one",
  "2. two",
  "",
].join("\n");

describe("fileToDocument", () => {
  it("converts markdown into editor structure (headings, lists, marks)", async () => {
    const { title, content } = await fileToDocument("plan.md", Buffer.from(md));
    expect(title).toBe("plan");
    expect(types(content)).toEqual(["heading", "paragraph", "heading", "bulletList", "orderedList"]);
    expect(content.content![0].attrs?.level).toBe(1);
    expect(marksIn(content)).toEqual(expect.arrayContaining(["bold", "italic", "underline"]));
  });

  it("splits plain text into paragraphs and keeps HTML as literal text", async () => {
    const { content } = await fileToDocument("notes.txt", Buffer.from("Hello <b>world</b>\n\nSecond"));
    expect(types(content)).toEqual(["paragraph", "paragraph"]);
    expect(content.content![0].content![0].text).toBe("Hello <b>world</b>");
    expect(marksIn(content)).toEqual([]);
  });

  it("strips scripts and unsafe markup from imported content", async () => {
    const { content } = await fileToDocument(
      "x.md",
      Buffer.from("hi <script>alert(1)</script><img src=x onerror=alert(1)>"),
    );
    expect(JSON.stringify(content)).not.toMatch(/script|onerror|img/);
  });

  it("rejects unsupported, empty and oversized files with typed errors", async () => {
    await expect(fileToDocument("a.pdf", Buffer.from("x"))).rejects.toMatchObject({ status: 415 });
    await expect(fileToDocument("a.txt", Buffer.alloc(0))).rejects.toMatchObject({ status: 400 });
    const big = Buffer.alloc(2 * 1024 * 1024 + 1, 97);
    await expect(fileToDocument("a.txt", big)).rejects.toBeInstanceOf(AppError);
    await expect(fileToDocument("a.txt", big)).rejects.toMatchObject({ status: 413 });
  });
});

describe("docToMarkdown", () => {
  it("round-trips markdown → document → markdown keeping structure", async () => {
    const { content } = await fileToDocument("plan.md", Buffer.from(md));
    const out = docToMarkdown(content);
    expect(out).toContain("# Plan");
    expect(out).toContain("## Steps");
    expect(out).toContain("**bold**");
    expect(out).toContain("*italic*");
    expect(out).toContain("<u>underlined</u>");
    expect(out).toMatch(/^- first\n- second$/m);
    expect(out).toMatch(/^1\. one\n2\. two$/m);
  });

  it("adds the title as H1 only when the document doesn't already start with it", async () => {
    const { content } = await fileToDocument("plan.md", Buffer.from(md));
    expect(docToMarkdown(content, "Plan").match(/^# Plan$/gm)).toHaveLength(1);
    expect(docToMarkdown(content, "Other").startsWith("# Other\n\n# Plan")).toBe(true);
  });
});

describe("docx import", () => {
  it("keeps headings, lists and inline marks from a Word file", async () => {
    const { readFile } = await import("node:fs/promises");
    const bytes = await readFile(new URL("../samples/quarterly-planning.docx", import.meta.url));
    const { title, content } = await fileToDocument("quarterly-planning.docx", bytes);
    expect(title).toBe("quarterly-planning");
    expect(types(content)).toEqual(
      expect.arrayContaining(["heading", "paragraph", "bulletList", "orderedList"]),
    );
    expect(marksIn(content)).toEqual(expect.arrayContaining(["bold", "italic", "underline"]));
  });

  it("rejects a corrupt .docx with a friendly 400", async () => {
    await expect(fileToDocument("bad.docx", Buffer.from("not a zip"))).rejects.toMatchObject({ status: 400 });
  });
});
