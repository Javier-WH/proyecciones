# Bug: Manual edits revert to a previous state (intermittent, office-only)

> Status: **Not reproduced locally. Hypotheses documented. Awaiting in-office repro with instrumentation.**
> Owner: TBD (pick up next work session)
> Date documented: 2026-05-19
> Related files:
> - `src/components/SchoolSchedule/SchoolSchedule.tsx`
> - `src/hooks/useScheduleSocket.ts`
> - `src/context/mainContext.tsx`
> - `backend/src/backEnd/socket/scheduleHandlers.js`
> - `backend/src/backEnd/schedule/scheduleService.js`
> - `backend/src/backEnd/schedule/stateService.js`
> - `docs/BackendScheduleSync.md` (existing architecture reference)

---

## 1. Symptoms

User-reported, only reproduces on the **office network** (not on the local dev machine at home):

- Moving a subject inside a **frozen section** (depósito → grid, or grid → grid) briefly succeeds, then the subject **snaps back** to its original position. The reverted state persists for a long time.
- Switching to a different **section** in the schedule view sometimes **reverts to the previous section**.
- Occasionally **all subjects revert** to a previous state (looks like a full snapshot rollback).

These are all consistent with a single underlying problem: **a stale `schedule:state` broadcast (or a `VERSION_CONFLICT`) overwriting the local optimistic state**, with no retry.

---

## 2. Why it doesn't reproduce at home

The bug needs at least one of:

1. **Network latency** between the client emit (`schedule:setState`) and the server ack. The window during which a competing recalc can finish first is wider on the office LAN.
2. **A second client** (another tab on the same machine, or a coworker) connected to the same `schedule:<proyectionId>:<trimestre>` room, emitting its own state.
3. **A backend recalc fired by something else** (another user toggling freeze, an override change, a regeneration) while the user is dragging.
4. **A heavier DB** in the office environment that makes `recalcSingleTrimestre` take seconds, increasing the window for stale state to come back.

Single-user, low-latency localhost can't generate the race window.

---

## 3. Architecture recap (so the analysis is grounded)

### Outbound (client → server)

`@d:\JavierWorkSpace\proyecciones\src\components\SchoolSchedule\SchoolSchedule.tsx:2807-2830` — outbound effect.

- Whenever `eventData`, `classroomOverrides` or `lockedSections` change, the client emits `schedule:setState` with the full snapshot.
- Suppressed when `recalcPendingRef.current === true` (set for **30 seconds** by `startRecalcLoading()`).
- Deduped by hashing the snapshot (`lastSyncedHashRef`).
- Ack handler **does not retry on `VERSION_CONFLICT`**. It only updates `lastSyncedVersionRef` on success.

### Inbound (server → client)

`@d:\JavierWorkSpace\proyecciones\src\components\SchoolSchedule\SchoolSchedule.tsx:2637-2661` — inbound effect.

- Listens on every `schedule:state` broadcast.
- Replaces `eventData`, `lockedSections`, `scheduleConfig` blindly from the broadcast.
- **No comparison** between local pending edits and incoming state. **No conflict resolution.**
- It does set `lastSyncedHashRef` to the incoming snapshot to prevent the outbound effect from immediately re-pushing.

### Server-side state machine

- `@d:\JavierWorkSpace\proyecciones\backend\src\backEnd\schedule\stateService.js:124-173` — `applyAction` runs the mutator inside a transaction with optimistic locking. If `baseVersion !== currentVersion`, throws `VersionConflictError`.
- `@d:\JavierWorkSpace\proyecciones\backend\src\backEnd\schedule\scheduleService.js:216-353` — `recalcSingleTrimestre` regenerates **all events** for the trimestre through the engine, preserving only what's in `lockedSections`. Manual edits to non-frozen sections are **discarded** on every recalc.
- `@d:\JavierWorkSpace\proyecciones\backend\src\backEnd\socket\scheduleHandlers.js:490-545` — `schedule:toggleFreeze`: persists the freeze row, returns ack, then **kicks off recalc in the background**.

### Two parallel `lockedSections` stores

`lockedSections` lives both in `MainContext` (persisted to `localStorage` and via HTTP `saveLockedSections`) **and** in the socket-driven schedule state. They are kept in sync defensively but the bidirectional flow has multiple write paths:

- `MainContext` → `localStorage` + (legacy HTTP) `saveLockedSections`
- Socket inbound → `setLockedSections` in `SchoolSchedule` (replaces)
- `toggleFreezeSection` in `SchoolSchedule` → both local `setLockedSections` and `schedule:toggleFreeze` socket emit
- Backend `recalcSingleTrimestre` → broadcasts new `lockedSections` derived from DB
- Frozen-event drift can occur if any of those races.

---

## 4. Hypotheses (ranked by likelihood)

### H1. Stale broadcast overwrites optimistic edit — **most likely**

Sequence:

1. User drags subject in frozen section. Local `setEventData(...)` runs (optimistic update). UI shows the new position.
2. Outbound effect dispatches `schedule:setState` with the new snapshot. Version sent = `vN`.
3. Meanwhile, a recalc previously triggered (by something — a freeze toggle, an override edit, even another tab) is still running on the server. It completes and broadcasts state `vN+1` based on `vN`'s data **without** the new drag.
4. Client receives `vN+1` first. Inbound effect overwrites `eventData`, the subject visually snaps back.
5. The original outbound `schedule:setState` arrives at the server. Server has `vN+1`, the client sent `baseVersion=vN`, → `VERSION_CONFLICT`. The frontend's ack handler ignores the error.
6. Net result: local edit lost. User sees "moved → reverted".

This matches the office-only symptom (race window) and the "reverts for a long time" (the lost edit is gone until the user does something else that re-pushes).

### H2. Recalc on `toggleFreeze` wipes manual edits

When the user toggles freeze on a section, `recalcSingleTrimestre` runs and **regenerates every event in that trimestre** from subjects + locked events. Any manual drag/drop on **non-frozen** sections inside that trimestre that wasn't yet persisted (or was persisted but not in `lockedSections`) is overwritten by the recalc output.

If the user describes "all subjects revert", this is the most likely cause for that specific symptom — not just one event, but the whole grid getting regenerated.

### H3. Multi-tab / multi-user contention

If a coworker (or another tab) is connected to the same room, both clients are pushing `setState` and receiving each other's broadcasts. The inbound effect replaces local state unconditionally. The last writer wins, and the loser perceives a "revert".

### H4. Section selector reset by inbound state

`turn` and `seccion` are persisted in `localStorage` and initialised from there. But the schedule view derives `pnf`, `trayectoId`, etc. from `eventData` defaults (`@d:\JavierWorkSpace\proyecciones\src\components\SchoolSchedule\SchoolSchedule.tsx:2915-2933`).

When inbound replaces `eventData`, the "set default values when data loads" effect may re-fire and reset `pnf` / `trayectoId` if the previous values are not present in the new snapshot, or if the effect's dependency array makes it run again. This would match "section reverts to previous".

### H5. `recalcPendingRef` 30-second window starves outbound pushes

`startRecalcLoading()` suppresses the outbound effect for 30 s. During that window:

- Inbound state still applies (replaces local eventData).
- User edits go into local state but are **never pushed**.
- After 30 s, the suppression releases, but the hash has likely been updated by inbound, so the user's intermediate edits may not be detected as a diff. They are silently lost.

### H6. `VERSION_CONFLICT` swallowed silently

Even outside `recalcPendingRef`, every `schedule:setState` that loses the version race is rejected and **never retried**. The frontend just logs nothing useful and continues with whatever the backend broadcasts. This guarantees that any rapid sequence of edits during a recalc loses the in-flight one.

### H7. `mainContext` `lockedSections` desync

`mainContext` reads `localStorage` and may push back stale lockedSections to the backend via HTTP `saveLockedSections` if `socket?.connected` is false at any point during the session (e.g. brief disconnect). On reconnect the backend may broadcast its own state and overwrite the local one, but the HTTP save could have already replaced the backend's snapshot with a stale one.

---

## 5. Instrumentation to add before next office repro

The next time someone goes to the office, the **logs must capture**:

1. **Every outbound emit**, with timestamp, `baseVersion`, snapshot hash, and a short ID:
   ```
   [out] t=1747... emit schedule:setState baseVersion=42 hash=… reqId=abc123
   ```
2. **Every ack** received, with the ack outcome and timing:
   ```
   [ack] t=… reqId=abc123 ok=false code=VERSION_CONFLICT currentVersion=43 latencyMs=820
   ```
3. **Every inbound broadcast**, with version, whether delta or full, hash of new state, and a flag indicating whether `recalcPendingRef` is set:
   ```
   [in]  t=… schedule:state v=43 type=full hash=… recalcPending=true
   ```
4. **Every local optimistic mutation** that changes `eventData`/`lockedSections`, with caller name (drag, toggleFreeze, override, classroomChange):
   ```
   [mut] t=… caller=processStagingDrop deltaEvents=+1 -1
   ```
5. **`schedule:toggleFreeze` from the server side**: log when recalc starts and finishes, with elapsed ms.

Concretely, add these logs in:

- `@d:\JavierWorkSpace\proyecciones\src\components\SchoolSchedule\SchoolSchedule.tsx:2807-2830` — outbound effect.
- `@d:\JavierWorkSpace\proyecciones\src\components\SchoolSchedule\SchoolSchedule.tsx:2637-2661` — inbound effect.
- `@d:\JavierWorkSpace\proyecciones\src\hooks\useScheduleSocket.ts` `dispatch` — log emit + ack with reqId and latency.
- `@d:\JavierWorkSpace\proyecciones\backend\src\backEnd\socket\scheduleHandlers.js` — wrap every `socket.on` handler with start/end timing.
- `@d:\JavierWorkSpace\proyecciones\backend\src\backEnd\schedule\scheduleService.js` `recalcSingleTrimestre` — log the version delta and how many events changed.

Persist the frontend logs by pushing them to `window.__scheduleSyncLog = []` so the user can dump them via `copy(JSON.stringify(window.__scheduleSyncLog))` after a repro.

---

## 6. Repro recipe to attempt in the office

Without instrumentation it's blind; with instrumentation, try in this order until it triggers:

1. Two tabs of the same proyection on the same machine, edit in tab A while leaving tab B open. Look for revert.
2. One tab, freeze a section, then immediately drag a subject in a **different** section. Watch for revert when recalc completes.
3. One tab, change a `classroomOverride` (which triggers a recalc) and then immediately drag.
4. One tab, simulate latency with browser devtools (Network → Slow 3G) and repeat the actions that fail in the office.

Each scenario maps to: H3 / H2+H1 / H1 / H1 respectively.

---

## 7. Suggested fixes once root cause is confirmed

Don't apply any of these yet — wait for repro evidence. But this is the menu, ordered by impact:

### F1. Retry `schedule:setState` on `VERSION_CONFLICT` (frontend)

In `@d:\JavierWorkSpace\proyecciones\src\components\SchoolSchedule\SchoolSchedule.tsx:2816` outbound dispatch ack handler: if `ack.code === 'VERSION_CONFLICT'`, re-run the dispatch using the new `baseVersion` from the broadcast that follows. Bound retries to N=3 with backoff.

This alone closes most of H1 and H6.

### F2. Server-side merge instead of replace on `setState`

Today `schedule:setState` overwrites the snapshot wholesale. Change it to a 3-way merge: `(baseState, clientState, currentServerState) → merged`. The merger preserves non-conflicting client edits even when the server has moved on. Document the merge rules per field (eventData by `getEventId`, lockedSections by sectionKey, classroomOverrides by id).

### F3. Stop wiping non-frozen sections on `toggleFreeze` recalc

`recalcSingleTrimestre` should **preserve manual edits** outside the section being toggled. Currently it regenerates everything. Options:

- After recalc, splice the client's last-known `eventData` for non-frozen sections back in (server-side).
- Or, only recompute the affected section + cascading conflicts, not the whole trimestre.

This addresses H2 (the "all events revert" symptom).

### F4. Treat inbound as a hint when there's a pending optimistic edit

In the inbound effect, if `recalcPendingRef.current` is true and the user has a local pending change with a newer wall-clock timestamp than the broadcast's version, **buffer** the inbound state instead of applying it. Reconcile when the optimistic ack arrives.

### F5. Single source of truth for `lockedSections`

Remove the `mainContext` parallel store. The socket state is authoritative. `localStorage` becomes a cache for offline reads only.

### F6. Multi-tab guard

Use a Broadcast Channel / `localStorage` lock so only one tab per `(proyectionId, trimestre)` is the active editor; the others go read-only. Closes H3 entirely.

---

## 8. Open questions for the user

- When the bug happens, **how many people** are usually using the schedule at the same time?
- Does the office machine have **multiple tabs** open on the schedule?
- The reverted state — is it the state that was in the grid **5 seconds ago**, or the state from a **previous session** (e.g., before the user logged in today)?
- After a revert, if the user reloads the page, do they see the **reverted state** or the **pre-revert state**? (This tells us whether the backend accepted the edit and then a recalc overrode it, vs. the edit never reaching the backend.)
- When the **section reverts to the previous section**, is it the URL/select that changes, or is it the data inside the same section that snaps to a different section's events?

Answers to these will narrow the hypothesis list from 7 to 1–2.

---

## 9. Pointers in the code

| Concern | File | Symbol / line ref |
|---|---|---|
| Outbound `setState` push | `src/components/SchoolSchedule/SchoolSchedule.tsx` | useEffect around `lastSyncedHashRef`, line ~2807 |
| Inbound state apply | `src/components/SchoolSchedule/SchoolSchedule.tsx` | useEffect on `scheduleVersion`, line ~2637 |
| 30-s recalc-pending window | `src/components/SchoolSchedule/SchoolSchedule.tsx` | `startRecalcLoading` / `recalcPendingRef`, line ~171 |
| Optimistic toggleFreeze (client) | `src/components/SchoolSchedule/SchoolSchedule.tsx` | `toggleFreezeSection`, line ~378 |
| Socket dispatcher | `src/hooks/useScheduleSocket.ts` | `dispatch` (no retry on conflict) |
| Server toggleFreeze + recalc | `backend/src/backEnd/socket/scheduleHandlers.js` | `schedule:toggleFreeze`, line ~490 |
| Server applyAction (optimistic lock) | `backend/src/backEnd/schedule/stateService.js` | `applyAction`, line ~124 |
| Server recalc (regen all events) | `backend/src/backEnd/schedule/scheduleService.js` | `recalcSingleTrimestre`, line ~216 |
| Parallel lockedSections store | `src/context/mainContext.tsx` | `loadLockedSectionsFromApi`, debounce save, line ~77 |
| Architecture doc | `docs/BackendScheduleSync.md` | full reference |

---

## 10. Cross-references

- The DB time-misalignment bug documented in `docs/BUGFIX_SCHEDULE_BLOCK_RENDER.md` is **independent** of this one. Don't confuse them: that one is about render-time slot snapping; this one is about state-sync races.
- See `docs/BackendScheduleSync.md` for the original sync design — the bug exists because the design assumes the client never holds an optimistic edit longer than one round-trip, which is violated under latency.
