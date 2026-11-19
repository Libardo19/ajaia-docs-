# Submission: Ajaia Docs

## Links

- **Live app:** https://ajaia-docs-dusky-nine.vercel.app
- **Walkthrough video:** in [`VIDEO_URL.txt`](VIDEO_URL.txt)
- **Source:** this folder (also at https://github.com/Libardo19/ajaia-docs-)

## Test accounts

No passwords. Pick a user on the login page and use **Switch** in the header to change accounts.

- `alice@ajaia.test`: owns the shared welcome doc
- `bob@ajaia.test`: editor on Alice's doc
- `carol@ajaia.test`: viewer on Alice's doc

## What's included

| Item | Location |
| --- | --- |
| Source code | `ajaia-docs-source.zip` in the Drive folder (same as the GitHub repo): `src/`, `prisma/`, `tests/`, config files |
| Setup and run instructions | [`README.md`](README.md) |
| Architecture note | [`ARCHITECTURE.md`](ARCHITECTURE.md) |
| AI workflow note | [`AI_WORKFLOW.md`](AI_WORKFLOW.md) |
| Automated tests | `tests/access.test.ts`, `tests/convert.test.ts` (run with `npm test`) |
| Sample import files | `samples/product-brief.md`, `samples/meeting-notes.txt`, `samples/quarterly-planning.docx` |
| Video URL | [`VIDEO_URL.txt`](VIDEO_URL.txt) |
| Screenshots | `screenshots/`: 10 PNGs from a scripted browser walkthrough of the live app |
| In-app explainer | The document "How Ajaia Docs meets the assignment" in the live app, co-written by all three demo users (sign in as Alice) |

## Status

**Working end to end**
- Create, rename, edit, autosave, reopen and delete documents.
- Rich text: bold, italic, underline, strikethrough, H1–H3, bulleted and numbered lists, quotes, undo/redo.
- Import `.txt`, `.md` and `.docx` (up to 2 MB) as a new document.
- Sharing:
  - the owner grants viewer or editor access, changes roles and revokes access;
  - the dashboard separates owned from shared documents;
  - viewers are read-only, and the server enforces it.
- Persistence in Postgres (Supabase) as structured JSON.
- Conflict protection: optimistic versioning returns 409, and the user chooses which version to keep.
- Export to Markdown (stretch item).

**Partial or intentionally excluded**
- No real-time co-editing or live cursors. Conflicts are detected, not merged.
- Mock authentication with seeded users. You can only share with existing users.
- Imports drop tables and images.
- Tests are unit tests for the domain logic. There are no browser or API integration tests yet.

**Next 2–4 hours:** version history with restore, presence indicators, API integration tests against a throwaway database, and dashboard search plus rename and delete there. Details are in [`ARCHITECTURE.md`](ARCHITECTURE.md#with-another-24-hours).
