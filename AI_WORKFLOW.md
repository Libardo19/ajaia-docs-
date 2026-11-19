# AI workflow note

## Tools

- **Claude Code** (Claude Opus, in the terminal and VS Code) was the main pair programmer. I used it for planning, scaffolding, writing code and tests, and running the build and test loop.
- I used no other AI tools. Library docs (Tiptap 3, Prisma, Next 15) were checked against the installed package types, not taken from memory.

## How I split the work

The brief allows AI tools and sets a 4–6 hour timebox. To ship a full-stack slice that works end to end in that time, I deliberately let Claude Code write most of the implementation. I kept for myself the parts that decide whether the product is any good:

- **Product and scope:** which flows to build in depth and which to cut, and why (see `ARCHITECTURE.md`).
- **Architecture and stack:** a single Next.js app, Supabase Postgres with Prisma, mocked seeded users, and the four-layer server (controllers → services → repositories, plus middlewares).
- **UX calls:** conflict handling instead of silent overwrites, Gmail-style sharing suggestions, and view-only mode for viewers.
- **Delivery discipline:** small commits and PRs, review of every change, and stopping the agent when something was unclear.
- **Verification:** nothing was accepted on trust. Every claim in this note was checked with tests, logs or a browser run (see below).

## Where AI materially sped things up

- **Scoping, before any code.** I had it turn the open brief into a time-boxed plan with explicit cuts. Cut: real-time editing and real auth. Kept: optimistic concurrency, so the "no real-time" cut stays safe. I approved the plan before code was written.
- **Boilerplate across layers:** Prisma schema and migration, zod schemas, route handlers, the share dialog and the toolbar. That is about 70% of the lines, written in minutes rather than hours.
- **Import/export conversion.** It wired mammoth, marked, sanitize-html, Tiptap's server-side `generateJSON`/`generateHTML` and turndown together, including the underline rule for Markdown.
- **Test-first checks of the converter.** I asked for tests that assert on the *structure* of the result (node types, marks), not on HTML snapshots.

## What I changed or rejected

- **Rejected copying an existing production pattern wholesale.** I pointed the assistant at a codebase I work on (Express API plus a separate Next front). It proposed reusing that split. I rejected that and kept a single Next app: two deploys add nothing a reviewer would notice. I kept only *ideas* from it: version-checked saves returning 409, sanitizing imported HTML, and typed errors mapped to HTTP in one place.
- **Rejected Supabase RLS.** It was offered as "more secure by design". Without Supabase Auth, RLS would mean minting custom JWTs. Authorization in one tested module (`src/lib/access.ts`) is simpler to audit for this scope.
- **Pushed back on the first server structure.** The first version had route handlers calling one service file that used Prisma directly (3 layers). I had it refactored into four explicit layers: controllers, services, repositories, plus middlewares. That way every rule has one predictable home, and the data access can be replaced without touching business logic.
- **Changed "403 for no access" to 404.** That way document ids can't be probed for existence.
- **Fixed a generated page file** that exported an extra helper component. Next.js page modules can't do that, and it would have failed the build.
- **Dependency choices:** the first install pulled Vitest 5, which conflicts on peer dependencies with the Next 15 toolchain. I pinned Vitest 3 and `@types/node@22` instead of using `--force`.
- **Bug caught by a test, not by eyeballing.** The `.docx` test failed because mammoth drops underline by default. It was fixed with an explicit `styleMap: ["u => u"]`. I would not have caught it from a quick manual import.

## How I verified correctness, UX and reliability

- **Automated:** `npm test` runs 22 Vitest tests:
  - the permission matrix, including the 404 and 403 behaviour;
  - txt/md/docx import keeping headings, lists and marks;
  - XSS stripping;
  - size and type limits;
  - a Markdown round trip.

  `npm run typecheck`, `npm run lint` and `npm run build` are clean.
- **API smoke test against the live deployment** (Vercel and Supabase), run with three accounts using curl and checking every status code:
  - no session returns 401;
  - a viewer trying to edit returns 403, and so does an editor trying to share;
  - an editor saving returns 200;
  - a stale `baseVersion` returns 409, naming who saved;
  - an empty title returns 400;
  - a `.pdf` upload returns 415;
  - `.md` and `.docx` imports return 201;
  - Markdown export returns 200;
  - the dashboard and editor pages return 200.
- **Browser walkthrough on the live app**, scripted with Playwright driving Edge (screenshots are in `screenshots/`):
  - create a doc, rename it and format it (H1, H2, bold, italic, underline, both list types), then reload: the formatting persists;
  - share with Bob as editor and Carol as viewer from the email suggestions;
  - Carol sees the doc under "Shared with me" with a read-only editor and no toolbar;
  - Alice and Bob edit at the same time and Alice gets the conflict banner; "Load their version" brings in Bob's edit;
  - a viewer exports to .md;
  - importing a .docx keeps its headings, lists and marks.
- **A UI bug the walkthrough caught:** the email suggestion list was clipped by the native `<dialog>` (its overflow). Fixed with `overflow-visible`, then re-checked with a screenshot.
- **A deploy-only bug.** The first production deploy returned 500 on every document route. Vercel logs showed `sanitize-html` failing to `require()` the ESM-only `htmlparser2` because I had marked it as an external server package. Local Node tolerated it. Bundling it fixed the problem, and I re-ran the smoke test on production.
- **UX review:** I read through the generated UI states and added the ones that were missing: the save indicator states, an empty-title fallback, an unsaved-changes guard on navigation, Ctrl+S, empty states on the dashboard, and the supported-file-types hint next to the import button.
- **What I did not delegate:** the scope cuts, the access model and the conflict-handling UX were my decisions. I used AI to execute them faster and to argue against them, not to make them.
