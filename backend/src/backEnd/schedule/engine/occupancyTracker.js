// =====================================================
// OccupancyTracker — O(1) conflict detection + undo
// Ported verbatim from src/components/SchoolSchedule/fucntions.tsx
// =====================================================

export class OccupancyTracker {
  constructor () {
    /** @type {Set<string>} */
    this.profSlots = new Set()
    /** @type {Set<string>} */
    this.roomSlots = new Set()
    /** @type {Set<string>} */
    this.secSlots = new Set()
    /** @type {Map<string, number>} Counts per (subjectId, day) for conserveSlots enforcement */
    this.subjectDayCount = new Map()
    /** @type {Map<string, string[]>} Exact start times per (subjectId, day) for cross-task adjacency enforcement */
    this.subjectDayStartTimes = new Map()
  }

  /**
   * @param {number} day @param {string} s @param {string} pid
   * @returns {string}
   */
  pk (day, s, pid) { return `P|${day}|${s}|${pid}` }

  /**
   * @param {number} day @param {string} s @param {string} rid
   * @returns {string}
   */
  rk (day, s, rid) { return `R|${day}|${s}|${rid}` }

  /**
   * @param {number} day @param {string} s @param {string} pnf @param {string} tray @param {string} sec
   * @returns {string}
   */
  sk (day, s, pnf, tray, sec) { return `S|${day}|${s}|${pnf}|${tray}|${sec}` }

  /**
   * @param {string} subId @param {number} day
   * @returns {string}
   */
  sdk (subId, day) { return `${subId}|${day}` }

  /**
   * Mark a slot as occupied by a regular (non-ghost) event.
   * @param {number} day
   * @param {string} start
   * @param {string | null} profId
   * @param {string} roomId
   * @param {string} pnfId
   * @param {string} trayId
   * @param {string} sec
   * @param {string} subId
   */
  occupy (day, start, profId, roomId, pnfId, trayId, sec, subId) {
    if (profId) this.profSlots.add(this.pk(day, start, profId))
    this.roomSlots.add(this.rk(day, start, roomId))
    this.secSlots.add(this.sk(day, start, pnfId, trayId, sec))
    const k = this.sdk(subId, day)
    this.subjectDayCount.set(k, (this.subjectDayCount.get(k) || 0) + 1)
    if (!this.subjectDayStartTimes.has(k)) this.subjectDayStartTimes.set(k, [])
    this.subjectDayStartTimes.get(k).push(start)
  }

  /**
   * Cross-quarter ghost variant: blocks classroom+teacher only, does NOT mark
   * the section nor increment the subject-day counter. The same section in a
   * different calendar trimestre must not block itself.
   * @param {number} day
   * @param {string} start
   * @param {string | null} profId
   * @param {string} roomId
   */
  occupyGhost (day, start, profId, roomId) {
    if (profId) this.profSlots.add(this.pk(day, start, profId))
    this.roomSlots.add(this.rk(day, start, roomId))
  }

  /**
   * Undo a previous `occupy` call.
   * @param {number} day
   * @param {string} start
   * @param {string | null} profId
   * @param {string} roomId
   * @param {string} pnfId
   * @param {string} trayId
   * @param {string} sec
   * @param {string} subId
   */
  release (day, start, profId, roomId, pnfId, trayId, sec, subId) {
    if (profId) this.profSlots.delete(this.pk(day, start, profId))
    this.roomSlots.delete(this.rk(day, start, roomId))
    this.secSlots.delete(this.sk(day, start, pnfId, trayId, sec))
    const k = this.sdk(subId, day)
    const cur = this.subjectDayCount.get(k) || 0
    if (cur <= 1) this.subjectDayCount.delete(k)
    else this.subjectDayCount.set(k, cur - 1)
    const starts = this.subjectDayStartTimes.get(k)
    if (starts) {
      const idx = starts.indexOf(start)
      if (idx >= 0) starts.splice(idx, 1)
      if (starts.length === 0) this.subjectDayStartTimes.delete(k)
    }
  }

  /** @param {number} day @param {string} start @param {string | null} profId @returns {boolean} */
  hasProfConflict (day, start, profId) {
    return profId ? this.profSlots.has(this.pk(day, start, profId)) : false
  }

  /** @param {number} day @param {string} start @param {string} roomId @returns {boolean} */
  hasRoomConflict (day, start, roomId) {
    return this.roomSlots.has(this.rk(day, start, roomId))
  }

  /** @param {number} day @param {string} start @param {string} pnfId @param {string} trayId @param {string} sec @returns {boolean} */
  hasSectionConflict (day, start, pnfId, trayId, sec) {
    return this.secSlots.has(this.sk(day, start, pnfId, trayId, sec))
  }

  /** @param {string} subId @param {number} day @returns {number} */
  getSubjectDayHours (subId, day) {
    return this.subjectDayCount.get(this.sdk(subId, day)) || 0
  }

  /**
   * Returns all start times recorded for a subject on a given day (across ALL tasks).
   * @param {string} subId @param {number} day @returns {string[]}
   */
  getSubjectDayStartTimes (subId, day) {
    return this.subjectDayStartTimes.get(this.sdk(subId, day)) || []
  }
}
