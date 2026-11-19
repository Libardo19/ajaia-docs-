# Ajaia Docs

A lightweight collaborative document editor, inspired by Google Docs and built as a full-stack slice. You can create, rename, edit and autosave rich-text documents, import files, share with other users (as viewer or editor) and export to Markdown.

- **Live app:** https://ajaia-docs-dusky-nine.vercel.app
- **Walkthrough video:** see [`VIDEO_URL.txt`](VIDEO_URL.txt)
- **Architecture note:** [`ARCHITECTURE.md`](ARCHITECTURE.md)
- **AI workflow note:** [`AI_WORKFLOW.md`](AI_WORKFLOW.md)
- **What's included:** [`SUBMISSION.md`](SUBMISSION.md)

## Test accounts

Authentication is mocked on purpose. The login page lists three seeded users; click one to sign in. To switch user, click **Switch** in the header. No passwords are needed.

| User | Email | What they see on first login |
| --- | --- | --- |
| Alice Admin | `alice@ajaia.test` | Owns "Welcome to Ajaia Docs"; Carol shared "Carol's review notes" with her (view only) |
| Bob Builder | `bob@ajaia.test` | Has **edit** access to Alice's welcome doc |
| Carol Critic | `carol@ajaia.test` | Has **view-only** access to Alice's welcome doc; owns "Carol's review notes" |

**Start here:** sign in as Alice and open **"How Ajaia Docs meets the assignment"**. It is a document co-written in the app by all three users. Alice owns it, Bob added sections as an editor, and Carol wrote hers as an editor before being switched to view only. It walks through every requirement of the brief.

**Suggested 2-minute review path**
1. Sign in as **Alice**. Open the welcome doc and change some formatting. The header shows *Saved*.
2. Reload the page. Content and formatting are still there.
3. Click **Share**: the other demo accounts are listed. Pick a role and click **Add**, or change or revoke an existing one.
4. Click **Switch**, sign in as **Carol**, and open the doc. It is read-only, with a *View only* badge.
5. Open the same doc as Alice in one browser and as Bob in a private window. Edit as both. The second person to save gets a conflict banner instead of overwriting the first person's work.
6. On the dashboard, click **Import file** and pick one of the files in [`samples/`](samples).
7. In any document, click **Export .md**.

## Features

| Area | What works |
| --- | --- |
| Documents | Create, rename (inline title), edit, autosave (debounced; Ctrl/Cmd+S saves immediately), delete (owner only), reopen |
| Rich text | Bold, italic, underline, strikethrough, H1–H3, bulleted and numbered lists, quotes, undo/redo, keyboard shortcuts |
| File import | **`.txt`, `.md`, `.docx` only, max 2 MB.** Each file becomes a new editable document owned by the uploader. Formatting is kept (headings, lists, bold, italic, underline). |
| Sharing | Owner grants **viewer** or **editor** access by email, can change roles and revoke access. The dashboard separates **My documents** from **Shared with me**, with role badges. |
| Persistence | Postgres (Supabase). Content is stored as Tiptap/ProseMirror JSON, so the structure round-trips exactly. |
| Concurrency | Optimistic versioning. If someone else saved since you loaded the doc, your save returns 409 and you choose *Load their version* or *Keep mine*. Nothing is overwritten silently. |
| Export | Download any document you can read as Markdown. Underline is kept as `<u>…</u>`, because Markdown has no underline. |

## Run locally

Requirements: Node 20 or newer, plus a Postgres database. A free Supabase project works, and so does any local Postgres.

```bash
npm install
cp .env.example .env            # fill DATABASE_URL, DIRECT_URL, SESSION_SECRET
npx prisma migrate deploy       # create tables
npm run db:seed                 # 3 demo users + demo documents (idempotent)
npm run dev                     # http://localhost:3000
```

With a plain local Postgres, set `DATABASE_URL` and `DIRECT_URL` to the same connection string and drop the `?pgbouncer=true` part.

**No Postgres installed?** Run an embedded one (PGlite, already a dev dependency) in a second terminal:

```bash
npm run db:local   # Postgres-compatible server on 127.0.0.1:5440, data in ./.pglite
# then in .env:
# DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5440/postgres?sslmode=disable&pgbouncer=true&connection_limit=1"
# DIRECT_URL=<same value>
```

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server on port 3000 |
| `npm test` | Unit tests (Vitest): permission matrix, import/export conversion |
| `npm run typecheck` / `npm run lint` | Static checks |
| `npm run build` | Production build |
| `npm run db:seed` | Seed demo users and documents |

## Deploy (Vercel + Supabase)

1. Create a Supabase project. Copy the Prisma connection strings from **Connect → ORMs → Prisma**.
2. Import the repo in Vercel. Set `DATABASE_URL` (pooler, port 6543, with `?pgbouncer=true&connection_limit=1`), `DIRECT_URL` (port 5432) and `SESSION_SECRET`.
3. Vercel runs `vercel-build`, which generates the Prisma client, applies migrations and builds Next.js.
4. Run `npm run db:seed` once against the production database.

## Project layout

Four layers inside one Next.js app (details in [`ARCHITECTURE.md`](ARCHITECTURE.md)):

```
src/app/                      presentation: pages /login, / (dashboard), /docs/[id]
src/components/               presentation: editor, toolbar, share dialog, autosave hook (Tailwind CSS)
src/app/api/**/route.ts       one-line routes: withErrors(withAuth(controller.fn))
src/server/controllers/       HTTP in/out: zod validation, status codes, headers
src/server/services/          business rules: permissions, optimistic versioning, import/export, session
src/server/repositories/      data access: the only code that uses Prisma
src/server/middlewares/       error mapping, auth guard, request helpers
src/server/lib/convert.ts     txt/md/docx → editor JSON; editor JSON → Markdown
src/lib/                      shared domain: access rules, typed errors, zod schemas, editor schema
src/middleware.ts             edge redirect to /login for pages without a session
prisma/                       schema, SQL migrations, seed
tests/                        Vitest unit tests
samples/                      example .md / .txt / .docx files for the import flow
```
