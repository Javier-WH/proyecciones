# Bug: Printable schedule diverges from live render

> Status: **Root causes identified by code inspection. No code changes applied. User repro pending to prioritize.**
> Owner: TBD
> Date documented: 2026-05-19
> Related files:
> - `src/components/SchoolSchedule/PrintableSchedule.tsx` — print component, own `buildGridForEvents`.
> - `src/components/SchoolSchedule/SchoolSchedule.tsx` — live component, own `buildGrid` inside the `tableSlots/tableGrid` useMemo (line ~3207).
> - `src/components/SchoolSchedule/fucntions.tsx` — `mergeConsecutiveEvents`, static `turnos` fallback.

---

## 1. What the users are reporting

What they see on screen (live grid) is **not** the same as what comes out of the printed PDF for the same proyection/section/period. They cannot tell from the symptom whether events are missing, duplicated, moved or merged differently — only that "they look different".

---

## 2. Data flow comparison

```
                 (eventData, loadedScheduleEvents from socket)
                                  │
                                  ▼
       ┌── effect at SchoolSchedule.tsx:~3050 ─────────────────────────────┐
       │  filteredLoaded / filteredGenerated / filteredGhosts              │
       │  snapEventsToSlots (NEW, only inside live)                        │
       │  mergeConsecutiveEvents                                           │
       │  setEvents(combinedEvents)                                        │
       └──────────────────────────────┬───────────────────────────────────┘
                                      │
                                      ▼
                          `events` (state in SchoolSchedule)
                                      │
                ┌─────────────────────┴────────────────────────┐
                ▼                                              ▼
   live `buildGrid` (SchoolSchedule.tsx:3227)        `<PrintableSchedule events={...} />`
   - uses `activeTurnos` (sanitized)                  - has its own `buildGridForEvents` (line 137)
   - allows day 1..7                                  - hardcoded day 1..5
   - merges by rowSpan, with `sameGhostKind`          - merges by `span`, without ghost kind check
   - tolerates schedules with non-mon-fri days        - drops them silently
                                                       - uses `activeTurnos || turnos` raw (no sanitization)
```

The **same input** flows into the two paths, but they apply **different transformations** to lay it out. Both are necessary because the print component lays out an absolutely-positioned A4-landscape grid in millimeters (different DOM structure), but the logic should at minimum **agree on what to show**, and currently doesn't.

---

## 3. Concrete divergences

Each one is independently capable of producing a "renders X live but prints Y" report. Listed by impact.

### D1. Days 6 and 7 are silently dropped in print

`@d:\JavierWorkSpace\proyecciones\src\components\SchoolSchedule\PrintableSchedule.tsx:161`

```ts
event.daysOfWeek.forEach((day: number) => {
  if (day >= 1 && day <= 5) {
    // ...place into grid...
  }
});
```

Live `buildGrid` at `@d:\JavierWorkSpace\proyecciones\src\components\SchoolSchedule\SchoolSchedule.tsx:3236`:

```ts
if (day < 1 || day > 7) return;
```

If any proyection has Saturday/Sunday classes (or any non-Mon-Fri day configured in `scheduleConfig.days`), live shows them, print **drops them with no warning**.

The header is also hardcoded to `[1, 2, 3, 4, 5]` at `@d:\JavierWorkSpace\proyecciones\src\components\SchoolSchedule\PrintableSchedule.tsx:261`:

```ts
const days = [1, 2, 3, 4, 5]; // Lunes to Viernes
```

The grid columns are hardcoded too: `repeat(5, 46.6mm)` at line 83.

**Severity**: high if anyone uses non-weekday slots. Otherwise invisible.

### D2. Print does not sanitize `activeTurnos`

The live view passes `activeTurnos` after non-trivial sanitization at `@d:\JavierWorkSpace\proyecciones\src\components\SchoolSchedule\SchoolSchedule.tsx:1552`:

- removes zero-duration slots (`start === end`)
- rebuilds `diurno` so it doesn't double-list slots that overlap with `mañana` / `tarde`

Print receives `activeTurnos` as a prop and uses it directly, but its fallback is the **static** `turnos` from `fucntions.tsx`:

```ts
const usedTurnos = activeTurnos || turnos;
```

If for any reason `activeTurnos` is null/undefined when print mounts (e.g. proyection just loaded, scheduleConfig still in flight), print falls back to the default `turnos` table. Live would show "no slots" or empty grid; print would render with the wrong slot set, including potentially **wrong slot start times** (which then makes `timeSlots.findIndex(t => t[0] === startStr)` return -1 and drop events).

Also, even when `activeTurnos` is present, print does NOT redo the diurno-overlap dedup. If the saved `diurno` config has extras that overlap `mañana`/`tarde`, print may show extra rows that live does not — and merge those rows incorrectly.

**Severity**: medium-high. Triggered by config that has `diurno` with non-empty extras, or by race on first mount.

### D3. Print does not use the snap-to-slot fix

The fix in `BUGFIX_SCHEDULE_BLOCK_RENDER.md` lives **inside the live effect** at `@d:\JavierWorkSpace\proyecciones\src\components\SchoolSchedule\SchoolSchedule.tsx:3069-3133` (search for `snapEventsToSlots`). It snaps event times to the nearest slot in the live view's `activeTurnos`.

The `events` state that print receives is therefore already snapped — **so far so good**. But if the live and print use different slot lists (see D2), the events were snapped to **live's** slots and may not match the slots that print derives. Concretely:

- Live snaps a `09:15-10:10` event to `09:25-10:10` because `09:25-10:10` is the nearest slot in `activeTurnos` (after sanitization).
- Print falls back to static `turnos` (D2), which may not have `09:25-10:10` at all. `timeSlots.findIndex(t => t[0] === '09:25')` returns -1 → event dropped.

So D2 + D3 combine to produce "live shows the block, print does not show it" for any event whose time was snapped.

**Severity**: high when D2 is triggered.

### D4. Print merge does not check `sameGhostKind`

Live merge at `@d:\JavierWorkSpace\proyecciones\src\components\SchoolSchedule\SchoolSchedule.tsx:3265`:

```ts
const sameGhostKind =
  !!prevEvent.extendedProps?.isCrossQuarterGhost === !!event.extendedProps?.isCrossQuarterGhost;
if (sameTitle && sameProf && sameClassroom && sameSection && sameGhostKind) { ... }
```

Print merge at `@d:\JavierWorkSpace\proyecciones\src\components\SchoolSchedule\PrintableSchedule.tsx:179`:

```ts
if (sameTitle && sameProf && sameClassroom && sameSection) { ... }
```

Print could merge a real event with a cross-quarter ghost into a single block; live would render them separately with different styling. This produces a "looks different" report when the proyection touches semestral subjects in T1/T2 or T2/T3 calendar overlaps.

**Severity**: medium. Only matters for proyections with semestral subjects.

### D5. Live filters events for the displayed PNF/section/turn; print does not filter again

Live's filtering (`filteredLoaded`/`filteredGenerated` per viewMode) happens in the effect at `@d:\JavierWorkSpace\proyecciones\src\components\SchoolSchedule\SchoolSchedule.tsx:~2920`. The result becomes `events`. Print then receives `events` and, when printing a single entity (a single professor or a single classroom), it filters again at the call site:

`@d:\JavierWorkSpace\proyecciones\src\components\SchoolSchedule\SchoolSchedule.tsx:5048`:

```ts
events={printEntityId
  ? events.filter(e => viewMode === "professor"
    ? String(e.extendedProps?.professorId) === String(printEntityId)
    : String(e.extendedProps?.classroomId) === String(printEntityId)
  )
  : events}
```

This is fine for `professor`/`classroom`. But for the default PNF view there is no `printEntityId`, so print receives all `events` for the current PNF/section/turn — same as live. **No bug here**, but flagged for completeness so it's clear print is not silently filtering.

### D6. Print does not redo `mergeConsecutiveEvents` but its `buildGridForEvents` does adjacency merging

Live `buildGrid` and print `buildGridForEvents` both perform adjacency merging (so a 3-hour block becomes one cell instead of three). The conditions differ (see D4). Both run **after** the higher-level `mergeConsecutiveEvents` already ran in the live effect.

This means events that pass through the live merge but fail the adjacency check on the print side (different ghost kind, different aula due to a per-hour classroom override that exists in `eventData` but isn't applied uniformly) will render as **one cell live, multiple cells print** — or vice versa.

**Severity**: medium. Most often a styling difference; sometimes a structural one.

### D7. Subtle: print's adjacency merge uses `prevEvent.span`, live uses `prevEvent.rowSpan`

Cosmetic. Both work because they only reference their own stored property. But the divergent property names mean refactors in one side need manual mirroring on the other.

---

## 4. Why the live snap-to-slot fix masked some of this and revealed the rest

Before the snap-to-slot fix in `BUGFIX_SCHEDULE_BLOCK_RENDER.md`, both live and print were equally broken on misaligned times. **They were inconsistently broken in the same direction**, so the user could not distinguish "this is a different rendering" from "this is the same broken state".

Now live is fixed; print is not. So the divergence is now **visible** — print kept the old behavior of dropping `09:15-10:10` events at `slotIndex === -1`, while live shows them at `09:25-10:10`.

This explains the **timing** of the user reports.

---

## 5. Proposed fixes (ranked)

### F1. Single source of truth for slot derivation and event normalization

Move the slot derivation, `snapEventsToSlots`, and the adjacency-merge logic into `fucntions.tsx` as **pure exported helpers**. Both `SchoolSchedule.tsx`'s live `buildGrid` and `PrintableSchedule.tsx`'s `buildGridForEvents` should import and use the same helpers.

Concretely, add to `fucntions.tsx`:

```ts
export function deriveSlots(viewMode, turn, activeTurnos): [string,string][];
export function snapEventsToSlots(events, slots, tolMin = 20): Event[];
export function buildScheduleGrid(slots, events, options): Grid;
```

Then strip the duplicated logic from both consumers. This kills D1, D2, D3, D4, D6 in one stroke.

**Risk**: medium. Touches both render paths. Needs visual diffing on a few real proyections.

### F2. Pass already-laid-out grid to PrintableSchedule

Even simpler: the live `useMemo` already produces `tableGrid` / `professorGrids` / `classroomGrids`. Instead of passing raw `events` to `PrintableSchedule`, pass the **pre-built grid** and let print only handle the visual layout (header, page breaks, mm sizing).

Print becomes a "dumb" renderer. Any logic divergence is impossible because there is no logic in print.

**Risk**: medium-low. Print has to walk a grid instead of a flat events array; doable but needs a refactor of `PrintableSchedule`'s rendering loop.

This is the cleanest long-term solution.

### F3. Quick patch (if time-constrained)

If F1/F2 can't be done now, the minimum to stop the bleeding:

1. Replace hardcoded `[1, 2, 3, 4, 5]` in `PrintableSchedule.tsx:261` with the `scheduleConfig.days` (passed in as a prop). Same for the grid column count.
2. Loosen `if (day >= 1 && day <= 5)` to `if (day >= 1 && day <= 7)` at line 161.
3. Mirror the `sanitized` `activeTurnos` from `SchoolSchedule.tsx:1552-1593` in print, or accept `sanitizedActiveTurnos` as a prop.
4. Add `sameGhostKind` to print's merge condition.

This closes D1, D2, D4 without changing the architecture. D3 stops mattering after D2 is fixed. D6 remains as a latent footgun.

**Risk**: low. Targeted edits to one file.

---

## 6. Verification plan

For any candidate fix, before declaring it done:

1. Pick three proyections: one mañana, one tarde, one diurno with overlaps.
2. For each: take a screenshot of the live PNF view, generate the print PDF, and diff side-by-side. Repeat for `professor` and `classroom` views.
3. Pick at least one proyection with cross-quarter ghosts (semestral subjects) and confirm ghosts render the same in both.
4. Pick one proyection that has events whose times don't exactly match the current `scheduleConfig` slots (the same scenario from `BUGFIX_SCHEDULE_BLOCK_RENDER.md`) and confirm the snap is applied consistently.
5. If `scheduleConfig.days` ever includes a day > 5 in any proyection, verify it renders in print.

Document the diff (or "no diff") in the PR.

---

## 7. Questions for the user before picking a fix

- **Which proyections have shown the issue?** If we can name them, we can repro deterministically.
- **What view mode were they printing?** PNF / Professor / Classroom — narrows which `buildGrid` path matters.
- **Were they printing a section that has cross-quarter ghosts (semestrales)?** If yes, D4 is the primary suspect.
- **Were they printing in a different turno than what was on screen?** If yes, slot-set mismatch is more likely.
- **Do any proyections schedule Saturday classes?** Or any day beyond Friday?

---

## 8. Cross-references

- `docs/BUGFIX_SCHEDULE_BLOCK_RENDER.md` — explains the live snap-to-slot fix. Read this first; D3 only makes sense in that context.
- `docs/BUGFIX_SCHEDULE_SYNC_REVERT.md` — independent issue (state sync). Don't conflate.
- `docs/SchoolSchedule.md` — module documentation; should be updated once a fix lands so the print contract is documented.
