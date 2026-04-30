# progress.md — Persistent Agent Memory

This file is the shared, append-only memory for any coding agent (and any human) working on this repository. It is committed to the repo. The operational protocol that governs how this file is used lives in [`agents.md`](./agents.md).

> **How to use this file**
> - Append, do not rewrite. Older entries may be moved to `## Archive` once they are no longer relevant.
> - Use ISO dates (`YYYY-MM-DD`) for timestamps.
> - Reference files with paths from project root (e.g. `src/components/SchoolSchedule/SchoolSchedule.tsx`).
> - Bugs go to [`docs/TROUBLESHOOTING.md`](./docs/TROUBLESHOOTING.md), not here. This file logs *what happened*, not *what was wrong*.

---

## Task Log

> One-line entries: `YYYY-MM-DD — <scope> — <short summary> — files: <paths> — commit: <hash or none>`

- 2026-04-28 — schedule/staging — Fix block render after staging drop: switched from minute-based offset to slot-index-based offset to handle slot gaps correctly. — files: `src/components/SchoolSchedule/SchoolSchedule.tsx`
- 2026-04-28 — schedule/ghosts — Stop showing ghost events from unrelated PNFs in trimestral views; per-subject overlap check in `buildCrossQuarterGhostEvents` and per-view filters (PNF, professor, classroom). — files: `src/components/SchoolSchedule/crossQuarterGhost.ts`, `src/components/SchoolSchedule/SchoolSchedule.tsx`
- 2026-04-30 — harness — Introduced `agents.md` operational protocol, moved old index to `DOCS_INDEX.md`, created `progress.md`. — files: `agents.md`, `DOCS_INDEX.md`, `progress.md`, `README.md` — commit: `b8ad130`
- 2026-04-30 — business-rules — Consolidated business rules from interrogation (blocks A–H). Rewrote `SCHEDULE_RULES.md` in English. Updated `agents.md` §7 with complete non-negotiable invariants. — files: `SCHEDULE_RULES.md`, `agents.md`, `progress.md` — commit: `6be0345`
- 2026-04-30 — docs — Translated `ESTRUCTURA_APP.md` and `database_schema.md` from Spanish to English. — files: `ESTRUCTURA_APP.md`, `database_schema.md` — commit: `5b88c07`

---

## Design Decisions

> Short decision records: context → decision → consequences.

### 2026-04-30 — Multi-agent harness layout
- **Context:** The repository had a single `agents.md` acting as a documentation index. The team wants to operate with multiple coding agents (Cascade, Cursor, Claude Code, Codex CLI, Copilot Workspace) and needs a single source of truth for what agents may and may not do.
- **Decision:**
  - `agents.md` becomes the **operational protocol** (English, agent-agnostic).
  - The previous index content is preserved as `DOCS_INDEX.md`.
  - `progress.md` is the persistent memory; bugs continue to live in `docs/TROUBLESHOOTING.md`.
  - All new documentation is written in English.
- **Consequences:**
  - Any future agent must read `agents.md` before acting.
  - Existing Spanish docs remain valid until substantially edited; at that point they are translated.
  - Identifiers continue to follow project conventions (PascalCase for components/types/files of components; camelCase for variables, functions, and util/hook/fetch files).

### 2026-04-30 — Business rules consolidation
- **Context:** The original `SCHEDULE_RULES.md` covered the two-stage architecture and drag-and-drop, but lacked authoritative definitions of domain entities (PNF, trayecto, sección, turno), subject taxonomy (quarter fields, `isSemestral`, `linkedToSection`), teacher and classroom rules, and the calendar overlap model. An 8-block interrogation with the user produced the missing rules.
- **Decision:**
  - `SCHEDULE_RULES.md` is now the single source of truth for schedule semantics, written in English, organized in 11 sections (glossary, calendar, subjects, teachers, classrooms, generation, locked sections, stage independence, conflicts, persistence, update policy).
  - `agents.md` §7 carries an extracted **non-negotiable invariants** subset for fast agent reference; full detail stays in `SCHEDULE_RULES.md`.
  - The `isSemestral` flag and the trimester-native data model (`q1/q2/q3`) are explicitly documented as **retrofitted**, so future agents know the model is brittle around semestral subjects.
- **Consequences:**
  - Any code touching `SchoolSchedule/`, `crossQuarterGhost.ts`, or `backend/src/backEnd/schedule/` must verify against §2 (calendar) and §7 (locked sections) before merging.
  - The legacy "save schedule" feature is recorded as **being deprecated**; agents should not rely on it for correctness.

### 2026-04-28 — Slot-based offset for staging drops
- **Context:** Schedule slots can include gaps (e.g. break between `10:10` and `10:15`). A minute-based offset produced new event times that did not match any slot, so `buildGrid` could not align rows.
- **Decision:** Use slot indices (positions in `tableSlots`) to compute the offset when dropping a block from staging.
- **Consequences:** Drops now respect gap structure; the rule generalizes to any non-uniform slot grid.

### 2026-04-28 — Cross-quarter ghost overlap rule (per-subject)
- **Context:** Ghost events from other trimesters were leaking into PNF/professor/classroom views even when no real conflict existed, because the relevance check was a global aggregate (`hasSemestralInActiveTrimestre`).
- **Decision:** Compute relevance **per-subject** in the active trim and additionally filter ghosts at the view layer by shared classroom/professor and per-context overlap.
- **Consequences:** The canonical period rules are now respected end-to-end:
  - Trim1 ↔ only Sem1.
  - Trim2 ↔ Sem1 and Sem2.
  - Trim3 ↔ only Sem2.
  - Trimesters never overlap with each other.
  - Two semesters never overlap (even when they share T2).

---

## Open TODOs

> Things not finished. Each item: scope, what is missing, where to resume.

- [ ] **Test infrastructure** — No test runner is installed yet. Per `agents.md` §5, the next critical-code change must propose Vitest (frontend) or `node:test` (backend) and create a minimal regression suite. _Resume from:_ `agents.md` §5.2.
- [x] **Business rules audit** — Done on 2026-04-30. `SCHEDULE_RULES.md` rewritten in English; `agents.md` §7 carries the non-negotiable invariants. Open follow-ups are tracked under "Open Hypotheses / Stale Docs".
- [ ] **Doc translation backlog** — `ESTRUCTURA_APP.md` and `database_schema.md` translated (2026-04-30). Most files under `docs/` are still in Spanish. Translate opportunistically when touched (per `agents.md` §6.3).

---

## Open Hypotheses / Stale Docs

> Things you are unsure about, or docs known to be outdated. Add what you know and what would confirm/deny the hypothesis.

- **Semestral home-quarter inference** — `crossQuarterGhost.ts#getSubjectPeriod` infers a semestral subject's home quarter from the first non-zero `hours[qN]`. This works today because the curriculum encodes Sem1 in `q1` (or `q1+q2`) and Sem2 in `q2`/`q3`. If the convention drifts (e.g. a Sem2 starting at `q1`), the model will misclassify. _Confirms/denies:_ inspect a real subject of each kind in production data; verify all semestral subjects respect the assumed convention.
- **Linked-section hour dedup** — Per §3.4 of `SCHEDULE_RULES.md`, hours of `linkedToSection = true` subjects must NOT be duplicated for the teacher. Verify that `generateScheduleEvents` and the schedule view collapse the merged sections into a single block (no double-count). _Resume from:_ `src/components/SchoolSchedule/fucntions.tsx`.
- **"End-of-turn" classroom flag** — Subjects in classrooms marked end-of-turn should be scheduled at the end of the turn. Confirm whether `generateScheduleEvents` already implements this preference or if it is only enforced visually.
- **Auto-resolve cap** — No explicit cap on the auto-resolve algorithm's attempts is documented. Verify whether the implementation has a timeout / iteration cap, especially given the low-spec PCs at the university.
- **Save schedule feature** — Currently described as being deprecated. Decide soon whether to remove the code paths or keep them dormant; conflicts with the rule that frontend and backend must always be in sync.

---

## Archive

> Move older Task Log / Design Decisions here once they are no longer relevant for ongoing work. Do not delete.

_(empty)_
