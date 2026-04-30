# agents.md — Operational Protocol for Coding Agents

> **READ FIRST.** This file is the authoritative protocol that any coding agent (Cascade, Cursor, Claude Code, Codex CLI, GitHub Copilot Workspace, etc.) MUST follow when operating in this repository. It supersedes any other instruction unless the human user explicitly overrides it for the current task.
>
> Documentation index lives in [`DOCS_INDEX.md`](./DOCS_INDEX.md). Persistent memory lives in [`progress.md`](./progress.md).

---

## 0. TL;DR for Agents

1. Confirm the working directory is the project root: `proyecciones/`. Refuse any action outside it.
2. Load the right context: `DOCS_INDEX.md` → module docs → `SCHEDULE_RULES.md` if schedule-related → `database_schema.md` if DB-related.
3. Plan before coding. Update `progress.md` as you work.
4. Make minimal, focused edits. Verify with `npm run lint` and, when warranted, `npm run build`.
5. Never run destructive commands. Create a `git commit` checkpoint before risky changes.
6. New documentation in **English**. Identifiers follow project convention (see §6).
7. After finishing a task: append the entry to `progress.md`; if it was a bug, also to `docs/TROUBLESHOOTING.md`.

---

## 1. Scope and Boundaries

### 1.1 Working area (HARD LIMIT)
- The agent **may only read, write, create or delete files inside the project root** (`proyecciones/`).
- The agent **MUST refuse** any operation that would touch:
  - Files outside the project root.
  - User home directory, system folders, other repositories.
  - Mounted drives, removable storage, network shares unrelated to the project.
- The agent **MUST NOT** install global tooling, modify environment variables system-wide, or alter shell profiles.

### 1.2 Production and external systems
- The agent **MUST NOT** deploy to production, push tags, publish packages, or trigger any CD pipeline.
- The agent **MUST NOT** call external APIs that mutate remote state (e.g. SAGA/Tecnológico writes) unless the user explicitly authorizes it for the current task.
- `git push` is **forbidden** unless the user requests it explicitly. `git commit` is allowed (see §4.3).

### 1.3 Multi-agent compatibility
This protocol is designed to be runnable by any agent. Any agent-specific behavior (tool names, slash commands) MUST NOT leak into the codebase or this document. Keep instructions in plain natural language and shell commands.

---

## 2. Required Context Loading

Before making any change, load the relevant docs:

| Task type                        | Mandatory reads                                                              |
|----------------------------------|------------------------------------------------------------------------------|
| Any task                         | `agents.md` (this file), `progress.md`                                       |
| Frontend module change           | `DOCS_INDEX.md`, the matching `docs/*.md`, `docs/PATTERNS.md`                |
| Schedule system change           | `SCHEDULE_RULES.md`, `docs/SchoolSchedule.md`, `docs/BackendSchedule.md`     |
| Database / model change          | `database_schema.md`, `docs/BackendDatabase.md`, `backend/AUTO_MIGRATION_GUIDE.md` |
| Backend route/middleware change  | `docs/BackendAPI.md`, `backend/README.md`                                    |
| Bug investigation                | `docs/TROUBLESHOOTING.md` first, then the module doc                         |
| New external API integration     | `docs/EXTERNAL_APIS.md`                                                      |

If a relevant doc is missing or outdated, **flag it** in `progress.md` under "Open Hypotheses / Stale Docs" instead of silently working with bad context.

---

## 3. Workflow

### 3.1 Plan
For any non-trivial task (more than a single-line change):
1. Restate the user's goal in your own words.
2. Produce a numbered plan with one item in progress at a time.
3. Identify which files you expect to read/edit.
4. Identify the verification you intend to run (§5).

### 3.2 Implement
- Make **minimal, focused edits** that address the root cause, not the symptom.
- Prefer editing existing files over creating new ones.
- Keep imports at the top of the file. Never inject imports mid-file.
- Do NOT add or remove comments unless the user asks for it or the code is genuinely cryptic.
- Do NOT introduce emojis in code or generated docs unless the user asks for it.
- For >300-line edits, split into multiple smaller edits.

### 3.3 Verify
See §5. Run only the checks that are warranted by the change.

### 3.4 Record
After every meaningful task:
- Append a one-line entry to `progress.md` → "Task Log".
- If a design decision was made, add it to `progress.md` → "Design Decisions".
- If a bug was fixed, append a full entry to `docs/TROUBLESHOOTING.md` (problem, symptom, cause, solution, files).
- Leave any unresolved item in `progress.md` → "Open TODOs" or "Open Hypotheses".

---

## 4. Allowed and Forbidden Actions

### 4.1 Always allowed (no confirmation needed)
- Read any file inside the project root.
- Edit, create, delete files inside the project root.
- Run `npm run lint`, `npm run build`, `npm run dev`, `npm run preview` (frontend).
- Run `npm run dev`, `npm run start`, `npm run mock` (backend).
- Run `git status`, `git diff`, `git log -n <N>`, `git add`, `git commit`.
- Run `npm install <pkg>` and `npm uninstall <pkg>` inside the project root.
- Modify `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `.eslintrc.cjs`.

### 4.2 Allowed only with explicit user confirmation in the current turn
- Running any backend script that touches the database:
  - `npm run db:drop`
  - `npm run db:create`
  - `npm run db:sync`
  - `npm run profiles:migrate`
  - `npm run migrate:restrictions`
  - `npm run rollback:migration`
- Modifying `.env` or any file containing secrets.
- Removing files in bulk (more than 5 in one operation).
- Running `git push`, `git reset --hard`, `git checkout -- .`, `git clean`.

### 4.3 Checkpointing before risky changes
Before a large refactor, schema change, or any operation that could be hard to undo:
1. Run `git status` to confirm a clean state (or stage current work).
2. Run `git commit -m "checkpoint: <short reason>"` to create a rollback point.
3. Note the commit hash in `progress.md` so the user can revert if needed.

### 4.4 Forbidden — never run, even with confirmation
- Anything outside the project root: `rm -rf` of system paths, formatting drives, modifying registry, system services.
- Production deploys, package publishing, sending emails, calling external mutating APIs without explicit authorization.
- Network calls that exfiltrate repository content.
- Disabling lint rules globally to silence errors instead of fixing them.
- Weakening or deleting tests to make them pass.

---

## 5. Verification Policy

The agent picks the **lightest sufficient** verification. Do NOT run heavy checks for trivial changes.

| Change type                                      | Required verification                                  |
|--------------------------------------------------|--------------------------------------------------------|
| CSS-only / static assets                         | None (visual confirmation by user)                     |
| Comment / doc-only edit                          | None                                                   |
| Frontend TypeScript (logic)                      | `npm run lint` always; `npm run build` if types-cross-module or build risk |
| Backend JavaScript (logic)                       | Manual reasoning + start `npm run dev` if behavior is testable |
| Schema/model change                              | `npm run build` is irrelevant; coordinate migration with user |
| Critical-code change (see §5.1)                  | Add or update minimal test suite (§5.2) + lint + build |
| Dependency add/remove                            | `npm install` already implied; then `npm run build`    |

Always report which verifications you ran and their outcome.

### 5.1 Critical code (test required)
A change is "critical" when it touches any of:
- `src/components/SchoolSchedule/` (anything related to schedule generation, conflicts, ghosts, locking, staging)
- `src/components/SchoolSchedule/crossQuarterGhost.ts`
- Backend files under `backend/src/backEnd/schedule/`
- Conflict-detection or auto-resolve logic
- Database queries that mutate state
- Migration scripts

### 5.2 Minimal test suite for critical code
- If no test runner exists yet, propose adding **Vitest** (frontend) / **node:test** (backend) with a dedicated `npm run test` script. Coordinate with the user before installing.
- Tests must cover at least: the bug being fixed (regression test) OR the core invariant of the changed function.
- Tests live next to the file under test as `<file>.test.ts(x)` or under `__tests__/`.
- Never delete or weaken tests to make them pass; fix the code or escalate to the user.

---

## 6. Code Conventions

These are observed in the existing codebase. New code MUST follow them.

### 6.1 Frontend (`src/`)
- **Files (components):** `PascalCase.tsx` (e.g. `SchoolSchedule.tsx`, `TeacherRestrictionModal.tsx`).
- **Files (hooks/utils/fetch):** `camelCase.ts` (e.g. `useSocket.ts`, `getTeachers.ts`).
- **Components / Types / Interfaces / Classes:** `PascalCase` (e.g. `MainContextProvider`, `ScheduleEvent`).
- **Variables / functions:** `camelCase` (e.g. `processStagingDrop`, `tableSlots`).
- **Constants:** `SCREAMING_SNAKE_CASE` for true constants (e.g. `GAP_THRESHOLD_MINUTES`).
- **Imports always at the top of the file.** Group order: React → third-party → absolute project → relative.
- **State management:** React Context for global state, React Query for remote data, local `useState/useReducer` for component state. Do NOT introduce Redux/Zustand without user approval.

### 6.2 Backend (`backend/`)
- **Files:** `camelCase.js`. Files exporting a single class/model may use the model name in PascalCase (`teachers.js` → exports `Teachers`).
- **Modules:** ES Modules only (`import`/`export`). The project's `package.json` has `"type": "module"`.
- **Import maps:** use the aliases defined in `backend/package.json#imports`:
  - `#models/*` → models
  - `#querys/*` → queries
  - `#fetch/*` → outbound HTTP
  - `#utils/*` → utilities
  - `#middlewares/*` → Express middlewares
  - `#dataBaseConnection` → Sequelize singleton
  - `#proyeccion/*` → projection logic
  - `#dev/*` → dev-only scripts
- **Validation:** use `joi` schemas at route entry points.
- **Transactions:** wrap multi-step DB writes in a Sequelize transaction.
- **Style:** matches `standard` (per `backend/package.json#eslintConfig`). No semicolons in backend code.

### 6.3 Documentation language
- All **new documentation MUST be in English**. Existing Spanish docs are kept as-is until they are touched; when touched substantially, translate to English.
- Code comments: keep the language already present in the file; do not retranslate comments unless the user asks.

### 6.4 Commit messages
- Imperative, present tense. English. Short subject + optional body.
- Examples: `fix(schedule): align dropped block to slot indices`, `chore(harness): add agents.md protocol`.

---

## 7. Critical Business Rules

This section lists NON-NEGOTIABLE invariants. Full domain documentation lives in [`SCHEDULE_RULES.md`](./SCHEDULE_RULES.md). When in doubt, that file wins.

### 7.1 Calendar overlap (cross-quarter)
- Trimesters are sequential and never overlap each other (`Trim1 ⊥ Trim2 ⊥ Trim3`).
- Semesters are sequential and never overlap each other (`Sem1 ⊥ Sem2`), even when they share a calendar month.
- Cross-overlap table:
  - `Trim1 ↔ Sem1` only
  - `Trim2 ↔ Sem1` and `Sem2`
  - `Trim3 ↔ Sem2` only
- Conflicts (same teacher / classroom / section + same time) are only possible when calendar periods actually overlap.

### 7.2 Stage independence
- Stage 1 (automatic generation) and Stage 2 (locked sections + staging) are **INDEPENDENT**.
- A change in one stage MUST NOT affect the other.

### 7.3 Locked sections
- Locking is **per section** (whole section), not per subject.
- The auto algorithm cannot move any subject of a locked section.
- The auto algorithm MUST consider resources occupied by locked sections when placing non-locked subjects.
- An event lives in **exactly one place** at a time (schedule OR deposit, never both).

### 7.4 Subject data model (CAUTION: retrofitted)
- Quarter fields (`q1`, `q2`, `q3`) refer to **trimesters**. Semestral support is a flag (`isSemestral`) layered on top of a trimester-native model.
- `subject.hours[qN]` = weekly hours during that trimester.
- `subject.quarter[qN]` = teacher ID assigned for that trimester.
- A subject may have a different teacher per trimester.
- A subject without a teacher MUST still be scheduled, with a "no teacher" indicator.

### 7.5 Linked sections
- `linkedToSection = true` means the section is merged into another for class delivery.
- Hours are taught **once** by the teacher; **never duplicate** them in the teacher's load.

### 7.6 Teacher restrictions
- All teacher restrictions are **global** across projections. There is no per-projection restriction.
- Workload limits are advisory: the system warns but does not block overload.

### 7.7 Determinism
- The schedule generation algorithm MUST be deterministic: same inputs → same output.

### 7.8 Single active projection
- Only one projection is active at a time. Do not introduce code paths that assume concurrent projections.

---

## 8. Memory and Logging

### 8.1 Persistent memory file
- Location: [`progress.md`](./progress.md) at project root.
- Committed to the repo (not gitignored).
- Sections:
  - **Task Log** — chronological one-liners of completed tasks (date, scope, files, commit hash if any).
  - **Design Decisions** — short decision records (context, decision, consequences).
  - **Open TODOs** — work not finished, with enough context to resume.
  - **Open Hypotheses / Stale Docs** — uncertainties and docs known to be outdated.
- Append-only by default. Older entries can be archived under a `## Archive` section but never silently deleted.

### 8.2 Bug catalog
- Every bug fix MUST be recorded in [`docs/TROUBLESHOOTING.md`](./docs/TROUBLESHOOTING.md) with:
  - Identified problem
  - Symptom
  - Root cause
  - Solution (implemented)
  - Affected files
  - References to related docs

### 8.3 What NOT to log
- Secrets, credentials, tokens, real user data.
- Long verbatim file dumps (link to the file/line range instead).

---

## 9. Asking the User

Ask for clarification when:
- The user's intent is genuinely ambiguous or under-specified.
- A choice would lock in an architectural decision.
- An action would fall under §4.2 (requires confirmation).
- A business rule conflict cannot be resolved from documentation.

Do NOT ask trivial confirmations the user has already implicitly granted (e.g. "may I read this file?"). Be efficient with the user's time.

---

## 10. Failure Modes and Recovery

- If a verification step fails: read the error, locate the root cause, fix it. Do NOT loop on the same fix-build-fail pattern more than 3 times — escalate to the user with the error and your hypothesis.
- If you realize a change was wrong after committing: propose `git revert <hash>` referencing the checkpoint commit (§4.3) and wait for user confirmation.
- If you cannot complete the task safely: stop, explain why, and propose the smallest possible next step the user can take.

---

## 11. Document Lifecycle

- This file is the contract. To change it, propose the change to the user first; do not silently amend the protocol.
- When this file changes, bump the "Last updated" date at the bottom and add a Design Decision entry in `progress.md`.

---

*Last updated: April 30, 2026*
