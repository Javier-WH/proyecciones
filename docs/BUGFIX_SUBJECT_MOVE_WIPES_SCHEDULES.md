# Bug: Moving a subject between trimestres disorders frozen sections

> Status: **F4 (frozen section immutability) implemented. F0 (cache clear) pending.** Critical — caused real data loss on 2026-05-18 across 50+ frozen sections.
> Owner: Cascade
> Date documented: 2026-05-19 (updated after user clarification: regenerating non-frozen sections is **expected**; the bug is that **frozen sections also got disordered**).
> Last updated: 2026-05-19 (F4 implemented)
> Related files:
> - `backend/src/backEnd/socket/socket.js` — the `updateSubjects` handler.
> - `backend/src/backEnd/schedule/scheduleService.js` — `recalcSchedulesForProyection`, `recalcSingleTrimestre`, cache.
> - `backend/src/backEnd/socket/scheduleHandlers.js` — schedule socket handlers (toggleFreeze, etc.).
> - `src/components/proyeccionesSubjects/editProyeccionesSubjectModal/editProyeccionesSubjectModal.tsx` — UI entry point.

---

## 1. What happened (reported by user)

A user moved a subject from **Q2 to Q3** in the proyección editor. The expected effect was: Q2 loses an entry, Q3 gains an entry, Q1 is untouched.

What actually happened: a recalc fired and **more than 50 frozen sections got disordered**. The user is explicit:

> "Está bien que recalcule las no congeladas, pero si una sección está congelada, no puede cambiar nunca excepto si el usuario manualmente la cambia."

So the design expectation is clear and correct:

- **Non-frozen sections**: may be regenerated on subject edits. (Today: they are. That's fine.)
- **Frozen sections**: must be byte-identical before and after any recalc, period. The only legal mutation is an explicit user action (toggleFreeze off, drag a subject inside the frozen section, etc.).

The actual incident violated the second invariant. The code does have an `enforceFrozenSections` step that is supposed to guarantee it, but several upstream steps mutate the same data and leak through. See §6b for the concrete leak paths.

This is independent from the sync-revert bug in `docs/BUGFIX_SCHEDULE_SYNC_REVERT.md`. That one is a race window of seconds. This one is **deterministic** and triggered by any subject edit.

---

## 2. Exact chain of events

1. User saves the edit in `editProyeccionesSubjectModal.tsx` (line ~67, `handleUpdateSimilar`). It updates the `subjects` array and calls `handleSubjectChange(updatedSubjects)`.
2. `handleSubjectChange` (in the parent component / context) emits a socket event `updateSubjects` with the full new subjects array.
3. Backend handler at `@d:\JavierWorkSpace\proyecciones\backend\src\backEnd\socket\socket.js:76-109` receives it. It:
   - Updates the in-memory `subjects` global.
   - Writes to DB via `updateProyection`.
   - Re-emits `updateSubjects` to every connected client.
   - **Triggers `recalcSchedulesForProyection(currentProyectionId, io)` — for ALL three trimestres at once.**
   - Does NOT call `clearRecalcCache(proyectionId)` first.

4. `recalcSchedulesForProyection` calls `recalcSingleTrimestre` for q1, q2, q3 in sequence (or parallel).
5. For each trimestre, `recalcSingleTrimestre` (in `@d:\JavierWorkSpace\proyecciones\backend\src\backEnd\schedule\scheduleService.js:216-353`):
   - Calls `getRecalcContext(proyectionId)`.
   - Runs `generateScheduleEvents` (engine pass 1) + `runAutoSolve` (pass 2 + 3) + `removePhantomEvents` + `enforceFrozenSections`.
   - Returns `finalEvents` — **a brand-new event array, generated from scratch**.
   - Replaces the entire `eventData` field of the schedule snapshot via `applyAction`.
   - Broadcasts `schedule:state` with the new data.

6. Every client overwrites its local `eventData` from the broadcast (per `useScheduleSocket`). **Manual drag/drop, classroom changes, and any work-in-progress for non-frozen sections is gone.**

Only **frozen sections** survive, because `enforceFrozenSections` reinserts their events from the DB-persisted `locked_sections` table.

---

## 3. The two compounding root causes

### R1. `updateSubjects` triggers a full 3-trimestre recalc with no clearing

`@d:\JavierWorkSpace\proyecciones\backend\src\backEnd\socket\socket.js:104-109`:

```js
// Emitir la actualización de asignaturas a todos los clientes
io.emit('updateSubjects', subjects)

// Trigger schedule recalculation for all trimestres
recalcSchedulesForProyection(currentProyectionId, io)
```

Every subject update — no matter how trivial — fires a **full recalc of all three trimestres**. The comment even admits it ("for all trimestres"). The recalc treats the schedule as if it's being built from zero, with no knowledge of any manual placement.

This is **the primary source of data loss**: any manual placement in any trimestre that isn't frozen is wiped on every subject edit, including unrelated edits.

### R2. Stale `subjects` in the recalc cache

`@d:\JavierWorkSpace\proyecciones\backend\src\backEnd\schedule\scheduleService.js:78-107` (`getRecalcContext`):

- The cache holds the **static** part of the context — including `subjects` — for **5 minutes**.
- On a cache hit it only refreshes `lockedSections` and `classroomOverrides`. **It does NOT refresh `subjects`.**

Sequence:

1. User edits subject A: backend calls `recalcSchedulesForProyection`. Cache miss → fresh subjects loaded → cache populated → recalc OK.
2. User edits subject B within 5 minutes: backend calls `recalcSchedulesForProyection`. Cache hit → **stale subjects used** (the version from the previous edit, before B's change). The recalc generates a schedule that doesn't reflect B's edit.
3. Even worse: when the user moves a subject **between trimestres**, `subjects[i].quarter.q2` is removed and `subjects[i].quarter.q3` is added. If the cache is warm, the recalc sees the **old** quarter assignment and:
   - Re-generates events for the subject **in q2** (where it shouldn't be anymore).
   - Does not generate events **in q3** (where it should be).
   - The result diverges from the new DB state in both directions.

`clearRecalcCache(proyectionId)` exists and is correctly called from `schedule:saveTeacherRestrictions`, `schedule:saveSubjectRestrictions`, `schedule:saveConfig`. It is **NOT called** from the `updateSubjects` socket handler.

### Why R1 + R2 turn into "all schedules destroyed"

R1 alone would already wipe non-frozen placements every time. R2 makes the regenerated content **also wrong** because it's based on stale subjects. So users see:

- Manual layouts vanished (R1).
- Replaced by a layout that doesn't even match the change they just made (R2).
- Across all three trimestres, including ones they didn't touch (R1).

A single Q2→Q3 move can therefore destroy hours of carefully arranged Q1 and Q3 work that had nothing to do with the moved subject.

---

## 4. Why the existing safeguards didn't help

| Safeguard | What it does | Why it didn't save the day |
|---|---|---|
| `locked_sections` DB table + `enforceFrozenSections` | Persists frozen sections, reinserts them after each recalc. | Only protects sections **already frozen** before the edit. Anything in progress was unprotected. |
| `recalcPendingRef` (frontend) | Suppresses outbound `setState` for 30 s during a Happy-Path recalc. | This isn't a Happy-Path recalc; it's a subject edit. No suppression triggered. Even if it had, suppression doesn't restore lost data. |
| `clearRecalcCache` | Forces fresh DB reads. | Not invoked from `updateSubjects` handler. |
| Optimistic locking in `applyAction` | Detects concurrent writes. | Doesn't help: the recalc IS the write. There's no other write to conflict with. |

The architecture assumes manual placements live only in frozen sections. Everything else is considered "generated by the engine" and disposable. Reality: users **do** edit non-frozen sections and expect those edits to survive trivial proyección edits.

---

## 5. Reproduction steps

To reproduce deterministically once tomorrow you have time:

1. Take any proyección with several non-frozen subjects across q1, q2, q3.
2. Open the schedule for q2, manually drag a subject to a different classroom or different hour slot. Do **not** freeze the section.
3. Note the new placement.
4. Open the proyección editor, change any subject's `quarter` (e.g. add an hour, change the professor, move it from q2 to q3).
5. Save.
6. Re-open the schedule for q2. The manual placement from step 2 is gone, replaced by an engine-generated layout.
7. Q1 and Q3 are likely also reorganized — and if you moved a subject across trimestres, the result of the move may not even reflect the change yet (R2).

---

## 6. Severity and blast radius

- **Severity**: critical. Production data loss for any non-frozen content. Users may not realize they should freeze sections to protect them, since freezing was introduced as a UI feature for blocking changes — not as the only protection against destructive recalcs.
- **Blast radius**: every proyección. Every subject edit. Every connected client.
- **Detectability**: zero. No warning before, no warning during, no log after telling the user "your manual placements were discarded".

---

## 6b. Why frozen sections leak (the real bug)

The "enforce frozen sections" pipeline lives in three places that must all agree. Any disagreement → mutation:

1. **DB source of truth**: `locked_sections` table (`backend/src/backEnd/dataBase/...`). Read by `loadLockedSections` (`@d:\JavierWorkSpace\proyecciones\backend\src\backEnd\schedule\loadRestrictions.js:81-90`).
2. **Self-heal step**: `selfHealLockedSections` (`@d:\JavierWorkSpace\proyecciones\backend\src\backEnd\schedule\engine\autoSolve.js:49-86`).
3. **Final enforcement**: `enforceFrozenSections` (`@d:\JavierWorkSpace\proyecciones\backend\src\backEnd\schedule\engine\autoSolve.js:949-969`).

`enforceFrozenSections` itself is correct: it filters out anything in a frozen section key from the regenerated events, then re-appends the persisted events as-is. The mutations slip in **before** this step, inside `selfHealLockedSections`.

### L1 — Self-heal silently mutates `professorId` of locked events

`@d:\JavierWorkSpace\proyecciones\backend\src\backEnd\schedule\engine\autoSolve.js:57-66`:

```js
const synchronized = lockedEvents.map(ev => {
  const sub = currentSubjects?.find(s => s.innerId === ev.extendedProps?.subjectId)
  if (!sub) return ev
  const currentProf = sub.quarter?.[trimestre] || null
  if (ev.extendedProps?.professorId !== currentProf) {
    needsSync = true
    return { ...ev, extendedProps: { ...ev.extendedProps, professorId: currentProf } }
  }
  return ev
})
```

Concrete failure modes when a subject is moved Q2→Q3:

- For Q2's frozen sections that include the moved subject: `sub.quarter.q2` is now `null` (the subject is no longer in Q2). The self-heal sets `professorId = null` on every locked event of that subject. The frozen section now shows "Sin Profesor Asignado" where there used to be a teacher.
- For Q2 with a **stale** `subjects` cache (R2): `sub.quarter.q2` still has the old professor; the self-heal sees no diff and leaves things alone. (This is the scenario where the immediate "professor disappeared" symptom does NOT manifest, but other anomalies might.)
- For any trimestre where the user reassigned a professor (even on a non-frozen subject elsewhere) and `subjects` got modified, the frozen sections' professorId gets overwritten too, because self-heal walks **all** locked sections of that trimestre, not only the ones whose subject changed.

This is a violation of "frozen sections must not change". The professor is part of the section's frozen state. The user did not authorize this change. The code does it as a "self-heal" — a name that hides the destructiveness.

### L2 — Self-heal removes "phantom" duplicates

`@d:\JavierWorkSpace\proyecciones\backend\src\backEnd\schedule\engine\autoSolve.js:69-77`:

```js
const slotMap = new Map()
const phantoms = []
for (const ev of synchronized) {
  const slotKey = `${ev.daysOfWeek?.[0]}-${ev.startTime}`
  if (slotMap.has(slotKey)) { phantoms.push(ev); continue }
  slotMap.set(slotKey, ev)
}
const cleaned = phantoms.length > 0 ? Array.from(slotMap.values()) : synchronized
```

If two locked events of the **same section** happen to share `daysOfWeek[0]` and `startTime` (legitimate cases: a section that has two parallel groups in the same slot? unusual but possible), the second event is silently dropped.

The dedup key does **not** include subject, classroom, or professor. So two distinct events colliding on the same slot for any reason → one of them is destroyed and never recovered (the DB still has both, but the recalc result emits only one).

### L3 — `loadLockedSections` returns DB rows; if DB rows are corrupt, frozen state is corrupt

`@d:\JavierWorkSpace\proyecciones\backend\src\backEnd\schedule\loadRestrictions.js:81-90` simply reads what's in the DB. If at any point a non-frozen recalc result leaked into the `events` JSON column of `locked_sections`, the corruption persists indefinitely and shows up on every subsequent recalc.

Worth verifying: is there **any** code path that writes back to the `locked_sections` table using the regenerated events (instead of the user-supplied frozen snapshot)? The toggleFreeze handler at `@d:\JavierWorkSpace\proyecciones\backend\src\backEnd\socket\scheduleHandlers.js:490-545` takes the events from the client. The frontend at `@d:\JavierWorkSpace\proyecciones\src\components\SchoolSchedule\SchoolSchedule.tsx:407-418` builds the events from current `eventData` at the moment of freeze. **If the user pressed freeze while `eventData` was in a transient state (e.g. mid-broadcast)**, the persisted snapshot is wrong — and that's what `enforceFrozenSections` will then enforce forever.

### L4 — `recalcSchedulesForProyection` reuses the same in-memory `context.lockedSections` across all three trimestres

`@d:\JavierWorkSpace\proyecciones\backend\src\backEnd\schedule\scheduleService.js:363-372`:

```js
const context = await getRecalcContext(proyectionId)
for (const trimestre of TRIMESTRES) {
  await recalcSingleTrimestre(proyectionId, io, trimestre, context)
}
```

Inside each iteration, `selfHealLockedSections` returns a **new** object (`{ ...lockedSections }`), but its callers reassign `localLockedSections` locally — they don't update `context.lockedSections`. Good.

But this means: if `recalcSingleTrimestre('q1')` returns a state snapshot where `state.lockedSections` reflects the healed Q1 sections, the next iteration for Q2 still sees the **pre-heal** versions from the cached context. Across the three trimestres, the broadcasts may disagree on the "current" lockedSections — for one tick. Probably not the root cause here, but worth confirming.

### L5 — Trimestre boundary handling in `enforceFrozenSections`

`@d:\JavierWorkSpace\proyecciones\backend\src\backEnd\schedule\engine\autoSolve.js:950-960`:

```js
const frozenSectionKeys = new Set()
for (const key of Object.keys(lockedSections || {})) {
  if (!key.endsWith(`-${trimestre}`)) continue
  const lastDash = key.lastIndexOf('-')
  frozenSectionKeys.add(key.slice(0, lastDash))
}
```

The sectionKey it tracks is `pnfId-trayectoId-seccion` (without trimestre). This is used to filter out any event in `eventsdata` whose section is in `frozenSectionKeys`. Then locked events for `-trimestre` are appended.

Subtle issue: if a section is frozen in Q2 but NOT in Q3, and the user moves a subject into Q3 of that same section, the Q3 recalc will:

- See `frozenSectionKeys = {}` for Q3 (because the only freeze for that section ends in `-q2`).
- Regenerate the section's events from the engine for Q3.
- Not enforce anything.

That's correct behavior. But it does mean: **freezing a section in one trimestre does not freeze it in the others.** If the user thought "I froze this section" meaning "all trimestres", they're wrong — only the specific trimestre is frozen. Worth documenting in the UI.

### Most likely culprits for the 50-section incident

Ordering by suspicion:

1. **L1 (professorId mutation)** — almost certain to have happened. Every subject edit triggers self-heal across all three trimestres for all frozen sections. The professorId of every locked event whose subject moved is now `null`. Symptom: "Sin Profesor Asignado" appears in dozens of frozen cells.
2. **L3 (corrupt DB rows from a bad freeze)** — possible, especially if the user froze sections while the sync was in flight.
3. **L2 (phantom dedup)** — only triggers if there's a slot collision; unlikely to hit 50 sections.
4. **L5 (per-trimestre freeze)** — possible UI confusion, but doesn't disorder sections per se.

A combination of L1 + the wholesale recalc (R1) is most likely the source of the "50 sections disordered" report:

- R1 fires the recalc with no manual placements preserved.
- L1 silently overwrites professorId in every frozen event.
- The UI redraws and the user sees the frozen sections with mass professor-changes + a regenerated background (non-frozen sections rearranged around them).

---

## 7. Fix options (ranked)

### F0 — Stop the bleeding (5-minute patch)

Add `clearRecalcCache(currentProyectionId)` before the recalc call in `@d:\JavierWorkSpace\proyecciones\backend\src\backEnd\socket\socket.js:108`. This only addresses R2 (stale subjects), but it is risk-free.

```js
// Trigger schedule recalculation for all trimestres
clearRecalcCache(currentProyectionId)
recalcSchedulesForProyection(currentProyectionId, io)
```

This is necessary even with the other fixes, so do it regardless. **However, by itself it does NOT save manual placements.** R1 still destroys them.

### F1 — Don't recalc on `updateSubjects` (recommended short-term)

Remove the automatic recalc from the `updateSubjects` handler. Instead, expose a manual "Regenerate schedule" button in the proyección editor that the user clicks **explicitly** when they want to discard manual placements and let the engine rebuild.

Rationale: the destructive behaviour becomes opt-in. The current state — destroy-on-edit — has no business being the default. Frontend can show a banner ("Subjects changed. Click 'Regenerate' to update schedule.") so users know there's work pending.

**Risk**: low. UX change, no algorithmic change. Tests should cover that no recalc happens on edit, and that the regenerate button still works.

### F2 — Diff subjects and only recalc affected sections

A subject edit affects at most:

- the trimestre(s) where the subject's `quarter.qN` changed (gained or lost an entry, or professor swap),
- the section(s) (pnf+trayecto+seccion) that owns the subject.

Compare old vs new `subjects` arrays. Compute the set of affected `(trimestre, sectionKey)` pairs. For each affected pair:

- If the section is frozen: only re-validate (do not regenerate).
- If the section is not frozen: regenerate only the events for that section, leave the rest of `eventData` untouched.

This requires:

- Loading the previous `subjects` from DB before overwriting.
- Per-section regeneration in the engine (right now the engine works at the trimestre level).
- A clear merge step that combines the regenerated section events with the preserved ones.

**Risk**: medium-high. Touches the engine. Needs solid tests because partial regeneration can leak phantoms or break conflict invariants. Best done with a dedicated test harness.

### F4 — Make frozen sections truly immutable (highest priority given the new evidence)

**Status: IMPLEMENTED on 2026-05-19**

This addresses §6b L1/L2 directly and should land **before** F1/F2/F3, because frozen-section immutability is a hard invariant the users rely on.

Concrete changes made:

1. **Dropped the `professorId` mutation from `selfHealLockedSections`.** Frozen events carry their professor. If the underlying subject loses its professor or moves trimestre, that's a `subjects` change — the user must explicitly unfreeze, edit, refreeze. The "self-heal" was well-intentioned but it silently violates the invariant.

   **Implementation**: `selfHealLockedSections` in `autoSolve.js` now returns `{ lockedSections, warnings }` instead of `{ lockedSections, changed }`. It validates without mutating and logs warnings for professorId mismatches. Callers in `scheduleHandlers.js` and `scheduleService.js` updated to handle the new return value.

2. **Dropped the phantom dedup logic entirely.** If two events for the same section share a slot key, that's a data anomaly the engine should not paper over silently.

   **Implementation**: Removed the slot-based dedup logic from `selfHealLockedSections`. The function now only validates and warns.

3. **Added a hash check around `enforceFrozenSections`.** Compute a stable hash of locked sections before and after each recalc. If the hash differs, throw an error loudly. This is a tripwire — its purpose is to fail noisily the next time something mutates frozen data.

   **Implementation**: Added `computeLockedSectionsHash()` function in `autoSolve.js` that hashes based on event identity (day, start, end, subjectId, seccion, professorId, classroomId). Callers in `scheduleHandlers.js` and `scheduleService.js` now compute hash before/after `enforceFrozenSections` and throw if hashes differ.

4. **Database-level guard**: add a Sequelize `beforeUpdate` hook on `LockedSections` that compares `events` JSON length and event IDs vs the previous row. If the only change is `professorId` and there's no explicit user-triggered write context, reject the update.

   **Status: NOT YET IMPLEMENTED** - deferred as lower priority since the hash check should catch most mutations at the recalc level.

5. **Frontend UX**: when the user freezes a section, snapshot the events client-side too and re-fetch after the recalc broadcast to verify they came back unchanged. Show a banner if they didn't.

   **Status: NOT YET IMPLEMENTED** - deferred as lower priority. The server-side hash check provides protection; frontend verification is a nice-to-have.

**Files modified:**
- `backend/src/backEnd/schedule/engine/autoSolve.js` - Modified `selfHealLockedSections`, added `computeLockedSectionsHash`, updated pipeline comment
- `backend/src/backEnd/socket/scheduleHandlers.js` - Updated to handle new return value, added hash check
- `backend/src/backEnd/schedule/scheduleService.js` - Updated to handle new return value, added hash check

### F3 — Preserve manual placements in `recalcSingleTrimestre`

Make `recalcSingleTrimestre` smarter: before regenerating, snapshot the previous `eventData`. After regenerating, for any section whose `(pnf, trayecto, seccion)` had matching subjects in both old and new (same `subjectId` set, same hours, same professor), restore the previous placement of those events.

This is essentially "soft-freeze every section by default". Manual placements survive any recalc as long as the subject set for the section didn't materially change.

**Risk**: medium. The "matching subjects" predicate has to be precise. False positive (treating two different setups as compatible) → stale events leak. False negative (treating identical setups as different) → manual work is lost (current behavior, so no regression).

---

## 8. Recommended path (updated after frozen-section evidence)

1. **Tonight or first thing tomorrow**: apply F0 (the 5-line cache clear) so subject moves at least use fresh data when they do trigger a recalc.
2. **Same day**: apply F4 (make frozen sections immutable). This is now the highest priority because the user explicitly reported that frozen sections were affected. The specific sub-items to ship:
   - Drop the `professorId` mutation from `selfHealLockedSections` (replace with read-only warning).
   - Drop the phantom dedup or scope it correctly.
   - Add the hash check around `enforceFrozenSections` as a tripwire.
   - These are all in `backend/src/backEnd/schedule/engine/autoSolve.js`. No schema changes needed.
3. **Same day or next**: ship F1 (remove the automatic recalc on `updateSubjects`). It's a small UX change that prevents the wholesale recalc from firing at all, which is the primary source of R1. With F4 in place, frozen sections are protected even if a recalc does fire — but avoiding the recalc entirely is still better UX.
4. **Next sprint**: design and implement F2 or F3. F3 is less invasive; F2 is more elegant but more work. These address the "preserve non-frozen manual placements" goal, which is nice-to-have once frozen sections are solid.

Once F1 is in place, you can plan F2/F3 calmly because no more data loss is happening.

---

## 9. Things to verify alongside the fix

- Does `setActiveProyection` (`@d:\JavierWorkSpace\proyecciones\backend\src\backEnd\dataBase\querys\proyections\setActiveProyection.js:28`) also call `recalcSchedulesForProyection`? — **Yes.** Switching active proyección triggers a recalc. Probably fine (new proyección = clean slate), but verify that it doesn't fire when only the user "selects" an already-active proyección.
- Does `createProyection` recalc? — **Yes.** Acceptable; new proyección has no manual placements to lose.
- Does the cold-start in `schedule:join` recalc? — Yes, but **only when `state.eventData.length === 0`**, so it's safe.
- `schedule:toggleFreeze` triggers `recalcSingleTrimestre` for the affected trimestre. This is R1 in miniature — every freeze toggle wipes non-frozen placements within that trimestre. Worth a follow-up review even if it's less catastrophic than the global recalc.

---

## 10. Open questions for the user

- How many proyecciones were affected by the 2026-05-18 incident? Is there a DB backup that can be restored from?
- Are there other proyección edits (e.g. teacher restrictions, classroom overrides) that the user has seen wipe manual placements? Several other handlers also call `recalcSchedulesForProyection` — same root cause R1.
- Would users accept a manual "Regenerate" workflow (F1) or do they expect changes to flow automatically (F2/F3)?

---

## 11. Pointers in the code

| Concern | File | Symbol / line ref |
|---|---|---|
| Destructive recalc trigger | `backend/src/backEnd/socket/socket.js` | `updateSubjects` handler, line ~76-109 |
| Recalc entry point | `backend/src/backEnd/schedule/scheduleService.js` | `recalcSchedulesForProyection`, line ~363 |
| Per-trimestre recalc | `backend/src/backEnd/schedule/scheduleService.js` | `recalcSingleTrimestre`, line ~216 |
| Recalc context cache | `backend/src/backEnd/schedule/scheduleService.js` | `getRecalcContext` / `clearRecalcCache`, line ~78-122 |
| Frozen-section protection | `backend/src/backEnd/schedule/engine/index.js` | `enforceFrozenSections` |
| Subject edit UI | `src/components/proyeccionesSubjects/editProyeccionesSubjectModal/editProyeccionesSubjectModal.tsx` | `handleUpdateSimilar`, line ~67 |
| Schedule socket handlers | `backend/src/backEnd/socket/scheduleHandlers.js` | multiple handlers that also call `recalcSchedulesForProyection` |

---

## 12. Cross-references

- `docs/BUGFIX_SCHEDULE_SYNC_REVERT.md` — race-condition revert (different bug, similar visible effect).
- `docs/BUGFIX_SCHEDULE_BLOCK_RENDER.md` — render snap fix (unrelated).
- `docs/BUGFIX_PRINTABLE_VS_LIVE_DIVERGENCE.md` — print vs live render (unrelated).
- `docs/BackendScheduleSync.md` — original sync design.
