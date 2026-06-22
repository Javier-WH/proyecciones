# Schedule System - Bug Tracker

Last updated: 2026-06-22

## Bug List

| # | Title | Severity | Status | File |
|---|-------|----------|--------|------|
| 1 | Debug logs in production | Low-Med | **Fixed** | `SchoolSchedule.tsx` |
| 2 | Corrupted characters "SecciA3n" | Medium | **Fixed** | `SchoolSchedule.tsx` |
| 3 | Non-frozen classroom change doesn't persist via socket | **High** | **Fixed** | `SchoolSchedule.tsx` |
| 4 | `clearAllStaged` no re-verification before applying | Medium | **Fixed** | `SchoolSchedule.tsx` |
| 5 | Reactive conflict detection excludes `loadedScheduleEvents` | Medium | **Fixed** | `SchoolSchedule.tsx` |
| 6 | Ghosts included in classroom change search | Low | **Fixed** | `SchoolSchedule.tsx` |
| 7 | Inconsistent indentation in `toggleFreezeSection` | Low | **Fixed** | `SchoolSchedule.tsx` |
| 8 | `handleDropBetweenCells` moves with conflicts without warning | Medium | **Not a bug** | `SchoolSchedule.tsx` |
| 9 | 15s silent timer for `markManualEditPending` | Medium | **Fixed** | `SchoolSchedule.tsx` |

---

## Bug Details

### Bug 1: Debug logs in production
- **Severity:** Low-Medium
- **Location:** `SchoolSchedule.tsx` lines 500-524, 1596, 3186, 4078-4088
- **Description:** Multiple `console.log`, `console.warn`, and `window.__*` debug exposures run in production. Causes console noise and minor performance impact.
- **Fix:** Remove or wrap in `import.meta.env.DEV` checks.

### Bug 2: Corrupted characters "SecciA3n"
- **Severity:** Medium
- **Location:** `SchoolSchedule.tsx` lines 565, 586
- **Description:** `SecciA3n` appears instead of `Sección` in user-facing messages. Encoding issue.
- **Fix:** Replace `SecciA3n` with `Sección`.

### Bug 3: Non-frozen classroom change doesn't persist via socket
- **Severity:** High
- **Location:** `SchoolSchedule.tsx` `applyClassroomChangeAndRecalculate` (lines 2887-2954) and `handleChangeClassroom` non-frozen path (line 3244-3245)
- **Description:** When changing classroom on a non-frozen section without conflicts, `applyClassroomChangeAndRecalculate` updates local state and sets `hasUnsavedOverrides`, but does not call `markManualEditPending` nor dispatches via socket. The change may not persist if the reactive sync doesn't pick it up correctly.
- **Symptom:** User drags subject from staging to schedule, changes classroom, but changes are lost unless they click "Guardar cambios" first.
- **Fix:** Call `markManualEditPending` after updating `eventData` in `applyClassroomChangeAndRecalculate`.

### Bug 4: `clearAllStaged` no re-verification
- **Severity:** Medium
- **Location:** `SchoolSchedule.tsx` lines 1348-1360
- **Description:** Conflict check runs before confirmation modal, but state may change between check and `setEventData`.
- **Fix:** Move conflict check inside `onOk` callback.

### Bug 5: Reactive conflict detection excludes `loadedScheduleEvents`
- **Severity:** Medium
- **Location:** `SchoolSchedule.tsx` line 1557
- **Description:** `checkEventConflicts` in the reactive useEffect only uses `getScheduleEvents(eventData)`, not `loadedScheduleEvents`. Conflicts with loaded events may go undetected.
- **Fix:** Include `loadedScheduleEvents` in the events array passed to conflict detection.

### Bug 6: Ghosts included in classroom change search
- **Severity:** Low
- **Location:** `SchoolSchedule.tsx` line 2888
- **Description:** `applyClassroomChangeAndRecalculate` includes `crossQuarterGhostEvents` when searching for events to modify. Ghosts should never be modified directly.
- **Fix:** Remove `crossQuarterGhostEvents` from the spread.

### Bug 7: Inconsistent indentation in `toggleFreezeSection`
- **Severity:** Low
- **Location:** `SchoolSchedule.tsx` lines 559-590
- **Description:** `onOk` callback and `} else {` have 0 indentation, breaking file consistency.
- **Fix:** Re-indent to match surrounding code.

### Bug 8: `handleDropBetweenCells` moves with conflicts without warning
- **Severity:** Medium
- **Location:** `SchoolSchedule.tsx` lines 1990-2005
- **Description:** Block move between cells always applies, even with conflicts. Conflicts shown visually but movement not prevented.
- **Fix:** Consider if this is intentional. If not, add confirmation modal when conflicts detected.

### Bug 9: 15s silent timer for `markManualEditPending`
- **Severity:** Medium
- **Location:** `SchoolSchedule.tsx` lines 311-316
- **Description:** If socket doesn't respond in 15s, saving state clears silently with no error feedback to user.
- **Fix:** Show error message when timer fires without confirmation.

---

## Progress Log

- 2026-06-22: Bug tracker created. Starting with Bug 3.
- 2026-06-22: **Fixed Bug 3** — `applyClassroomChangeAndRecalculate` now writes modified events back to `eventData` and `loadedScheduleEvents`, and calls `markManualEditPending` so socket sync persists the change. Also **fixed Bug 6** incidentally by removing `crossQuarterGhostEvents` from the search array.
- 2026-06-22: **Fixed Bug 1** — Removed `console.warn` in professorMismatchConflict, `console.log` in ConflictCheck, `window.__*` debug exposures, and `console.log` in HappyPath/InboundSync.
- 2026-06-22: **Fixed Bug 2** — Replaced corrupted `SecciA3n` with `Sección` in user-facing messages and comments.
- 2026-06-22: **Fixed Bug 5** — Reactive conflict detection now includes `loadedScheduleEvents` in the events array passed to `checkEventConflicts`.
- 2026-06-22: **Fixed Bug 9** — 15s timer now shows `message.warning` if socket ack hasn't arrived, instead of silently clearing state.
- 2026-06-22: **Fixed Bug 4** — `clearAllStaged` now re-checks conflicts inside `onOk` callback at execution time.
- 2026-06-22: **Bug 8** — Reviewed and classified as **not a bug**. `handleDropBetweenCells` already shows `message.warning` with conflict count; allowing move with visible conflicts is intentional design.
- 2026-06-22: **Fixed Bug 7** — Fixed indentation of `onOk` callback and `} else {` block in `toggleFreezeSection`.
