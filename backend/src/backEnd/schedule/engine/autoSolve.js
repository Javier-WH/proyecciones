// =====================================================
// Auto-solve & post-processing for the schedule engine.
//
// This module is a faithful port of the giant generation effect that used
// to live in `src/components/SchoolSchedule/SchoolSchedule.tsx`. The order
// of operations matches the frontend so that the backend produces the
// same schedule it used to produce on the client.
//
// Pipeline:
//   1. selfHealLockedSections()  — sync professorId on locked events and
//      remove phantom duplicates on the same slot of the same section.
//   2. (caller) generateScheduleEvents() — initial CSP solve.
//   3. runAutoSolve()            — pass-2 backtracking + pass-3 swap
//      displacement (compaction + cascade relocation).
//   4. removePhantomEvents()     — sanity check for duplicates.
//   5. enforceFrozenSections()   — restore persisted frozen events as the
//      source of truth for any section marked locked.
//
// This file intentionally avoids any browser-only APIs.
// =====================================================

import { normalizeText } from './normalizeText.js'

/**
 * Compute a stable identifier for an event matching the frontend convention.
 * Used to track events through swap/cascade operations.
 * @param {any} event
 * @returns {string}
 */
export function getEventId (event) {
  const p = event?.extendedProps || {}
  return `${p.subjectId}-${p.seccion}-${event?.daysOfWeek?.[0]}-${event?.startTime}`
}

// ---------------------------------------------------------------------------
// 1. SELF-HEALING for lockedSections (pre-generation)
// ---------------------------------------------------------------------------

/**
 * Sync the professorId on locked events with the current professor assigned
 * to each subject. Also removes phantom duplicates on the same slot of the
 * same section.
 *
 * @param {Record<string, any[]>} lockedSections
 * @param {any[]} currentSubjects
 * @param {string} trimestre
 * @returns {{ lockedSections: Record<string, any[]>, changed: boolean }}
 */
export function selfHealLockedSections (lockedSections, currentSubjects, trimestre) {
  const updated = { ...lockedSections }
  let changed = false

  for (const [key, lockedEvents] of Object.entries(updated)) {
    if (!key.endsWith(`-${trimestre}`)) continue
    let needsSync = false

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

    // Remove phantom duplicates: two events in the same slot of the same section.
    const slotMap = new Map()
    const phantoms = []
    for (const ev of synchronized) {
      const slotKey = `${ev.daysOfWeek?.[0]}-${ev.startTime}`
      if (slotMap.has(slotKey)) { phantoms.push(ev); continue }
      slotMap.set(slotKey, ev)
    }
    const cleaned = phantoms.length > 0 ? Array.from(slotMap.values()) : synchronized
    if (phantoms.length > 0) needsSync = true

    if (needsSync) {
      updated[key] = cleaned
      changed = true
    }
  }

  return { lockedSections: updated, changed }
}

// ---------------------------------------------------------------------------
// 2. AUTO-SOLVE (pass 2 + pass 3 + compaction)
// ---------------------------------------------------------------------------

/**
 * Run the post-generation auto-solve loop. This includes:
 *   - Pass 2: backtracking placement that respects per-day caps and
 *     classroom preferences (exclusive vs fallback).
 *   - Pass 3: swap displacement with optional 1-level cascade relocation,
 *     preceded by a left-compaction pass that creates larger empty windows.
 *
 * Inputs are read-only; the function returns a new `eventsdata` array plus
 * the residual errors and counters.
 *
 * @param {Object} input
 * @param {any[]} input.eventsdata             initial generated events (mutable copy)
 * @param {any[]} input.initialErrors          errors from initial generation
 * @param {any[]} input.loadedScheduleEvents   immovable saved events
 * @param {any[]} input.crossQuarterGhostEvents overlapping ghost events
 * @param {any[]} input.currentSubjects
 * @param {Record<string, [string,string][]>} input.activeTurnos
 * @param {any} input.scheduleConfig
 * @param {any[]} input.teacherRestrictions
 * @param {any[]} input.subjectRestriction
 * @param {any[]} input.classrooms
 * @param {{ minSlots: number, maxSlots: number }} input.consecutiveConfig
 * @param {string} input.trimestre
 * @param {Record<string, any[]>} input.lockedSections
 * @returns {{ eventsdata: any[], errors: any[], solvedCount: number, swapSolvedCount: number }}
 */
export function runAutoSolve (input) {
  const {
    initialErrors,
    loadedScheduleEvents,
    crossQuarterGhostEvents,
    currentSubjects,
    activeTurnos,
    scheduleConfig,
    teacherRestrictions,
    subjectRestriction,
    classrooms,
    consecutiveConfig,
    trimestre,
    lockedSections
  } = input
  let eventsdata = input.eventsdata.slice()

  if (!scheduleConfig?.auto_solve || initialErrors.length === 0) {
    return { eventsdata, errors: initialErrors, solvedCount: 0, swapSolvedCount: 0 }
  }

  let currentAllEvents = [...loadedScheduleEvents, ...eventsdata, ...crossQuarterGhostEvents]
  const newlySolvedEvents = []
  let solvedCount = 0
  const unresolvedErrors = []

  // ─── PASS 2: BACKTRACKING PLACEMENT ─────────────────────────────────────
  for (const errorInfo of initialErrors) {
    if (!errorInfo.subjectId) { unresolvedErrors.push(errorInfo); continue }

    const subject = currentSubjects?.find(s => s.innerId === errorInfo.subjectId)
    if (!subject) { unresolvedErrors.push(errorInfo); continue }

    const turnoName = subject.turnoName?.toLowerCase() || ''
    const timeSlots = activeTurnos[turnoName]
    if (!timeSlots || timeSlots.length === 0) { unresolvedErrors.push(errorInfo); continue }

    const professorId = errorInfo.professorId || subject.quarter?.[trimestre] || null
    const sectionKey = `${subject.pnfId}-${subject.trayectoId}-${subject.seccion}`
    const hoursNeeded = errorInfo.totalHours || subject.hours?.[trimestre] || 0
    if (hoursNeeded <= 0) { unresolvedErrors.push(errorInfo); continue }

    const preventSingleBlocksGlobal = !!scheduleConfig?.prevent_single_hour_blocks
    const defaultDays = scheduleConfig?.days || [1, 2, 3, 4, 5]
    const activeClassrooms = classrooms.filter(c => c.active !== false)
    const profRestriction = teacherRestrictions.find(r => String(r.teacherId) === String(professorId))
    const profDays = profRestriction?.days
      ? defaultDays.filter(d => !new Set(profRestriction.days).has(d))
      : defaultDays

    const autoSubPrefKey = `${normalizeText(subject.subject)}_t_${normalizeText(subject.trayectoName || '')}`
    const subPref = subjectRestriction.find(r => r.subjectKey === autoSubPrefKey)
    const prefClassrooms = (subPref?.classroomIds?.length || 0) > 0
      ? activeClassrooms.filter(c => subPref.classroomIds.includes(c.id))
      : activeClassrooms

    const executeSearch = (days, targetClassrooms, forceConsecutive) => {
      const occupancy = new Map()
      for (const evt of currentAllEvents) {
        if (!evt.daysOfWeek?.length || !evt.startTime) continue
        const key = `${evt.daysOfWeek[0]}-${evt.startTime}`
        if (!occupancy.has(key)) occupancy.set(key, { professorIds: new Set(), classroomIds: new Set(), sectionKeys: new Set() })
        const occ = occupancy.get(key)
        if (evt.extendedProps?.professorId) occ.professorIds.add(String(evt.extendedProps.professorId))
        if (evt.extendedProps?.classroomId) occ.classroomIds.add(String(evt.extendedProps.classroomId))
        const sk = `${evt.extendedProps?.pnfId}-${evt.extendedProps?.trayectoId}-${evt.extendedProps?.seccion}`
        occ.sectionKeys.add(sk)
      }

      const runs = []
      for (const day of days) {
        for (const cr of targetClassrooms) {
          if (cr.active === false) continue
          let currentRun = null
          let lastEnd = null
          for (let idx = 0; idx < timeSlots.length; idx++) {
            const [start, end] = timeSlots[idx]
            const occ = occupancy.get(`${day}-${start}`)
            const conflict = (professorId && occ?.professorIds.has(String(professorId))) ||
              occ?.sectionKeys.has(sectionKey) ||
              occ?.classroomIds.has(String(cr.id))
            const isAvailable = !conflict
            let crossesBreak = false
            if (lastEnd !== null && scheduleConfig?.breaks?.length > 0) {
              crossesBreak = scheduleConfig.breaks.some(b => lastEnd <= b.start && start >= b.end)
            }
            const isConsecutive = isAvailable && (lastEnd === null || !crossesBreak)
            if (isConsecutive) {
              if (!currentRun) currentRun = { day, startSlotIdx: idx, slots: [] }
              currentRun.slots.push({ slotIdx: idx, classroom: cr })
              lastEnd = end
            } else {
              if (currentRun && currentRun.slots.length > 0) runs.push(currentRun)
              if (isAvailable) { currentRun = { day, startSlotIdx: idx, slots: [{ slotIdx: idx, classroom: cr }] }; lastEnd = end } else { currentRun = null; lastEnd = null }
            }
          }
          if (currentRun && currentRun.slots.length > 0) runs.push(currentRun)
        }
      }
      runs.sort((a, b) => b.slots.length - a.slots.length || a.day - b.day)

      const usable = forceConsecutive ? runs.filter(r => r.slots.length >= 2) : runs
      let bestEvents = []
      let bestCount = 0

      const backtrack = (idx, current, count) => {
        if (count > bestCount) { bestCount = count; bestEvents = [...current] }
        if (bestCount >= hoursNeeded || idx >= usable.length) return
        let rem = 0
        for (let i = idx; i < usable.length; i++) rem += Math.min(usable[i].slots.length, hoursNeeded - count)
        if (count + rem <= bestCount) return
        for (let i = idx; i < usable.length; i++) {
          const r = usable[i]
          let existingHoursOnDay = 0
          for (const [start] of timeSlots) {
            if (occupancy.get(`${r.day}-${start}`)?.sectionKeys.has(sectionKey)) existingHoursOnDay++
          }
          const currentHoursOnDay = current.filter(e => e.daysOfWeek.includes(r.day)).length
          const maxAllowedToday = Math.max(
            scheduleConfig?.conserve_slots || consecutiveConfig.maxSlots,
            Math.ceil(hoursNeeded / Math.max(1, profDays.length))
          )
          const limit = maxAllowedToday - (currentHoursOnDay + existingHoursOnDay)
          if (limit <= 0) continue
          let take = Math.min(r.slots.length, hoursNeeded - count, limit)
          if (forceConsecutive) {
            if (take === 1) { if (r.slots.length >= 2) take = 2; else continue }
            if ((hoursNeeded - count) - take === 1) {
              if (r.slots.length > take && limit > take) take += 1
              else if (take - 1 >= 2) take -= 1
              else continue
            }
          }
          const batch = []
          for (let s = 0; s < take; s++) {
            batch.push({
              title: subject.subject,
              daysOfWeek: [r.day],
              startTime: timeSlots[r.slots[s].slotIdx][0],
              endTime: timeSlots[r.slots[s].slotIdx][1],
              extendedProps: {
                subjectId: subject.innerId,
                professorId: professorId || null,
                classroomId: r.slots[s].classroom.id,
                classroomName: r.slots[s].classroom.classroom,
                pnfId: subject.pnfId,
                trayectoId: subject.trayectoId,
                trayectoName: subject.trayectoName,
                seccion: subject.seccion,
                pnfName: subject.pnf,
                turnName: subject.turnoName,
                blockId: `${r.day}-${subject.innerId}`
              }
            })
          }
          backtrack(i + 1, [...current, ...batch], count + take)
          if (bestCount >= hoursNeeded) return
        }
      }
      backtrack(0, [], 0)
      return { events: bestEvents, count: bestCount }
    }

    let finalResult = executeSearch(profDays, prefClassrooms, preventSingleBlocksGlobal)
    if (finalResult.count < hoursNeeded && !subPref?.isExclusive) {
      const fallback = executeSearch(profDays, activeClassrooms, preventSingleBlocksGlobal)
      if (fallback.count > finalResult.count) finalResult = fallback
    }

    if (finalResult.count === 0) {
      unresolvedErrors.push(errorInfo)
    } else {
      if (finalResult.count < hoursNeeded) {
        unresolvedErrors.push({
          ...errorInfo,
          totalHours: hoursNeeded - finalResult.count,
          description: `Se asignaron parcialmente ${finalResult.count} horas. Faltan ${hoursNeeded - finalResult.count} horas. ${errorInfo.description}`
        })
      } else {
        solvedCount++
      }
      newlySolvedEvents.push(...finalResult.events)
      currentAllEvents.push(...finalResult.events)
    }
  }

  // ─── PASS 3: SWAP DISPLACEMENT ──────────────────────────────────────────
  const finalUnresolvedErrors = []
  const swapSolvedEvents = []
  const swapRelocatedEvents = []
  const swapRemovedEventIds = new Set()

  if (unresolvedErrors.length > 0) {
    const lockedSectionKeysTrim = new Set(
      Object.keys(lockedSections || {}).filter(k => k.endsWith(`-${trimestre}`))
    )
    const isEventInLockedSection = ev => {
      const k = `${ev.extendedProps?.pnfId}-${ev.extendedProps?.trayectoId}-${ev.extendedProps?.seccion}-${trimestre}`
      return lockedSectionKeysTrim.has(k)
    }
    const loadedEventIds = new Set(loadedScheduleEvents.map(e => getEventId(e)))
    const isEventMovable = ev => {
      if (loadedEventIds.has(getEventId(ev))) return false
      if (isEventInLockedSection(ev)) return false
      return true
    }

    const buildBlocksFrom = events => {
      const grouped = new Map()
      for (const ev of events) {
        const p = ev.extendedProps || {}
        const key = `${ev.daysOfWeek?.[0]}|${p.subjectId}|${p.pnfId}|${p.trayectoId}|${p.seccion}|${p.classroomId}`
        if (!grouped.has(key)) grouped.set(key, [])
        grouped.get(key).push(ev)
      }
      const result = []
      for (const evs of grouped.values()) {
        const turnoName = (evs[0].extendedProps?.turnName || '').toLowerCase()
        const slots = activeTurnos[turnoName]
        if (!slots) continue
        const sorted = [...evs].sort((a, b) => a.startTime.localeCompare(b.startTime))
        let run = []
        const flush = () => {
          if (run.length === 0) return
          const startIdx = slots.findIndex(s => s[0] === run[0].startTime)
          if (startIdx < 0) { run = []; return }
          const first = run[0]
          const fp = first.extendedProps || {}
          result.push({
            events: [...run],
            subjectId: String(fp.subjectId),
            pnfId: String(fp.pnfId),
            trayectoId: String(fp.trayectoId),
            seccion: String(fp.seccion),
            day: first.daysOfWeek?.[0] ?? 0,
            classroomId: String(fp.classroomId),
            professorId: fp.professorId ? String(fp.professorId) : null,
            turnoName,
            startSlotIdx: startIdx,
            length: run.length
          })
          run = []
        }
        for (const ev of sorted) {
          if (run.length === 0) { run.push(ev); continue }
          const last = run[run.length - 1]
          if (last.endTime === ev.startTime) run.push(ev)
          else { flush(); run.push(ev) }
        }
        flush()
      }
      return result
    }

    const buildOccupancyFrom = events => {
      const occ = new Map()
      for (const ev of events) {
        const day = ev.daysOfWeek?.[0]
        const start = ev.startTime
        if (day == null || !start) continue
        const k = `${day}-${start}`
        let o = occ.get(k)
        if (!o) { o = { profs: new Set(), rooms: new Set(), secs: new Set(), eventsAt: [] }; occ.set(k, o) }
        const p = ev.extendedProps || {}
        if (p.professorId) o.profs.add(String(p.professorId))
        if (p.classroomId) o.rooms.add(String(p.classroomId))
        o.secs.add(`${p.pnfId}-${p.trayectoId}-${p.seccion}`)
        o.eventsAt.push(ev)
      }
      return occ
    }

    const activeClassroomsSwap = classrooms.filter(c => c.active !== false)
    const defaultDaysSwap = scheduleConfig?.days || [1, 2, 3, 4, 5]
    const preventSingleSwap = !!scheduleConfig?.prevent_single_hour_blocks
    const maxPerDaySwap = scheduleConfig?.conserve_slots || consecutiveConfig.maxSlots

    let cascadeAttempts = 0
    const MAX_CASCADE_ATTEMPTS = 800

    const buildRelocatedEvents = (block, place) => {
      const slots = activeTurnos[block.turnoName]
      if (!slots) return []
      const out = []
      for (let i = 0; i < block.length; i++) {
        const [s, e] = slots[place.startSlotIdx + i]
        const tpl = block.events[Math.min(i, block.events.length - 1)]
        out.push({
          ...tpl,
          daysOfWeek: [place.day],
          startTime: s,
          endTime: e,
          extendedProps: {
            ...tpl.extendedProps,
            classroomId: place.classroomId,
            classroomName: place.classroomName,
            blockId: `${place.day}-${tpl.extendedProps?.subjectId}`
          }
        })
      }
      return out
    }

    const findRelocationForBlock = (block, liveEvents, excludedIds, forbiddenPlacements = [], depth = 0, inProcess = new Set()) => {
      const blockKey = `${block.day}|${block.subjectId}|${block.pnfId}|${block.trayectoId}|${block.seccion}|${block.classroomId}|${block.startSlotIdx}`
      if (inProcess.has(blockKey)) return null

      const blockSubject = currentSubjects?.find(s => s.innerId === block.subjectId)
      if (!blockSubject) return null
      const slots = activeTurnos[block.turnoName]
      if (!slots) return null

      const profRes = teacherRestrictions.find(r => String(r.teacherId) === String(block.professorId))
      const profDays = profRes?.days ? defaultDaysSwap.filter(d => !new Set(profRes.days).has(d)) : defaultDaysSwap
      const profRestrictedHours = profRes?.hours || []

      const subKey = `${normalizeText(blockSubject.subject)}_t_${normalizeText(blockSubject.trayectoName || '')}`
      const subPref = subjectRestriction.find(r => r.subjectKey === subKey)
      const blockCandidateRooms = (subPref?.classroomIds?.length || 0) > 0
        ? activeClassroomsSwap.filter(c => subPref.classroomIds.includes(c.id))
        : activeClassroomsSwap

      const eventsForOcc = liveEvents.filter(e => !excludedIds.has(getEventId(e)))
      const occ = buildOccupancyFrom(eventsForOcc)
      const sectionKey = `${block.pnfId}-${block.trayectoId}-${block.seccion}`

      const subjectHoursPerDay = new Map()
      for (const ev of eventsForOcc) {
        if (ev.extendedProps?.subjectId !== block.subjectId) continue
        if (ev.extendedProps?.pnfId !== block.pnfId) continue
        if (ev.extendedProps?.trayectoId !== block.trayectoId) continue
        if (ev.extendedProps?.seccion !== block.seccion) continue
        const d = ev.daysOfWeek?.[0]
        if (d == null) continue
        subjectHoursPerDay.set(d, (subjectHoursPerDay.get(d) || 0) + 1)
      }

      for (const day of profDays) {
        const existingHours = subjectHoursPerDay.get(day) || 0
        if (existingHours + block.length > maxPerDaySwap) continue
        for (let startIdx = 0; startIdx <= slots.length - block.length; startIdx++) {
          let forbidden = false
          for (const fp of forbiddenPlacements) {
            if (fp.day !== day) continue
            const aStart = startIdx; const aEnd = startIdx + block.length
            const bStart = fp.startIdx; const bEnd = fp.startIdx + fp.length
            if (aStart < bEnd && bStart < aEnd) { forbidden = true; break }
          }
          if (forbidden) continue
          let crossesBreak = false
          if (scheduleConfig?.breaks?.length) {
            for (let k = 1; k < block.length; k++) {
              const prevEnd = slots[startIdx + k - 1][1]
              const currStart = slots[startIdx + k][0]
              if (scheduleConfig.breaks.some(b => prevEnd <= b.start && currStart >= b.end)) { crossesBreak = true; break }
            }
          }
          if (crossesBreak) continue
          let restricted = false
          for (let i = 0; i < block.length; i++) {
            const [slotStart] = slots[startIdx + i]
            if (profRestrictedHours.some(rh => rh.day === day && rh.start === slotStart)) { restricted = true; break }
          }
          if (restricted) continue
          let clash = false
          for (let i = 0; i < block.length; i++) {
            const [slotStart] = slots[startIdx + i]
            const o = occ.get(`${day}-${slotStart}`)
            if (!o) continue
            if (block.professorId && o.profs.has(String(block.professorId))) { clash = true; break }
            if (o.secs.has(sectionKey)) { clash = true; break }
          }
          if (clash) continue
          for (const cr of blockCandidateRooms) {
            let roomOk = true
            for (let i = 0; i < block.length; i++) {
              const [slotStart] = slots[startIdx + i]
              const o = occ.get(`${day}-${slotStart}`)
              if (o?.rooms.has(String(cr.id))) { roomOk = false; break }
            }
            if (!roomOk) continue
            if (day === block.day && startIdx === block.startSlotIdx && String(cr.id) === String(block.classroomId)) continue
            return { day, startSlotIdx: startIdx, classroomId: cr.id, classroomName: cr.classroom }
          }
        }
      }

      // ─── CASCADE (depth 0 only) ───
      if (depth >= 1 || cascadeAttempts >= MAX_CASCADE_ATTEMPTS) return null
      const nextInProcess = new Set(inProcess)
      nextInProcess.add(blockKey)
      const baseMovableBlocks = buildBlocksFrom(eventsForOcc.filter(isEventMovable))

      for (const day of profDays) {
        for (let startIdx = 0; startIdx <= slots.length - block.length; startIdx++) {
          let forbidden = false
          for (const fp of forbiddenPlacements) {
            if (fp.day !== day) continue
            const aStart = startIdx; const aEnd = startIdx + block.length
            const bStart = fp.startIdx; const bEnd = fp.startIdx + fp.length
            if (aStart < bEnd && bStart < aEnd) { forbidden = true; break }
          }
          if (forbidden) continue
          let crossesBreak = false
          if (scheduleConfig?.breaks?.length) {
            for (let k = 1; k < block.length; k++) {
              const prevEnd = slots[startIdx + k - 1][1]
              const currStart = slots[startIdx + k][0]
              if (scheduleConfig.breaks.some(b => prevEnd <= b.start && currStart >= b.end)) { crossesBreak = true; break }
            }
          }
          if (crossesBreak) continue
          let restricted = false
          for (let i = 0; i < block.length; i++) {
            const [slotStart] = slots[startIdx + i]
            if (profRestrictedHours.some(rh => rh.day === day && rh.start === slotStart)) { restricted = true; break }
          }
          if (restricted) continue
          if (day === block.day && startIdx === block.startSlotIdx) continue

          for (const cr of blockCandidateRooms) {
            if (cascadeAttempts >= MAX_CASCADE_ATTEMPTS) return null
            cascadeAttempts++
            const cascadeBlockerIds = new Set()
            const cascadeBlockers = []
            let unmovable = false
            for (let i = 0; i < block.length; i++) {
              const [slotStart] = slots[startIdx + i]
              const o = occ.get(`${day}-${slotStart}`)
              if (!o) continue
              for (const ev of o.eventsAt) {
                const p = ev.extendedProps || {}
                const profConf = !!(block.professorId && String(p.professorId) === String(block.professorId))
                const roomConf = String(p.classroomId) === String(cr.id)
                const secConf = `${p.pnfId}-${p.trayectoId}-${p.seccion}` === sectionKey
                if (!profConf && !roomConf && !secConf) continue
                if (!isEventMovable(ev)) { unmovable = true; break }
                const id = getEventId(ev)
                if (!cascadeBlockerIds.has(id)) { cascadeBlockerIds.add(id); cascadeBlockers.push(ev) }
              }
              if (unmovable) break
            }
            if (unmovable) continue
            if (cascadeBlockers.length === 0) continue

            const cascadeBlockerKeys = new Set()
            for (const ev of cascadeBlockers) {
              const p = ev.extendedProps || {}
              cascadeBlockerKeys.add(`${ev.daysOfWeek?.[0]}|${p.subjectId}|${p.pnfId}|${p.trayectoId}|${p.seccion}|${p.classroomId}`)
            }
            const cascadeBlockerBlocks = baseMovableBlocks.filter(b => {
              const k = `${b.day}|${b.subjectId}|${b.pnfId}|${b.trayectoId}|${b.seccion}|${b.classroomId}`
              return cascadeBlockerKeys.has(k)
            })
            if (cascadeBlockerBlocks.some(b => {
              const k = `${b.day}|${b.subjectId}|${b.pnfId}|${b.trayectoId}|${b.seccion}|${b.classroomId}|${b.startSlotIdx}`
              return inProcess.has(k) || nextInProcess.has(k)
            })) continue

            const cascadeMoves = []
            const cascadeTempExcluded = new Set(excludedIds)
            for (const bk of cascadeBlockerBlocks) for (const ev of bk.events) cascadeTempExcluded.add(getEventId(ev))
            const cascadeForbidden = [...forbiddenPlacements, { day, startIdx, length: block.length }]
            let allOk = true
            for (const bk of cascadeBlockerBlocks) {
              const simLive = eventsForOcc
                .filter(e => !cascadeTempExcluded.has(getEventId(e)))
                .concat(...cascadeMoves.map(cm => buildRelocatedEvents(cm.block, cm.newPlace)))
              const sub = findRelocationForBlock(bk, simLive, new Set(), cascadeForbidden, depth + 1, nextInProcess)
              if (!sub) { allOk = false; break }
              cascadeMoves.push({ block: bk, newPlace: sub })
            }
            if (!allOk) continue
            return { day, startSlotIdx: startIdx, classroomId: cr.id, classroomName: cr.classroom, cascade: cascadeMoves }
          }
        }
      }

      return null
    }

    const flattenRelocation = (block, place) => {
      const out = []
      if (place.cascade && place.cascade.length > 0) {
        for (const cm of place.cascade) out.push(...flattenRelocation(cm.block, cm.newPlace))
      }
      out.push({ block, newPlace: place })
      return out
    }

    // ─── COMPACTION (left-shift) ─────────────────────────────────────────
    const tryCompactBlock = (block, liveEvents) => {
      const newStartIdx = block.startSlotIdx - 1
      if (newStartIdx < 0) return null
      const slots = activeTurnos[block.turnoName]
      if (!slots) return null
      const blockSubject = currentSubjects?.find(s => s.innerId === block.subjectId)
      if (!blockSubject) return null
      const profRes = teacherRestrictions.find(r => String(r.teacherId) === String(block.professorId))
      if (profRes?.days && profRes.days.includes(block.day)) return null
      const profRestrictedHours = profRes?.hours || []
      const subKey = `${normalizeText(blockSubject.subject)}_t_${normalizeText(blockSubject.trayectoName || '')}`
      const subPref = subjectRestriction.find(r => r.subjectKey === subKey)
      if (subPref?.isExclusive && (subPref.classroomIds?.length || 0) > 0) {
        if (!subPref.classroomIds.includes(block.classroomId)) return null
      }
      const [newStart] = slots[newStartIdx]
      if (profRestrictedHours.some(rh => rh.day === block.day && rh.start === newStart)) return null
      if (scheduleConfig?.breaks?.length) {
        const newEnd = slots[newStartIdx][1]
        const currStart = slots[block.startSlotIdx][0]
        if (scheduleConfig.breaks.some(b => newEnd <= b.start && currStart >= b.end)) return null
      }
      const ownIds = new Set(block.events.map(e => getEventId(e)))
      const eventsForCheck = liveEvents.filter(e => !ownIds.has(getEventId(e)))
      const sectionKey = `${block.pnfId}-${block.trayectoId}-${block.seccion}`
      for (const ev of eventsForCheck) {
        if (ev.daysOfWeek?.[0] !== block.day || ev.startTime !== newStart) continue
        const p = ev.extendedProps || {}
        if (block.professorId && String(p.professorId) === String(block.professorId)) return null
        if (String(p.classroomId) === String(block.classroomId)) return null
        if (`${p.pnfId}-${p.trayectoId}-${p.seccion}` === sectionKey) return null
      }
      const lastSlotIdxNew = newStartIdx + block.length - 1
      const sameSubjDayEvents = eventsForCheck.filter(e =>
        e.daysOfWeek?.[0] === block.day &&
        e.extendedProps?.subjectId === block.subjectId &&
        `${e.extendedProps?.pnfId}-${e.extendedProps?.trayectoId}-${e.extendedProps?.seccion}` === sectionKey
      )
      for (const ev of sameSubjDayEvents) {
        const idx = slots.findIndex(s => s[0] === ev.startTime)
        if (idx < 0) continue
        if (idx > lastSlotIdxNew + 1 || idx < newStartIdx - 1) return null
      }
      return newStartIdx
    }

    {
      let liveCompact = currentAllEvents.slice()
      let compactChanged = true
      let compactIters = 0
      while (compactChanged && compactIters < 10) {
        compactChanged = false
        compactIters++
        const movable = buildBlocksFrom(liveCompact.filter(isEventMovable))
        movable.sort((a, b) => a.day - b.day || a.startSlotIdx - b.startSlotIdx)
        for (const bk of movable) {
          const newStartIdx = tryCompactBlock(bk, liveCompact)
          if (newStartIdx === null || newStartIdx === bk.startSlotIdx) continue
          const oldIds = new Set(bk.events.map(e => getEventId(e)))
          const newEvents = buildRelocatedEvents(bk, {
            day: bk.day,
            startSlotIdx: newStartIdx,
            classroomId: bk.classroomId,
            classroomName: bk.events[0].extendedProps?.classroomName || ''
          })
          liveCompact = liveCompact.filter(e => !oldIds.has(getEventId(e))).concat(newEvents)
          for (const id of oldIds) swapRemovedEventIds.add(id)
          swapRelocatedEvents.push(...newEvents)
          compactChanged = true
        }
      }
      if (swapRemovedEventIds.size > 0 || swapRelocatedEvents.length > 0) {
        currentAllEvents = currentAllEvents
          .filter(e => !swapRemovedEventIds.has(getEventId(e)))
          .concat(swapRelocatedEvents)
      }
    }

    // ─── Iterate unresolved errors ───
    for (const errorInfo of unresolvedErrors) {
      if (!errorInfo.subjectId) { finalUnresolvedErrors.push(errorInfo); continue }
      const subject = currentSubjects?.find(s => s.innerId === errorInfo.subjectId)
      if (!subject) { finalUnresolvedErrors.push(errorInfo); continue }
      const turnoName = subject.turnoName?.toLowerCase() || ''
      const slots = activeTurnos[turnoName]
      if (!slots?.length) { finalUnresolvedErrors.push(errorInfo); continue }
      const professorId = errorInfo.professorId || subject.quarter?.[trimestre] || null
      const sectionKey = `${subject.pnfId}-${subject.trayectoId}-${subject.seccion}`
      const hoursNeededTotal = errorInfo.totalHours || subject.hours?.[trimestre] || 0
      if (hoursNeededTotal <= 0) { finalUnresolvedErrors.push(errorInfo); continue }

      const profRes = teacherRestrictions.find(r => String(r.teacherId) === String(professorId))
      const targetProfDays = profRes?.days ? defaultDaysSwap.filter(d => !new Set(profRes.days).has(d)) : defaultDaysSwap
      const targetProfRestrictedHours = profRes?.hours || []

      const targetSubKey = `${normalizeText(subject.subject)}_t_${normalizeText(subject.trayectoName || '')}`
      const targetSubPref = subjectRestriction.find(r => r.subjectKey === targetSubKey)
      const targetPrefClassrooms = (targetSubPref?.classroomIds?.length || 0) > 0
        ? activeClassroomsSwap.filter(c => targetSubPref.classroomIds.includes(c.id))
        : activeClassroomsSwap

      let placed = 0
      const placedEventsForSubject = []
      const reloLocal = []

      let safety = 15
      while (placed < hoursNeededTotal && safety-- > 0) {
        const baseLive = currentAllEvents
          .filter(e => !swapRemovedEventIds.has(getEventId(e)))
          .concat(swapSolvedEvents, swapRelocatedEvents)
        const localRemovedIds = new Set()
        for (const rl of reloLocal) for (const id of rl.oldIds) localRemovedIds.add(id)
        const localNewEvents = []
        for (const rl of reloLocal) localNewEvents.push(...rl.newEvents)
        const liveEvents = baseLive
          .filter(e => !localRemovedIds.has(getEventId(e)))
          .concat(localNewEvents, placedEventsForSubject)
        const movableBlocks = buildBlocksFrom(liveEvents.filter(isEventMovable))

        const subjHoursOnDay = day => liveEvents.filter(e =>
          e.daysOfWeek?.[0] === day &&
          e.extendedProps?.subjectId === subject.innerId &&
          e.extendedProps?.pnfId === subject.pnfId &&
          e.extendedProps?.trayectoId === subject.trayectoId &&
          e.extendedProps?.seccion === subject.seccion
        ).length

        const remaining = hoursNeededTotal - placed
        const minBlockSize = preventSingleSwap ? 2 : 1
        const maxBlockLen = Math.min(remaining, maxPerDaySwap)
        let madeProgress = false

        outer:
        for (let blockLen = maxBlockLen; blockLen >= Math.min(minBlockSize, remaining); blockLen--) {
          if (blockLen > remaining) continue
          if (preventSingleSwap && remaining - blockLen === 1) continue
          for (const day of targetProfDays) {
            if (subjHoursOnDay(day) + blockLen > maxPerDaySwap) continue
            for (let startIdx = 0; startIdx <= slots.length - blockLen; startIdx++) {
              let bad = false
              for (let i = 0; i < blockLen; i++) {
                const [slotStart] = slots[startIdx + i]
                if (targetProfRestrictedHours.some(rh => rh.day === day && rh.start === slotStart)) { bad = true; break }
              }
              if (bad) continue
              if (scheduleConfig?.breaks?.length) {
                for (let i = 1; i < blockLen; i++) {
                  const prevEnd = slots[startIdx + i - 1][1]
                  const currStart = slots[startIdx + i][0]
                  if (scheduleConfig.breaks.some(b => prevEnd <= b.start && currStart >= b.end)) { bad = true; break }
                }
              }
              if (bad) continue
              for (const cr of targetPrefClassrooms) {
                const occ = buildOccupancyFrom(liveEvents)
                const blockerEvents = []
                const blockerIds = new Set()
                let unmovable = false
                for (let i = 0; i < blockLen; i++) {
                  const [slotStart] = slots[startIdx + i]
                  const o = occ.get(`${day}-${slotStart}`)
                  if (!o) continue
                  for (const ev of o.eventsAt) {
                    const p = ev.extendedProps || {}
                    const profConf = !!(professorId && String(p.professorId) === String(professorId))
                    const roomConf = String(p.classroomId) === String(cr.id)
                    const secConf = `${p.pnfId}-${p.trayectoId}-${p.seccion}` === sectionKey
                    if (!profConf && !roomConf && !secConf) continue
                    if (!isEventMovable(ev)) { unmovable = true; break }
                    const id = getEventId(ev)
                    if (!blockerIds.has(id)) { blockerIds.add(id); blockerEvents.push(ev) }
                  }
                  if (unmovable) break
                }
                if (unmovable) continue

                const blockerBlockKeys = new Set()
                for (const ev of blockerEvents) {
                  const p = ev.extendedProps || {}
                  blockerBlockKeys.add(`${ev.daysOfWeek?.[0]}|${p.subjectId}|${p.pnfId}|${p.trayectoId}|${p.seccion}|${p.classroomId}`)
                }
                const blockerBlocks = movableBlocks.filter(b => {
                  const k = `${b.day}|${b.subjectId}|${b.pnfId}|${b.trayectoId}|${b.seccion}|${b.classroomId}`
                  return blockerBlockKeys.has(k)
                })
                if (blockerBlocks.some(b =>
                  b.subjectId === subject.innerId && b.pnfId === subject.pnfId &&
                  b.trayectoId === subject.trayectoId && b.seccion === subject.seccion
                )) continue

                const reloPlans = []
                const tempExcluded = new Set()
                for (const bk of blockerBlocks) for (const ev of bk.events) tempExcluded.add(getEventId(ev))
                const forbidden = [{ day, startIdx, length: blockLen }]
                let allRelocated = true
                for (const bk of blockerBlocks) {
                  const simRelocated = []
                  for (const rp of reloPlans) {
                    for (const { block: fb, newPlace } of flattenRelocation(rp.block, rp.newPlace)) {
                      simRelocated.push(...buildRelocatedEvents(fb, newPlace))
                    }
                  }
                  const simLive = liveEvents
                    .filter(e => !tempExcluded.has(getEventId(e)))
                    .concat(simRelocated)
                  const newPlace = findRelocationForBlock(bk, simLive, new Set(), forbidden)
                  if (!newPlace) { allRelocated = false; break }
                  reloPlans.push({ block: bk, newPlace })
                  if (newPlace.cascade) {
                    for (const { block: fb } of flattenRelocation(bk, newPlace)) {
                      for (const ev of fb.events) tempExcluded.add(getEventId(ev))
                    }
                  }
                }
                if (!allRelocated) continue

                const newEventsFromPlans = []
                for (const rp of reloPlans) {
                  for (const { block: fb, newPlace } of flattenRelocation(rp.block, rp.newPlace)) {
                    newEventsFromPlans.push(...buildRelocatedEvents(fb, newPlace))
                  }
                }
                const oldIds = Array.from(tempExcluded)
                if (oldIds.length > 0 || newEventsFromPlans.length > 0) {
                  reloLocal.push({ oldIds, newEvents: newEventsFromPlans })
                }

                for (let i = 0; i < blockLen; i++) {
                  const [s, e] = slots[startIdx + i]
                  placedEventsForSubject.push({
                    title: subject.subject,
                    daysOfWeek: [day],
                    startTime: s,
                    endTime: e,
                    extendedProps: {
                      subjectId: subject.innerId,
                      professorId: professorId || null,
                      classroomId: cr.id,
                      classroomName: cr.classroom,
                      pnfId: subject.pnfId,
                      trayectoId: subject.trayectoId,
                      trayectoName: subject.trayectoName,
                      seccion: subject.seccion,
                      pnfName: subject.pnf,
                      turnName: subject.turnoName,
                      blockId: `${day}-${subject.innerId}`
                    }
                  })
                }
                placed += blockLen
                madeProgress = true
                break outer
              }
            }
          }
        }
        if (!madeProgress) break
      }

      if (placed > 0) {
        for (const rl of reloLocal) {
          for (const id of rl.oldIds) swapRemovedEventIds.add(id)
          swapRelocatedEvents.push(...rl.newEvents)
        }
        swapSolvedEvents.push(...placedEventsForSubject)
        if (placed < hoursNeededTotal) {
          finalUnresolvedErrors.push({
            ...errorInfo,
            totalHours: hoursNeededTotal - placed,
            description: `${errorInfo.description || ''} (Intercambio liberó ${placed}h)`.trim()
          })
        }
      } else {
        finalUnresolvedErrors.push(errorInfo)
      }
    }
  }

  // ─── Apply changes to eventsdata using Map keyed by getEventId ──────────
  if (swapSolvedEvents.length > 0 || swapRelocatedEvents.length > 0 || swapRemovedEventIds.size > 0 || newlySolvedEvents.length > 0) {
    const finalMap = new Map()
    for (const e of eventsdata) {
      const id = getEventId(e)
      if (swapRemovedEventIds.has(id)) continue
      finalMap.set(id, e)
    }
    for (const e of newlySolvedEvents) finalMap.set(getEventId(e), e)
    for (const e of swapRelocatedEvents) {
      const id = getEventId(e)
      if (swapRemovedEventIds.has(id)) continue
      finalMap.set(id, e)
    }
    for (const e of swapSolvedEvents) finalMap.set(getEventId(e), e)
    eventsdata = Array.from(finalMap.values())
  }

  const effectiveUnresolved = unresolvedErrors.length > 0 ? finalUnresolvedErrors : unresolvedErrors

  return {
    eventsdata,
    errors: effectiveUnresolved,
    solvedCount,
    swapSolvedCount: swapSolvedEvents.length
  }
}

// ---------------------------------------------------------------------------
// 4. PHANTOM EVENT REMOVAL
// ---------------------------------------------------------------------------

/**
 * Remove duplicate events that occupy the same slot of the same section
 * (sanity check after auto-solve).
 * @param {any[]} eventsdata
 * @returns {any[]}
 */
export function removePhantomEvents (eventsdata) {
  const slotMap = new Map()
  let hasDup = false
  for (const ev of eventsdata) {
    const p = ev.extendedProps || {}
    const slotKey = `${p.pnfId}-${p.trayectoId}-${p.seccion}-${ev.daysOfWeek?.[0]}-${ev.startTime}`
    if (slotMap.has(slotKey)) { hasDup = true; continue }
    slotMap.set(slotKey, ev)
  }
  return hasDup ? Array.from(slotMap.values()) : eventsdata
}

// ---------------------------------------------------------------------------
// 5. FROZEN SECTIONS ENFORCEMENT
// ---------------------------------------------------------------------------

/**
 * Replace events for frozen sections with the persisted source-of-truth.
 * Frozen sections must NEVER change during regeneration.
 * @param {any[]} eventsdata
 * @param {Record<string, any[]>} lockedSections
 * @param {string} trimestre
 * @returns {any[]}
 */
export function enforceFrozenSections (eventsdata, lockedSections, trimestre) {
  const frozenSectionKeys = new Set()
  for (const key of Object.keys(lockedSections || {})) {
    if (!key.endsWith(`-${trimestre}`)) continue
    const lastDash = key.lastIndexOf('-')
    frozenSectionKeys.add(key.slice(0, lastDash))
  }
  if (frozenSectionKeys.size === 0) return eventsdata

  const nonFrozen = eventsdata.filter(ev => {
    const sectionKey = `${ev.extendedProps?.pnfId}-${ev.extendedProps?.trayectoId}-${ev.extendedProps?.seccion}`
    return !frozenSectionKeys.has(sectionKey)
  })
  const persisted = []
  for (const key of Object.keys(lockedSections || {})) {
    if (!key.endsWith(`-${trimestre}`)) continue
    const events = lockedSections[key] || []
    for (const ev of events) persisted.push(ev)
  }
  return [...nonFrozen, ...persisted]
}
