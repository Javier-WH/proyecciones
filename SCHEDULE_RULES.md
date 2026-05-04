# Schedule System — Business Rules

This document defines the **business rules** of the schedule system. Any change to the schedule must respect these rules. This is the single source of truth for schedule semantics.

> **For agents:** read this file before any change to `src/components/SchoolSchedule/` or `backend/src/backEnd/schedule/`. The non-negotiable invariants are also summarized in [`agents.md` §7](./agents.md#7-critical-business-rules).

---

## 1. Domain Glossary

| Term | Definition |
|------|------------|
| **Proyección (Projection)** | The university's term for the process of creating sections and assigning teachers to subjects for a given academic period. Only **one projection is active at a time**. |
| **PNF** | *Programa Nacional de Formación* — equivalent to a degree/career (e.g. Computer Engineering, Veterinary Medicine, Public Administration). |
| **Trayecto** | The academic year within a PNF (e.g. "Trayecto 1 of Veterinary Medicine" = first year). A trayecto runs **3 trimesters** (if trimestral) **or 2 semesters** (if semestral). |
| **Sección (Section)** | A class group within a trayecto. When a year has more students than fit in a classroom, multiple sections are created (A, B, C, ...). |
| **Turno (Turn)** | Time-of-day band: morning, afternoon, evening, Saturday-only, or *diurno* (morning + afternoon combined). Turns are fetched from an **external API** and may change over time. |
| **Materia (Subject)** | A course in the curriculum. Can be **trimestral** (default) or **semestral** (retrofitted). |
| **Slot** | A time bucket on the schedule grid (e.g. `07:00–07:45`). Slots are **configurable per projection**, may have **gaps** (institutional breaks). |
| **Bloque (Block)** | One or more consecutive slots assigned to the same subject on the same day. Blocks may legitimately contain gaps when an institutional break falls in the middle. |

A **section** is uniquely identified by the tuple `(PNF, Trayecto, Sección, Turno)` within a projection.

---

## 2. Calendar Model

### 2.1 Period structure
- A trayecto is either **trimestral** (3 trimesters per year) or **semestral** (2 semesters per year).
- Trimesters are sequential: **Trim1 → Trim2 → Trim3**.
- Semesters are sequential: **Sem1 → Sem2**.
- The shared resource pool (teachers, classrooms) forces semestral and trimestral subjects to coexist on the same calendar.

### 2.2 Calendar overlap (CRITICAL INVARIANT)
Because Sem1 ends roughly halfway through Trim2, and Sem2 starts there:

| Period | Overlaps with |
|--------|---------------|
| Trim1  | Sem1 only |
| Trim2  | Sem1 **and** Sem2 |
| Trim3  | Sem2 only |
| Sem1   | Trim1 **and** Trim2 |
| Sem2   | Trim2 **and** Trim3 |

**Rules derived from the table:**
1. Two trimesters **never** overlap with each other (Trim1 ⊥ Trim2 ⊥ Trim3).
2. Two semesters **never** overlap with each other, *even when they share calendar months* (Sem1 ⊥ Sem2).
3. A semester always overlaps with exactly two trimesters; a trimester overlaps with at most one semester.

These rules are implemented in [`src/components/SchoolSchedule/crossQuarterGhost.ts`](./src/components/SchoolSchedule/crossQuarterGhost.ts) (`getSubjectPeriod`, `periodsOverlap`).

### 2.3 Conflict implication
Conflicts (same teacher, classroom, day, slot) are only possible **between subjects whose periods overlap**. Two subjects in non-overlapping periods can share resources without conflict.

---

## 3. Subjects: Data Model and Semantics

### 3.1 Background
The system was built **before AI assistance** when the university only had trimestral subjects. Semestral support was added quickly to print schedules; the data model remains **trimester-native**, with `isSemestral` as a retrofitted flag.

### 3.2 Quarter fields (`q1`, `q2`, `q3`)
Both `subject.quarter` and `subject.hours` are indexed by `q1`, `q2`, `q3`, meaning **trimestre 1, 2, 3**.

- `subject.quarter[qN]` → ID of the teacher assigned to that trimester. A subject **may have a different teacher per trimester**.
- `subject.hours[qN]` → number of **weekly hours** taught during that trimester. E.g. `hours.q1 = 5` means "5 hours per week during Trim1".

### 3.3 The `isSemestral` flag
- A subject with `isSemestral = true` is treated as semestral by the schedule system.
- Convention used by the cross-quarter ghost logic:
  - If hours are concentrated starting at `q1`, the subject is treated as **Sem1** (calendar period {T1, T2}).
  - If hours start at `q2` or `q3`, the subject is treated as **Sem2** (calendar period {T2, T3}).
- The "home quarter" of a semestral subject is the first quarter where `hours[qN] > 0`.

### 3.4 Linked sections (`linkedToSection`)
- A subject with `linkedToSection = true` is a **merged section**: a small section physically taught together with a larger one (same classroom, same teacher, same time).
- **Hours MUST NOT be duplicated** for the teacher: if English is 4h/week and the teacher serves two linked sections at the same time, the teacher's schedule shows **4 hours**, not 8.
- The legal record keeps both sections; the schedule treats them as one.

### 3.5 Per-subject classroom restrictions
- A subject can be restricted to a specific classroom (e.g. Programming → programming lab; Surgery → surgical theater; Sports → court).
- Restrictions can target one classroom or a list of allowed classrooms.

### 3.6 Administrative hours
- The marker `subject.key === "ADMINISTRATIVE_HOURS"` is excluded from schedule generation (it represents non-teaching obligations).

---

## 4. Teachers

### 4.1 Assignment
- A subject has **at most one teacher per trimester or per semester**.
- A teacher may serve **multiple PNFs** within the same projection.
- A subject without an assigned teacher MUST still be placed on the schedule, with a clear "no teacher" indicator.

### 4.2 Restrictions
- Teacher restrictions are **always global** (apply to every projection). There is no per-projection restriction; this is intentional to prevent conflicts.
- Supported restriction types:
  - **Unavailable days** (whole-day restriction)
  - **Unavailable hours per day** (time ranges)
- Hour restrictions on the same day must **not overlap** (validated server-side).

### 4.3 Workload
- The system **shows a warning** if a teacher exceeds an expected weekly load, but it **does not block** the assignment. Overload is informational, not enforced.

---

## 5. Classrooms

### 5.1 Type and capacity
- Classrooms have a **type** (theory, lab, etc.) and a **capacity**, but **the system does not validate either**. The user is responsible for matching capacity and type when assigning subjects.

### 5.2 Per-PNF favorites
- There are **no fixed classrooms per section**. Instead, the user marks classrooms as **favorites for a PNF**, biasing assignment toward those classrooms.

### 5.3 End-of-turn flag
- A classroom can be marked "end of turn". Subjects taught there should be scheduled at the **end** of the turn (e.g. sports — students leave sweaty and would disturb subsequent classes).

### 5.4 Time restrictions
- No per-classroom time restrictions are currently modeled. (Future scope.)

---

## 6. Schedule Generation — Stage 1 (Automatic)

### 6.1 Algorithm
- Implemented in `generateScheduleEvents` (`src/components/SchoolSchedule/fucntions.tsx`).
- Inputs: subjects, teachers, classrooms, restrictions, locked sections, configuration.
- Output: an array of events stored in `eventData`.

### 6.2 Configuration flags

| Flag | Meaning |
|------|---------|
| `conserve_slots` | **Maximum** consecutive slots in a single block. If `3`, the algorithm will not create a block longer than 3 hours. |
| `min_consecutive_slots` | **Minimum** consecutive slots in a block. If `2`, single-hour blocks are forbidden. |
| `distribute_equitably` | When ON, the algorithm tries to spread hours evenly across days. E.g. for a 6h/week subject, prefer `3h + 3h` over `2h + 2h + 2h`. |
| `prevent_single_hour_blocks` | When ON, blocks of exactly 1 hour are avoided. |

### 6.3 Determinism
- The algorithm **MUST be deterministic**: same inputs → same output. No randomness between runs.

### 6.4 Failure handling
- When a subject cannot be placed, the algorithm:
  1. Reports the error in the errors modal listing all unsolved subjects with their cause.
  2. Continues with the next subject (no global abort).
- Result: a **partial schedule** with a list of unresolved errors.

### 6.5 Auto-resolve
- A separate, heavier algorithm tries to place subjects that the conventional pass could not.
- It is kept separate because it is more computationally expensive and the university uses low-spec PCs.
- The user can enable/disable it; default state lives in the UI configuration.

### 6.6 Locked sections during generation
- The algorithm **MUST respect locked sections**: it never moves any subject in a locked section.
- It **MUST consider** the resources occupied by locked sections (their classrooms and teacher hours) when placing the rest.

---

## 7. Locked Sections & Staging — Stage 2 (Manual)

### 7.1 Freezing
- **Granularity:** locking is **per section** (full section), not per individual subject.
- A section can be frozen / unfrozen by the user.

### 7.2 Effects of freezing
- The auto algorithm cannot move any subject of a frozen section.
- The frozen section's resources (classrooms, teacher hours) are **inputs** to the algorithm for non-frozen sections (so it avoids creating conflicts with them).

### 7.3 Official mode and staging area
- The "Official mode" button (📦) activates **per frozen section**.
- The Staging Area (deposit) is **per frozen section**: it lets the user perform fine manual adjustments without recalculation.
- Movements between schedule and deposit:
  - **Schedule → Deposit:** click or drag-and-drop.
  - **Deposit → Schedule:** drag-and-drop only.
  - **Validation:** conflicts in the destination cell are **shown** (red border + message) but **do not block** the action.
- **Invariant:** an event is in **exactly one place** at a time (schedule OR deposit, never both).

### 7.4 Persistence
- Deposit events MUST persist in the **backend** (not only localStorage).
- Locked sections persist in `lockedSections` (localStorage + backend, debounced save).

### 7.5 Unfreezing
- When a section is unfrozen, manual changes are **kept** unless a subsequent change forces a full recalculation.

---

## 8. Independence of Stages

The two stages are **independent**:

1. Stage 1 (automatic generation) MUST NOT alter Stage 2 state (locked sections, deposit contents).
2. Stage 2 (manual edits) MUST NOT alter Stage 1 logic (the algorithm itself, configuration flags, restrictions).

Technical separation:
- Stage 1: `eventData`, `generateScheduleEvents`, configuration.
- Stage 2: `stagedEvents`, `lockedSections`, official-mode flag, drag-and-drop handlers.

---

## 9. Conflict Detection

A conflict exists when **two subjects** (real events, not ghosts) share **all** of the following:
- Same calendar day and overlapping time slot.
- **One** of:
  - Same teacher
  - Same classroom
  - Same section (`PNF + Trayecto + Sección + Turno`)
- **AND** their calendar periods overlap (per §2.2).

Behavior by stage:
- **Stage 1:** the algorithm avoids conflicts entirely.
- **Stage 2:** conflicts are surfaced visually but never block manual changes.

### 9.1 Cross-quarter ghosts
- "Ghost events" are read-only previews of conflicts caused by subjects from **another period** that share a teacher or classroom with the active view.
- A ghost is shown only when:
  1. Its calendar period overlaps with the active period (per §2.2), AND
  2. It shares a teacher or classroom with at least one **subject in the current view's context** (PNF / professor / classroom).
- Implementation: [`src/components/SchoolSchedule/crossQuarterGhost.ts`](./src/components/SchoolSchedule/crossQuarterGhost.ts).

---

## 10. Persistence and Reports

### 10.1 Active state
- The frontend and backend must always reflect the **same** state. The legacy "save schedule" feature is being deprecated and is not relied upon for current behavior.
- All edits (auto-generated or manual) propagate to the backend so that reports and reloads are consistent.

### 10.2 Reports
- PDF and Excel reports MUST reflect the persisted state. Because the frontend and backend are kept in sync, on-screen state and report state should match by construction.

### 10.3 Single active projection
- Only **one projection is active at a time**. The system does not currently support concurrent projections.

---

## 11. Update Policy

This document is **living**. Update it when:
- A new feature changes the rules.
- A rule above is found incorrect (file a Design Decision in `progress.md` describing why).
- A new business rule emerges.

Before changing schedule code, agents must:
1. Confirm whether the change touches Stage 1 or Stage 2.
2. Verify it does not violate stage independence (§8).
3. Verify it does not violate the calendar overlap rules (§2.2).
4. Update this document if a rule is added or refined.

---

*Last updated: April 30, 2026*
