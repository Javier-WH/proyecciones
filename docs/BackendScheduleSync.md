# Backend-Driven Schedule Sync

All schedule calculations now live in the backend. This document explains
how the frontend and backend collaborate over the WebSocket channel to keep
every connected client in sync.

> Read in conjunction with:
> - `SCHEDULE_RULES.md` — domain rules (source of truth).
> - `docs/BackendSchedule.md` — engine internals.
> - `docs/SchoolSchedule.md` — frontend component layout.

## Goals

1. **Single source of truth**: the schedule state (events, staging, locks,
   overrides, config) lives in the database, not in React state.
2. **No client-side calculations**: the CSP solver, auto-solve, self-heal,
   phantom cleanup, and frozen-section enforcement all run server-side.
3. **Multi-client collaboration**: any number of users editing the same
   `(proyection, trimestre)` see identical state in real time.
4. **Optimistic concurrency**: every write is versioned; conflicts are
   detected and resolved by re-sync.

## Components

```
┌──────────────────────┐       WebSocket        ┌───────────────────────────┐
│  Frontend (React)    │ ─────────────────────► │  Socket handlers          │
│  SchoolSchedule.tsx  │                        │  scheduleHandlers.js      │
│  useScheduleSocket   │ ◄───────────────────── │  (registered per socket)  │
└──────────────────────┘   schedule:state       └─────────────┬─────────────┘
                                                              │
                                                              ▼
                                                ┌───────────────────────────┐
                                                │  stateService.js          │
                                                │  applyAction() + version  │
                                                │  Sequelize tx + FOR UPD.  │
                                                └─────────────┬─────────────┘
                                                              │
                                                              ▼
                                                ┌───────────────────────────┐
                                                │  schedule/engine/**       │
                                                │  generator, autoSolve,    │
                                                │  crossQuarterGhost,       │
                                                │  occupancyTracker, ...    │
                                                └───────────────────────────┘
```

## Rooms

Every client that opens a schedule view joins the Socket.IO room
`schedule:<proyectionId>:<trimestre>`. Broadcasts (`schedule:state`)
target this room exclusively.

## State shape

```js
// Persisted as JSON in schedules.state_snapshot
{
  eventData:          ScheduleEvent[],      // primary stage (A)
  stagedEvents:       ScheduleEvent[],      // secondary stage (B)
  lockedSections:     { [sectionKey]: ScheduleEvent[] },
  classroomOverrides: ClassroomOverride[],
  scheduleConfig:     object
}
```

The `schedules` row also carries:
- `version` (integer, monotonic per `(proyection, trim)`),
- `staged` (legacy JSON of stagedEvents, kept in sync),
- `schedule` (legacy TEXT of eventData, kept in sync).

## Wire protocol

### Envelope (all messages)

```ts
// client → server
{ proyectionId, trimestre, baseVersion, payload }

// server → client (ack)
{ ok: true, version }                 // success
{ ok: false, code, message, currentVersion? }  // failure
```

`code = 'VERSION_CONFLICT'` means the client's `baseVersion` is stale.
The client should call `schedule:getState` and retry.

### Broadcast

After any successful mutation the server emits to the room:

```ts
socket.to('schedule:<p>:<t>').emit('schedule:state', {
  version,
  state: ScheduleState
})
```

## Actions

| Event                         | Purpose                                           | Mutator |
|-------------------------------|---------------------------------------------------|---------|
| `schedule:join`               | Join room, return current state+version           | — |
| `schedule:leave`              | Leave room                                        | — |
| `schedule:getState`           | Fetch current state+version (no side-effects)     | — |
| `schedule:regenerate`         | Full pipeline: self-heal + gen + auto-solve + …   | yes |
| `schedule:setState`           | **Escape hatch** — replace full state             | yes |
| `schedule:saveOverride`       | Append classroom override                          | yes |
| `schedule:deleteOverride`     | Remove override matching `matcher`                 | yes |
| `schedule:deleteAllOverrides` | Clear all overrides                                | yes |
| `schedule:toggleFreeze`       | Freeze/unfreeze a section                          | yes |
| `schedule:moveToStaging`      | Move events from `eventData` → `stagedEvents`      | yes |
| `schedule:returnFromStaging`  | Move events back to `eventData`                    | yes |
| `schedule:clearStaging`       | Empty `stagedEvents`                               | yes |
| `schedule:changeClassroom`    | Change classroom of one or more events             | yes |
| `schedule:dropEvent`          | Drop a single event at `(day, start, end, room)`   | yes |

All mutating events go through `applyAction()` in
`backend/src/backEnd/schedule/stateService.js`, which:

1. Opens a Sequelize transaction.
2. `SELECT … FOR UPDATE` on the row.
3. Verifies `baseVersion === currentVersion`, else throws `VersionConflictError`.
4. Runs the mutator (pure state → state transform).
5. Persists `state_snapshot`, bumps `version`, syncs legacy columns.
6. Commits and broadcasts.

## `schedule:regenerate` pipeline

This is the heaviest action. In order:

1. **Load restrictions** from DB: teacher unavailable days, preferred
   classrooms, classroom overrides, locked sections.
2. **Self-heal** locked sections (`selfHealLockedSections`): sync
   `professorId` on locked events with current subject assignments, remove
   phantom duplicates.
3. **Cross-quarter ghosts** (`buildCrossQuarterGhostEvents`): compute the
   events from overlapping trimesters that must occupy teacher/classroom
   slots without being part of the emitted events.
4. **Initial generation** (`generateScheduleEvents`): CSP solver runs over
   the subjects for this trimestre with restrictions + locked events +
   ghosts as hard constraints.
5. **Auto-solve** (`runAutoSolve`): only runs when `scheduleConfig.auto_solve`
   is `true` and there are residual errors.
   - Pass 2: backtracking placement respecting per-day caps and classroom
     preferences (exclusive vs fallback).
   - Pass 3: left-compaction + swap displacement with 1-level cascade
     (max 800 attempts).
6. **Phantom cleanup** (`removePhantomEvents`): dedupe events sharing
   `(section, day, startTime)`.
7. **Frozen enforcement** (`enforceFrozenSections`): replace events of
   any frozen section with the persisted source of truth.

The final `(eventData, lockedSections, classroomOverrides, scheduleConfig,
lastGenerationErrors)` tuple is returned as the new state.

## Frontend model

### Inbound sync (`useScheduleSocket` → `SchoolSchedule.tsx`)

On `schedule:state`, the frontend updates local `eventData`, `lockedSections`,
`classroomOverrides`, and the observed version. The inbound effect uses a
content-hash to avoid pushing the same state back (echo-loop prevention).

### Outbound sync — regeneration

The big generation `useEffect` now early-returns with
`scheduleDispatch('schedule:regenerate', payload)` whenever `scheduleConnected`
is true. Local generation remains as the offline fallback. Effect deps
include `scheduleConnected` so regeneration fires on reconnect.

### Outbound sync — fine-grained operations (Fase C)

**Status: handlers available in backend, frontend adoption incremental.**

Until the individual frontend handlers (`handleDrop`, `toggleFreezeSection`,
`handleMoveToStaging`, …) are migrated, they keep mutating local state and
rely on the outbound `schedule:setState` effect to persist and broadcast. 
This still synchronizes all clients, just with heavier payloads and weaker
atomicity.

Migration per handler:

1. Replace the local state mutation with an `await scheduleDispatch(action, payload)` call.
2. On `ok`, rely on the inbound `schedule:state` broadcast to update local state.
3. On `VERSION_CONFLICT`, call `schedule:getState` and retry.

Example migration for `toggleFreezeSection`:

```tsx
const toggleFreezeSection = async (pnfId, trayId, sec, trim) => {
  const sectionKey = `${pnfId}-${trayId}-${sec}-${trim}`
  const isLocked = !!lockedSections[sectionKey]
  await scheduleDispatch('schedule:toggleFreeze', {
    sectionKey,
    freeze: !isLocked
  })
}
```

## Error handling

- `VERSION_CONFLICT`: the server holds a newer version. Client should
  refresh via `schedule:getState`. Happens when two users edit at the same
  time.
- `VALIDATION`: the payload is malformed; surface to the user.
- Generic errors: logged; the UI toast shows the message.

## Known gaps / TODOs

- [ ] Migrate individual frontend handlers (drop, staging, freeze,
      classroom change) from local-state + `setState` to the dedicated
      atomic actions (Fase C frontend integration).
- [ ] Persist `lastGenerationErrors` client-side so the errors UI survives
      page reloads.
- [ ] Add server-side conflict validation for `schedule:dropEvent`
      (teacher/classroom/section collision detection).
- [ ] Expose `scheduleConfig` edits via a dedicated action (currently
      piggybacks on `regenerate`).
- [ ] Remove the offline local generation branch in `SchoolSchedule.tsx`
      once the hybrid is no longer needed (Fase F cleanup).

## Files

- `backend/src/backEnd/schedule/stateService.js` — `applyAction`, versioning
- `backend/src/backEnd/schedule/stateTypes.js` — JSDoc types
- `backend/src/backEnd/schedule/engine/index.js` — engine public API
- `backend/src/backEnd/schedule/engine/generator.js` — CSP solver
- `backend/src/backEnd/schedule/engine/autoSolve.js` — auto-solve pipeline (Fase B)
- `backend/src/backEnd/schedule/engine/crossQuarterGhost.js` — ghost events
- `backend/src/backEnd/schedule/loadRestrictions.js` — DB → engine bridge
- `backend/src/backEnd/socket/scheduleHandlers.js` — socket actions
- `src/hooks/useScheduleSocket.ts` — frontend socket hook
- `src/components/SchoolSchedule/SchoolSchedule.tsx` — consumer
