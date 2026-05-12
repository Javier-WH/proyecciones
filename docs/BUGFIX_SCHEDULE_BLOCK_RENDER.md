# Bug: Schedule blocks rendered as separate cells until staging round-trip

> Status: **Render-level workaround applied. Upstream data corruption still pending.**
> Owner: TBD (pick up next work session)
> Date discovered: 2026-05-12
> Related files: `src/components/SchoolSchedule/SchoolSchedule.tsx`, `src/components/SchoolSchedule/fucntions.tsx`, `backend/src/backEnd/schedule/engine/*`

---

## 1. Symptom

Multi-hour schedule blocks (e.g. **HISTOLOGÍA Y EMBRIOLOGÍA**, 3 hours per day) render as **multiple disconnected cells** when the schedule is first loaded from the backend.

Workaround that the user discovered: **drag the subject to the staging area (depósito) and drop it back into the grid** — after that, the block renders correctly as a single contiguous cell.

Visual: see screenshot in conversation `2026-05-12` (HISTOLOGÍA shown as `08:40-09:25` Aula 12 and `10:15-11:00` Aula 13 instead of one merged block). The diagnostic `[render-merge]` console output revealed actual misaligned times (see §3).

---

## 2. What was already fixed (and what's still broken)

### 2.1 Render-level fix already deployed

In `src/components/SchoolSchedule/SchoolSchedule.tsx`, inside the effect at the merge step (search for `Snap de tiempos a los slots actuales antes del merge`):

- A new helper `snapEventsToSlots` snaps every event's `startTime`/`endTime` to the nearest slot in the current `activeTurnos`-derived slot list, within a **20-minute tolerance**.
- When two source events collapse onto the same slot (because the source data overlaps), they are **deduplicated** by `(day, slotStart, subjectId, seccion)`.
- The snap runs before `mergeConsecutiveEvents` for `filteredLoaded`, `filteredGenerated` and `filteredGhosts`.

Why this is just a workaround: it hides the corruption in the rendering layer. The underlying `eventData` and the persisted DB rows still contain bad times. Any code path that reads `eventData` directly (not through this effect) — exports, conflict checks, locked-section saves, sync to backend — still sees the corrupted data.

Also fixed in the same session (correctness):

- `loadedScheduleEvents` is now passed through `mergeConsecutiveEvents` (it was previously skipped under the wrong assumption that those events came pre-merged from the API).

### 2.2 What's still broken (upstream)

The events stored in the DB / pushed via socket have:

1. `startTime` values that **do not exist** in the current `tableSlots` (e.g. `09:15` when the only valid slot is `09:25-10:10`).
2. **Overlapping events** that cannot physically coexist for the same `(subjectId, seccion, day, classroomId, professorId)`. Example from the logs:

   ```
   day=2 08:40-09:25 block=2-328ad0b6-…
   day=2 09:15-10:10 block=2-328ad0b6-…   ← starts BEFORE previous ends
   day=2 10:15-11:00 block=2-328ad0b6-…
   ```

   Same blockId, same classroom, same professor, same section — those two rows cannot both be valid simultaneously.

This is real data corruption. It must be diagnosed and fixed before removing the render-level workaround.

---

## 3. Diagnostic evidence captured

From the browser console, after applying the inbound state for `proyectionId=056f4c46-03d4-4195-881a-f53631c9c7e2`, `trimestre=q2`, `version=916`, `eventData.length=790`:

```
[render-merge] INPUT generated:
day=1 09:15-10:10 block=1-328ad0b6-5c31-4b52-b91c-f5c19984fd7b cls=c9d90e92-… prof=268e4826-… sec=1
day=1 10:15-11:00 block=1-328ad0b6-… …
day=1 11:00-11:45 block=1-328ad0b6-… …
day=2 08:40-09:25 block=2-328ad0b6-… …
day=2 09:15-10:10 block=2-328ad0b6-… …
day=2 10:15-11:00 block=2-328ad0b6-… …

[render-merge] OUTPUT generated:           ← after mergeConsecutiveEvents, before snap was added
day=1 09:15-10:10 …
day=1 10:15-11:45 …                         ← only 10:15-11:00 + 11:00-11:45 merged (exact match)
day=2 08:40-09:25 …
day=2 09:15-10:10 …
day=2 10:15-11:00 …                         ← nothing merged on day 2

[render-merge] tableSlots:
07:00-07:45
07:45-08:30
08:40-09:25
09:25-10:10            ← canonical "second" slot
10:15-11:00
11:00-11:45
13:00-13:45
13:45-14:30
14:30-15:15
15:15-16:00
16:00-16:45
16:45-17:30
17:30-18:15
```

Key observations:

- All HISTOLOGÍA events share the same `blockId` per day (`1-<subjectId>` and `2-<subjectId>`). **Grouping is correct.**
- The merge step only joined what had `startTime === endTime` exactly. Day 1 merged `10:15→11:00 + 11:00→11:45` because of the exact match. Day 2 merged nothing because `08:40-09:25` is followed by `09:15-10:10` (which is impossible) and `10:10` ≠ `10:15`.
- The canonical slot in `tableSlots` is `09:25-10:10`. The stored events use `09:15-10:10` — off by 10 minutes on the start side.

So the bug is **stored times that don't match the current `scheduleConfig` slots**.

---

## 4. Root-cause hypotheses (to verify)

Ranked by likelihood. **Verify, don't assume.**

### H1. `scheduleConfig` was changed after the schedule was generated

Most likely. The engine generated events with a previous slot definition (e.g. `09:15-10:10`), then the user (or a migration) changed `scheduleConfig` to use `09:25-10:10`. The persisted events were never re-aligned.

Verify by:

- Checking the audit history of `scheduleConfig` for this `proyectionId`. If there's no audit table, query `scheduleConfig.updatedAt` and compare with the `createdAt`/`updatedAt` of the affected event rows.
- Asking the user whether they recently edited the slot times for the morning turn (`mañana`).

### H2. The scheduling engine reads from a stale snapshot of slots

The backend's auto-solve (`backend/src/backEnd/schedule/engine/autoSolve.js`, `generator.js`) builds events using `timeSlots[r.slots[s].slotIdx][0/1]`. If `timeSlots` is captured once and reused after a config change without reloading, generated events will keep old times.

Verify by:

- Reading `backend/src/backEnd/schedule/engine/autoSolve.js` and tracing where `timeSlots` is sourced. Confirm it's re-read from `scheduleConfig` on every generation.
- Adding a temporary log in the generator to print `timeSlots` and the resulting `event.startTime`/`endTime` when generating HISTOLOGÍA.

### H3. A migration script or seeder writes wrong times

Some migration in `backend/src/backEnd/dataBase/alters/*` or a `mockData` seeder may inject events directly with hardcoded times.

Verify by:

- `grep -r "09:15"` under `backend/src` to find any literal stale times.
- Reviewing recent commits that touched `scheduleConfig` or the schedule tables.

### H4. Two concurrent generations produced overlapping rows

The day-2 overlap (`08:40-09:25` AND `09:15-10:10`, same block/classroom/prof/section) suggests two passes wrote to the DB without cleaning the previous attempt. Look for:

- Missing `DELETE` before re-`INSERT` in the schedule save/regenerate path.
- Race conditions between `setEventData` push from frontend and an engine regeneration on the backend.

### H5. Frontend `processStagingDrop` saved wrong times back

Less likely (the user reproduced from a freshly loaded state), but worth checking:

- `processStagingDrop` (`SchoolSchedule.tsx`) and `handleDropBetweenCells` snap to `tableSlots`, so they shouldn't introduce the corruption — but if `tableSlots` was different at the time of the drop, they could have persisted the old times into the DB.

---

## 5. Investigation checklist (ordered)

Tomorrow, work through these in order. Stop as soon as you find the source.

1. **Inspect the corrupt rows directly in the DB.**
   - `proyectionId = 056f4c46-03d4-4195-881a-f53631c9c7e2`
   - `trimestre = q2`
   - `subjectId = 328ad0b6-5c31-4b52-b91c-f5c19984fd7b`
   - Select the schedule rows for that subject + section and inspect `startTime`, `endTime`, `createdAt`, `updatedAt`.
   - Look at the corresponding `scheduleConfig` row's `updatedAt` and content.

2. **Compare DB times with current `scheduleConfig` slots.**
   - List the slot pairs in the active `scheduleConfig` for the `mañana` turn.
   - For every event row of HISTOLOGÍA, mark whether `startTime` and `endTime` are present in the slot list.
   - Hypothesis confirmed if: many event rows use a slot start (e.g. `09:15`) that no longer exists in `scheduleConfig`.

3. **Re-run the engine in isolation for that section.**
   - Trigger a regeneration for `(pnf, trayecto, seccion, q2)` and verify the **new** events use canonical slot times.
   - If they do: H1/H2 confirmed; the issue is purely legacy data.
   - If they don't: there's a live bug in the engine; trace `timeSlots` upstream.

4. **Audit the save path.**
   - Trace where the frontend or engine writes `startTime`/`endTime` into the DB. Confirm it always pulls from the live `scheduleConfig`.
   - File entry points: `backend/src/backEnd/schedule/engine/autoSolve.js`, `generator.js`, `solver.js`, `SchoolSchedule.tsx#enqueueLockedSectionSaveFromEvents`, `SchoolSchedule.tsx#processStagingDrop`.

5. **Find the day-2 duplication source.**
   - `block=2-328ad0b6-…` has both `08:40-09:25` and `09:15-10:10`. Search the DB for all rows matching that blockId and inspect timestamps and any `version`/`source` field that distinguishes them.
   - Most likely cause: a regenerate that didn't clear the previous attempt for that section.

---

## 6. Migration / cleanup plan (after root cause is known)

Once root cause is confirmed, plan to:

1. **One-shot DB migration** that snaps every event's `startTime`/`endTime` to the nearest valid slot of the matching `scheduleConfig.turnName`, within the same 20-minute tolerance used in the frontend snap. Deduplicate per `(proyectionId, trimestre, day, slotStart, subjectId, seccion)`.
   - Live in `backend/src/backEnd/dataBase/alters/` following the pattern of `addScheduleVersionAndState.js`.
   - **Idempotent.** Dry-run first: log how many rows would change without writing.
   - Take a DB backup before running.

2. **Fix upstream save** so future writes always use canonical slot times. Add a sanity check that rejects writes whose `startTime` is not in `scheduleConfig.<turn>`.

3. **After verifying the data is clean for ≥1 week**, remove the frontend `snapEventsToSlots` workaround so that any future corruption fails loud instead of being silently masked.

---

## 7. Pointers in the code

| Concern | File | Symbol / line ref |
|---|---|---|
| Render-level snap workaround | `src/components/SchoolSchedule/SchoolSchedule.tsx` | `snapEventsToSlots` (search "Snap de tiempos a los slots actuales") |
| Merge by `blockId` (frontend) | `src/components/SchoolSchedule/fucntions.tsx` | `mergeConsecutiveEvents` |
| Grid layout / slot lookup | `src/components/SchoolSchedule/SchoolSchedule.tsx` | `buildGrid` inside `useMemo` for `tableSlots/tableGrid` |
| Inbound socket state apply | `src/components/SchoolSchedule/SchoolSchedule.tsx` | `useEffect` with `[scheduleVersion]`, `setEventData(scheduleState.eventData)` |
| Engine event creation | `backend/src/backEnd/schedule/engine/autoSolve.js`, `generator.js` | `blockId: \`${day}-${subject.innerId}\``, `startTime: timeSlots[...][0]` |
| Backend merge (engine-side) | `backend/src/backEnd/schedule/engine/generator.js` | `mergeConsecutiveEvents` (groups by `blockId`, requires exact time adjacency) |
| Schema / migration patterns | `backend/src/backEnd/dataBase/alters/addScheduleVersionAndState.js` | reference template for an idempotent migration |

---

## 8. How to reproduce

1. Open the project with `proyectionId = 056f4c46-03d4-4195-881a-f53631c9c7e2`, `trimestre = q2`.
2. Navigate to the schedule view, select the PNF/section that contains HISTOLOGÍA Y EMBRIOLOGÍA (the section visible in the screenshot from 2026-05-12).
3. Without the snap workaround: HISTOLOGÍA renders as 2–3 disconnected cells with mismatched aulas.
4. Drag any HISTOLOGÍA cell to the staging area, then drop it back where it was. Now it renders as a single block.

To reproduce without the frontend workaround, temporarily revert / bypass `snapEventsToSlots` in the merge effect.

---

## 9. Open questions for the user

- Was the `scheduleConfig` for the morning turn edited after the current schedule was generated?
- Has anyone run a regenerate-without-delete on this proyection recently?
- Are there any other proyections with the same symptom, or only this one?
