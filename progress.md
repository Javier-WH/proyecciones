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
- 2026-05-05 — backend/schedule — **Fase C**: added fine-grained atomic socket actions: `schedule:toggleFreeze`, `schedule:moveToStaging`, `schedule:returnFromStaging`, `schedule:clearStaging`, `schedule:changeClassroom`, `schedule:dropEvent`. Each is a versioned `applyAction` mutator with broadcast; replaces the need for full-snapshot `schedule:setState` for these operations. Frontend adoption is incremental — legacy `setState` remains as escape hatch. — files: `backend/src/backEnd/socket/scheduleHandlers.js`
- 2026-05-05 — backend/schedule — **Fase B**: ported auto-solve and post-processing pipeline to backend. Created `backend/src/backEnd/schedule/engine/autoSolve.js` (~700 LOC) with `selfHealLockedSections`, `runAutoSolve` (pass-2 backtracking + pass-3 swap displacement with 1-level cascade, 800-attempt cap, left-compaction), `removePhantomEvents`, `enforceFrozenSections`, `getEventId`. The `schedule:regenerate` handler now runs the full pipeline (self-heal → load restrictions → cross-quarter ghosts → initial gen → auto-solve → phantom cleanup → frozen enforcement) inside a single `applyAction`. — files: `backend/src/backEnd/schedule/engine/autoSolve.js`, `backend/src/backEnd/schedule/engine/index.js`, `backend/src/backEnd/socket/scheduleHandlers.js`
- 2026-05-05 — frontend/schedule — **Fase A**: the giant generation `useEffect` in `SchoolSchedule.tsx` now dispatches `schedule:regenerate` to the backend whenever `scheduleConnected && proyectionId`, and returns early. Local generation remains as the offline-only fallback. Added `scheduleConnected` to the effect's dependencies so regeneration fires on reconnect. — files: `src/components/SchoolSchedule/SchoolSchedule.tsx`
- 2026-05-04 — backend/schedule — Foundation for backend-driven schedule sync: ported `fucntions.tsx` (1749 LOC) to `backend/src/backEnd/schedule/engine/` (ES modules with JSDoc), ported `crossQuarterGhost.ts`, added `stateService.js` (optimistic-locked writes via `applyAction` + `schedules.version/staged/state_snapshot` columns with additive migration `addScheduleVersionAndState.js`), registered `scheduleHandlers.js` socket actions (`schedule:join|leave|getState|regenerate|setState|saveOverride|deleteOverride|deleteAllOverrides`), added minimal frontend hook `useScheduleSocket.ts`, added `npm run test:backend` wired to `node:test`. Engine smoke tests 7/7 pass. — files: `backend/src/backEnd/schedule/engine/**`, `backend/src/backEnd/schedule/stateService.js`, `backend/src/backEnd/schedule/stateTypes.js`, `backend/src/backEnd/socket/scheduleHandlers.js`, `backend/src/backEnd/socket/socket.js`, `backend/src/backEnd/index.js`, `backend/src/backEnd/dataBase/alters/addScheduleVersionAndState.js`, `backend/src/backEnd/dataBase/models/schedule/schedule.js`, `src/hooks/useScheduleSocket.ts`, `package.json` — commits: `852efda` (engine port), pending (infra+hook)
- 2026-05-11 — backend/schedule — **Backend-driven regenerate + restriction sync gaps**: (1) `schedule:regenerate` now loads ALL data (subjects, classrooms, teachers, config) from DB instead of requiring client payload. Added imports for `Proyections`, `Classrooms`, `ClassroomOverrides`, `getTeacherList`. (2) Classroom override handlers (`saveOverride`, `deleteOverride`, `deleteAllOverrides`) now write directly to `classroom_overrides` DB table and trigger `recalcSchedulesForProyection`, eliminating the in-memory snapshot divergence. (3) `ScheduleConfigModal` now dispatches `schedule:saveConfig` via socket after saving, so config changes propagate to all connected clients. (4) Updated stale frontend comments to reflect backend-driven architecture. — files: `backend/src/backEnd/socket/scheduleHandlers.js`, `src/components/SchoolSchedule/ScheduleConfigModal.tsx`, `src/components/SchoolSchedule/SchoolSchedule.tsx`
- 2026-05-13 — frontend/schedule — **Frozen section move recalculation (fix 4 - final)**: Fixed outbound sync to send `lockedSections`, modified `pinDraggedEventsAndRecalculate` to update `lockedSections` locally when moving within frozen section, and now saves `lockedSections` to DB before triggering `schedule:regenerate`. This ensures backend loads correct frozen positions from DB and excludes them from recalculation, only regenerating unfrozen sections around the new frozen positions. — files: `src/components/SchoolSchedule/SchoolSchedule.tsx`
- 2026-05-14 — frontend/socket — **Removed automatic `reload` on socket connect**: The `reload` event in `socket.on('connect')` forced the backend to recalculate all 3 trimestres on every browser refresh, causing long load times. Since schedule state is now persisted in `schedules.state_snapshot` and fetched on-demand via `schedule:join`, the `reload` is unnecessary and counter-productive. — files: `src/context/mainContext.tsx`
- 2026-05-14 — frontend/schedule — **Frozen-section classroom change: Happy Path vs Sad Path**: When changing the classroom of a subject in a frozen section, the system now distinguishes between (1) conflicts with unfrozen sections (Happy Path → recalculate schedule) and (2) conflicts with frozen sections (Sad Path → show error, mark red border, do NOT recalculate). Previously it always recalculated regardless of who owned the conflicting event. — files: `src/components/SchoolSchedule/SchoolSchedule.tsx`
- 2026-05-14 — frontend/backend — **Fixed MySQL deadlock in frozen_sections**: Two code paths were writing to `frozen_sections` simultaneously: (1) socket handlers (`schedule:toggleFreeze`) that manage persistence atomically, and (2) legacy HTTP bulk-save (`saveLockedSections`) triggered by a debounced `useEffect` in `mainContext.tsx` and `pendingLockedSectionSaves` in `SchoolSchedule.tsx`. Added `socket?.connected` guard to both frontend effects so they skip the legacy HTTP path when the backend-driven socket is active. — files: `src/context/mainContext.tsx`, `src/components/SchoolSchedule/SchoolSchedule.tsx`
- 2026-05-14 — backend/schedule — **Scoped recalc in `schedule:toggleFreeze` + retry**: Refactored `scheduleService.js` to extract `recalcSingleTrimestre` from `recalcSchedulesForProyection`. `schedule:toggleFreeze` now recalculates ONLY the affected trimestre (extracted from the `sectionKey`) instead of all three, and runs the recalc in the background so the client ack is immediate. Added exponential-backoff retry (max 3) on `VERSION_CONFLICT`. This eliminates the cascade of version conflicts when users rapidly toggle freeze/unfreeze. — files: `backend/src/backEnd/schedule/scheduleService.js`, `backend/src/backEnd/socket/scheduleHandlers.js`
- 2026-05-14 — frontend/schedule — **Fix frozen-section Happy Path false Sad Path**: Three bugs fixed in the frozen-section classroom change flow. (1) `handleChangeClassroom`: cross-quarter ghost events in `eventsToCheck` caused false positives in the Happy/Sad Path analysis, making `hasConflictWithFrozenSection` true when only one frozen section existed. Also, events from the same section were incorrectly counted as "frozen section conflicts". (2) `handleDrop`: the conflict check showed errors for ALL conflicts even when the frozen section had a Happy Path (conflict with unfrozen section). Now differentiates: Sad Path (conflict with another frozen section → error, block) vs Happy Path (conflict with unfrozen section → proceed, recalculate). (3) `handleChangeClassroom`: removed premature `applyClassroomChangeAndRecalculate(false)` call before Happy/Sad Path determination, which showed success message before knowing the outcome. — files: `src/components/SchoolSchedule/SchoolSchedule.tsx`
- 2026-05-14 — frontend/sync — **Fix inbound/outbound hash mismatch causing infinite `schedule:setState` loop**: The inbound sync computed `lastSyncedHashRef` from `{eventData, classroomOverrides}` while the outbound sync compared against `{eventData, classroomOverrides, lockedSections}`. The hashes NEVER matched, causing the outbound sync to continuously push `schedule:setState` back to the backend. This buried the correct recalculated state from the backend and required a manual browser refresh to see the correct schedule. Fixed by (a) unifying the hash computation to include all three fields, (b) computing it AFTER all state updates in the inbound sync, (c) syncing `classroomOverrides` from the backend state, and (d) clearing `hasUnsavedOverrides` on inbound sync. — files: `src/components/SchoolSchedule/SchoolSchedule.tsx`
- 2026-05-14 — frontend/schedule — **Fix drag-and-drop not updating classroomId in classroom view**: The `handleDrop` function never updated `classroomId` when the user dragged an event to a different classroom cell in classroom view (`viewMode === "classroom"`). The event kept its original classroom, so `toggleFreeze` saved the old classroom to `frozen_sections`, and the backend recalc returned it to the old classroom. Fixed by computing `effectiveClassroomId` from `targetEntityId` in classroom view and using it in conflict checks, patches, and overrides. — files: `src/components/SchoolSchedule/SchoolSchedule.tsx`
- 2026-05-14 — backend/schedule — **Optimización #1: Cache del contexto de recálculo**: `loadRecalcContext` hacía 7 queries por recálculo. Ahora los datos estáticos (subjects, classrooms, teachers, config, restricciones) se cachean con TTL de 5 min. Solo se refrescan `lockedSections` y `classroomOverrides` (2 queries). Se invalida explícitamente en `saveConfig`, `saveTeacherRestrictions`, `saveSubjectRestrictions`. — files: `backend/src/backEnd/schedule/scheduleService.js`, `backend/src/backEnd/socket/scheduleHandlers.js`
- 2026-05-14 — backend+frontend/schedule — **Optimización #2: Broadcast por delta en vez de snapshot completo**: En cada recálculo se computa la diferencia (`added`/`removed`/`changed`) entre el `eventData` viejo y nuevo. Si el delta es ≤30% del total de eventos, se envía solo el delta en vez de los ~842 eventos completos. El frontend (`useScheduleSocket.ts`) aplica el delta si la versión es contigua, con fallback al snapshot completo. Para un cambio de aula típico: ~12 eventos en vez de ~842. — files: `backend/src/backEnd/schedule/scheduleService.js`, `src/hooks/useScheduleSocket.ts`
- 2026-05-21 — frontend/schedule — **Fix staging drag/drop hour loss/duplication**: In `processStagingDrop`, only remove staged originals that were actually placed; if a destination already has the same subject/section, the corresponding hour remains in staging instead of disappearing. In `handleDropBetweenCells`, destination occupants are moved to staging and duplicate target IDs are filtered before appending moved events. — files: `src/components/SchoolSchedule/SchoolSchedule.tsx`
- 2026-05-21 — backend/schedule — **Fix missing export after rebase**: After rebase, `scheduleService.js` imported `computeLockedSectionsHash` from `engine/index.js` but the export was missing. Added the export to `engine/index.js` from `autoSolve.js`. — files: `backend/src/backEnd/schedule/engine/index.js`
- 2026-05-25 — frontend/schedule — Renamed the "Nuevo Horario" action to "Recalcular" and changed it to dispatch backend `schedule:regenerate` for the currently selected trimestre, preserving frozen sections via the backend regeneration pipeline. — files: `src/components/SchoolSchedule/SchoolSchedule.tsx`
- 2026-05-25 — frontend/schedule — Show the recalculation loading overlay when unfreezing a section, trayecto, or PNF because `schedule:toggleFreeze` triggers backend recalculation in the background; failures stop the overlay, successful recalcs stop on inbound `schedule:state`. — files: `src/components/SchoolSchedule/SchoolSchedule.tsx`

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

### 2026-05-04 — Backend-driven schedule state (phase 1: infra + engine)
- **Context:** The frontend owned the full schedule state (subjects, staging, locked sections, overrides, generation) and computed everything client-side, which fragmented state across components and prevented multi-client collaboration.
- **Decision:**
  - Port the entire CSP engine (`fucntions.tsx` 1749 LOC + `crossQuarterGhost.ts`) to backend ES modules under `backend/src/backEnd/schedule/engine/` with JSDoc-typed public API (`index.js`).
  - Add a **state service** (`stateService.js`) as the single authoritative writer, using Sequelize transactions + `SELECT … FOR UPDATE` + a monotonic `version` column for optimistic locking. A fresh JSON snapshot (`state_snapshot`) is persisted on every successful mutation; the legacy `schedule` TEXT column stays in sync for backwards compatibility.
  - Schema change is **additive** (`addScheduleVersionAndState.js`) with idempotent `up()` that checks `information_schema` before each `ALTER`. Migration runs automatically at backend startup alongside `checkAndApplyGlobalRestrictions`.
  - Socket transport uses rooms named `schedule:<proyectionId>:<trimestre>`. Envelope: `{ baseVersion, payload }` + ack `{ ok, version | code, message, currentVersion? }`. Every successful mutation triggers a `schedule:state` broadcast to the room.
  - Initial registered actions cover join/leave/getState/regenerate/setState/saveOverride/deleteOverride/deleteAllOverrides. The `schedule:setState` escape hatch lets the frontend push a fully-computed state during the transition before every fine-grained drag/drop/staging action has been ported.
  - Engine state quirk preserved verbatim: the original `backtrackCounter` is module-level mutable state. To keep parity the solver uses a module-level `counter.value`; the state service must serialise generation per room to honour this (CPU-bound generation never yields the event loop mid-solve, so this holds in practice).
- **Consequences:**
  - Frontend `fucntions.tsx` is **not** removed yet. Parity between the two copies must be enforced manually until golden fixtures are captured from the live app and wired into `node:test`. Any algorithmic change MUST land on both files in the same commit.
  - Two follow-up sessions needed: (a) capture golden fixtures + add parity tests; (b) gut `SchoolSchedule.tsx` to use `useScheduleSocket` and port the remaining fine-grained socket actions (`dropBetweenCells`, `moveToStaging`, `returnFromStaging`, `clearStaging`, `confirmOfficialStage`, `toggleFreeze`, `changeClassroom`).
  - `npm run test:backend` is the canonical way to run engine tests; it uses Node's built-in `node:test` runner so no new dependency was installed.

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
