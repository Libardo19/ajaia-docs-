# Architecture note

## What I optimized for

The brief rewards a **coherent, working slice** more than broad, shallow coverage. I aimed for four things:

1. Every required flow works end to end on a live URL.
2. Access rules that are correct and easy to audit.
3. An editing experience that never loses work.
4. A codebase a reviewer can read in about 10 minutes.

## Shape

- **One Next.js 15 app.** The UI, API route handlers and server components all live in it, so there is one deploy target (Vercel) and one language. A separate API service would add a deploy and CORS work for no reviewer-visible gain.
- **Postgres on Supabase, through Prisma.** It is free for reviewers and relational, which suits owner/share rows. Migrations and the seed are checked in. I use Supabase only as Postgres. Authorization lives in application code, not RLS, because auth is mocked and RLS would need Supabase Auth JWTs.
- **Tiptap 3 (ProseMirror).** It has a mature schema, shortcuts and undo/redo. The **same extension list** (`src/lib/editor-extensions.ts`) drives three things: the browser editor, server-side import (HTML → JSON) and export (JSON → HTML → Markdown). Content can therefore never contain nodes the editor can't render.

- **UI: Tailwind CSS v4.** Small hand-written components, `lucide-react` icons and `sonner` toasts. There is no component library, to keep the bundle and the scope small.

### Four layers inside the monolith

```
Presentation   src/app/**/page.tsx, src/components/**     React UI (server + client components)
     │  fetch /api/...                 (server components call services directly)
Controllers    src/app/api/**/route.ts → src/server/controllers/*.controller.ts
     │         route files are one-liners: withErrors(withAuth(controller.fn))
     │         controllers parse/validate (zod) the HTTP request and shape the response, nothing else
Services       src/server/services/*.service.ts
     │         business rules: authorize(role, action), optimistic versioning (409),
     │         import/export (via src/server/lib/convert.ts), mock session
Repositories   src/server/repositories/*.repository.ts
               the only code that touches Prisma → Postgres (Supabase)

Cross-cutting  src/server/middlewares/  with-errors (typed errors → JSON + HTTP status), with-auth (401)
               src/middleware.ts        edge redirect to /login for pages (UX only; the server re-checks)
Shared domain  src/lib/                 access rules, errors, zod schemas, editor schema (no framework code)
```

**Example request:** `PATCH /api/documents/:id`
1. The route calls `withErrors(withAuth(documentController.update))`.
2. The controller validates the body with zod.
3. `documentService.update` calls `authorize(user, doc, "edit")`.
4. `documentRepository.updateIfVersion` writes only if the row is still at the expected version. If nothing changed, the service raises `ConflictError`, which `withErrors` turns into a 409.

**Why layers in an app this size:** each layer can be tested and replaced on its own. For example, real auth only replaces `session.service.ts`, and moving off Prisma only touches the repositories. A reviewer can also find any rule in one predictable place.

**Branching:** GitHub flow. Small stacked `feat/*` PRs go straight into `main`, and Vercel deploys `main` and builds a preview for each PR. A `development` branch would only add a promotion step with no extra environment behind it, for a one-person project.

## Key decisions

| Decision | Why | Trade-off |
| --- | --- | --- |
| Store **Tiptap JSON** (`jsonb`), not HTML | Structure round-trips exactly; no HTML to sanitize on read | Markdown/HTML are derived on export |
| **One access module** (`src/lib/access.ts`): `resolveRole` plus a permission matrix | Every route calls `assertCan(role, action)`; one place to read and test (`tests/access.test.ts`) | Roles are per document, not per team or folder |
| **404 for no access**, 403 for insufficient role | You can't probe document ids for existence | — |
| **Optimistic concurrency** (`version` column, `updateMany where version = baseVersion`) | Two editors can't silently overwrite each other. The user picks *Load theirs* or *Keep mine*. | Not real-time merging. The last saver has to resolve. |
| **Debounced autosave, one request in flight** | Feels like Docs, and saves never race each other | ~800 ms window where a crash loses edits (a `beforeunload` warning covers navigation) |
| **Mock auth**: seeded users, signed HTTP-only JWT cookie (`jose`) | Reviewers can test sharing across 3 accounts in seconds | No passwords. Real auth would only replace `server/session.ts` and the login page. |
| Import creates a **new document** | Clearest product behaviour; no merge semantics | No "insert into existing doc" yet |
| Imported HTML goes through **sanitize-html** before parsing | `.md` can contain raw HTML; `.docx` can carry odd markup | Unsupported formatting (tables, images) is dropped |
| Typed domain errors, mapped to HTTP in one place (`server/middlewares/with-errors.ts`) | Consistent `{error:{code,message}}` responses; the UI shows `message` as-is | — |

## Validation and error handling

- **Server:** zod validates every request body. Titles must be 1–200 characters. Content must be a `doc` envelope of at most about 1 MB. Share requests need a valid email and role. Uploads are checked for extension, size (2 MB), emptiness and corrupt `.docx`. Errors return 400, 401, 403, 404, 409, 413 or 415 as appropriate. Unexpected errors are logged and return a generic 500.
- **Client:** the same checks run up front for instant feedback. Toasts show server messages. The save indicator shows *Saved*, *Saving…*, *Unsaved changes*, *Save failed — retry* or *Conflict*. Viewers get a read-only editor with no toolbar. Empty titles revert to the last saved title.

## Deliberately out of scope

- **Real-time co-editing (CRDT/OT, cursors).** This is the biggest jump in complexity and needs Yjs and a websocket server. Optimistic versioning gives safety now; the upgrade path is Yjs with `y-prosemirror`, storing a Yjs update blob next to the JSON.
- **Real authentication and invites to unknown emails.** You can only share with existing users.
- **Comments, suggestions, version history, images and tables in the editor, PDF export.**
- **Folders, search, trash/restore.** Delete is permanent (with a confirm prompt).

## With another 2–4 hours

1. **Version history** (about 1 h): snapshot to a `document_versions` table every N saves, plus list and restore. The version column already exists.
2. **Presence indicator** (about 45 min): heartbeat endpoint and a `last_seen` table, showing who else has the doc open. It would make conflicts rarer.
3. **Integration tests** against a throwaway Postgres for the API routes, especially the 409 path, plus a Playwright happy-path test.
4. Rename and delete from the dashboard, plus a **document search** box.
