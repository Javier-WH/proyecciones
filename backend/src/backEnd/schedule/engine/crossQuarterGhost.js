// =====================================================
// Cross-quarter ghost helpers — calendar overlap model.
// Port of src/components/SchoolSchedule/crossQuarterGhost.ts
// =====================================================

/** @typedef {'q1' | 'q2' | 'q3'} Quarter */
/** @typedef {'T1' | 'T2' | 'T3'} CalendarTrim */

/**
 * Determine the "home quarter" of a subject: the first quarter where it has
 * hours > 0 (q1 → q2 → q3 order).
 * @param {import('./types.js').Subject | null | undefined} subject
 * @returns {Quarter | null}
 */
export function getPrimaryQuarter (subject) {
  if (!subject || !subject.hours) return null
  if (subject.hours.q1 && subject.hours.q1 > 0) return 'q1'
  if (subject.hours.q2 && subject.hours.q2 > 0) return 'q2'
  if (subject.hours.q3 && subject.hours.q3 > 0) return 'q3'
  return null
}

/**
 * @param {boolean} isSemestral
 * @param {Quarter} homeQuarter
 * @returns {Set<CalendarTrim>}
 */
export function getSubjectPeriod (isSemestral, homeQuarter) {
  if (isSemestral) {
    if (homeQuarter === 'q1') return new Set(['T1', 'T2'])
    return new Set(['T2', 'T3'])
  }
  /** @type {Record<Quarter, CalendarTrim>} */
  const map = { q1: 'T1', q2: 'T2', q3: 'T3' }
  return new Set([map[homeQuarter]])
}

/**
 * Two semestrals never overlap; otherwise check raw set intersection.
 * @param {Set<CalendarTrim>} a
 * @param {Set<CalendarTrim>} b
 * @param {boolean} [isSemestralA=false]
 * @param {boolean} [isSemestralB=false]
 * @returns {boolean}
 */
export function periodsOverlap (a, b, isSemestralA = false, isSemestralB = false) {
  if (isSemestralA && isSemestralB) return false
  for (const t of a) if (b.has(t)) return true
  return false
}

/**
 * @param {import('./types.js').ScheduleEvent} event
 * @param {import('./types.js').Subject[] | null | undefined} subjects
 * @param {Quarter | null} fallbackQuarter
 * @returns {{ homeQuarter: Quarter, isSemestral: boolean, subject: import('./types.js').Subject | null } | null}
 */
export function inferEventContext (event, subjects, fallbackQuarter) {
  const subjectId = event.extendedProps?.subjectId
  if (!subjectId) return null

  const subject = subjects?.find((s) => s.innerId === subjectId) || null
  if (subject) {
    const home = getPrimaryQuarter(subject)
    if (home) {
      return { homeQuarter: home, isSemestral: !!subject.isSemestral, subject }
    }
  }
  if (fallbackQuarter) {
    return { homeQuarter: fallbackQuarter, isSemestral: false, subject: null }
  }
  return null
}

/**
 * @param {import('./types.js').ScheduleEvent} e
 * @returns {string | null}
 */
function eventIdFor (e) {
  if (!e?.extendedProps) return null
  const day = e.daysOfWeek?.[0]
  const start = e.startTime
  const subjectId = e.extendedProps.subjectId
  const seccion = e.extendedProps.seccion
  const pnfId = e.extendedProps.pnfId
  if (day == null || !start || !subjectId) return null
  return `${pnfId}|${subjectId}|${seccion}|${day}|${start}`
}

/**
 * @param {string} key
 * @returns {Quarter | null}
 */
function parseTrimFromKey (key) {
  if (key.endsWith('-q1')) return 'q1'
  if (key.endsWith('-q2')) return 'q2'
  if (key.endsWith('-q3')) return 'q3'
  return null
}

/**
 * Build cross-quarter ghost events.
 * @param {{ allEvents: import('./types.js').ScheduleEvent[], lockedSectionsFlat: { key: string, events: import('./types.js').ScheduleEvent[] }[], eventDataCurrent: import('./types.js').ScheduleEvent[], subjects: import('./types.js').Subject[] | null | undefined, activeTrimestre: Quarter }} params
 * @returns {import('./types.js').ScheduleEvent[]}
 */
export function buildCrossQuarterGhostEvents (params) {
  const { allEvents, lockedSectionsFlat, eventDataCurrent, subjects, activeTrimestre } = params

  const currentEventIds = new Set(
    eventDataCurrent.map((e) => eventIdFor(e)).filter((x) => !!x)
  )

  const activeTrimSubjects = (subjects || []).filter(s => {
    const hours = s.hours?.[activeTrimestre]
    return hours && hours > 0
  })
  if (activeTrimSubjects.length === 0) return []

  /** @type {{ event: import('./types.js').ScheduleEvent, explicitTrim: Quarter | null }[]} */
  const ghostCandidates = []

  for (const ev of allEvents) {
    if (!ev.extendedProps) continue
    if (currentEventIds.has(eventIdFor(ev) || '')) continue
    ghostCandidates.push({ event: ev, explicitTrim: null })
  }
  for (const bucket of lockedSectionsFlat) {
    const trim = parseTrimFromKey(bucket.key)
    if (!trim || trim === activeTrimestre) continue
    for (const ev of bucket.events) {
      ghostCandidates.push({ event: ev, explicitTrim: trim })
    }
  }

  const seen = new Set()
  /** @type {import('./types.js').ScheduleEvent[]} */
  const result = []

  for (const { event, explicitTrim } of ghostCandidates) {
    const id = eventIdFor(event)
    if (id && seen.has(id)) continue
    if (id) seen.add(id)

    const ctx = inferEventContext(event, subjects, explicitTrim)
    if (!ctx) continue
    if (ctx.homeQuarter === activeTrimestre) continue

    const eventPeriod = getSubjectPeriod(ctx.isSemestral, ctx.homeQuarter)
    const hasConflictingSubject = activeTrimSubjects.some(s => {
      const subjPeriod = getSubjectPeriod(!!s.isSemestral, activeTrimestre)
      return periodsOverlap(eventPeriod, subjPeriod, ctx.isSemestral, !!s.isSemestral)
    })
    if (!hasConflictingSubject) continue

    result.push({
      ...event,
      extendedProps: {
        ...event.extendedProps,
        isCrossQuarterGhost: true,
        ghostSourceQuarter: ctx.homeQuarter,
        ghostSourceIsSemestral: ctx.isSemestral
      }
    })
  }

  return result
}

/**
 * Does `targetEvent` (current-trim) conflict by period with the ghost?
 * @param {{ targetEvent: import('./types.js').ScheduleEvent, ghost: import('./types.js').ScheduleEvent, subjects: import('./types.js').Subject[] | null | undefined, activeTrimestre: Quarter }} params
 * @returns {boolean}
 */
export function doesEventConflictWithGhost (params) {
  const { targetEvent, ghost, subjects, activeTrimestre } = params

  const targetCtx = inferEventContext(targetEvent, subjects, activeTrimestre)
  if (!targetCtx) return false

  const ghostHome = ghost.extendedProps?.ghostSourceQuarter
  const ghostIsSemestral = !!ghost.extendedProps?.ghostSourceIsSemestral
  if (!ghostHome) return false

  const targetPeriod = getSubjectPeriod(targetCtx.isSemestral, targetCtx.homeQuarter)
  const ghostPeriod = getSubjectPeriod(ghostIsSemestral, ghostHome)
  return periodsOverlap(targetPeriod, ghostPeriod, targetCtx.isSemestral, ghostIsSemestral)
}

/**
 * Strip ghost flags before persistence.
 * @template {{ extendedProps?: import('./types.js').EventExtendedProps }} T
 * @param {T[]} events
 * @returns {T[]}
 */
export function stripGhostFlags (events) {
  return events
    .filter((e) => !e.extendedProps?.isCrossQuarterGhost)
    .map((e) => {
      if (!e.extendedProps) return e
      const rest = { ...e.extendedProps }
      delete rest.isCrossQuarterGhost
      delete rest.ghostSourceQuarter
      delete rest.ghostSourceIsSemestral
      return { ...e, extendedProps: rest }
    })
}
