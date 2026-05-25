// =====================================================
// Load schedule restrictions from the database.
//
// These helpers fetch teacher restrictions, subject restrictions,
// classroom overrides, and locked sections, returning them in the
// format expected by the schedule engine.
// =====================================================

import TeachersRestrictions from '#models/schedule/teacherRestrictions.js'
import SubjectRestrictions from '#models/schedule/subjectsRestrictions.js'
import ClassroomOverrides from '#models/schedule/classroomOverrides.js'
import LockedSections from '#models/schedule/lockedSections.js'

/**
 * Load all teacher restrictions from the database.
 * Returns an array matching the frontend shape:
 *   [{ teacherId, restrictedDays, restrictedHours }, ...]
 * @returns {Promise<Array>}
 */
export async function loadTeacherRestrictions () {
  const rows = await TeachersRestrictions.findAll()
  return rows.map(row => ({
    teacherId: row.teacher_id,
    days: row.restricted_days || [],
    hours: row.restricted_hours || []
  }))
}

/**
 * Load subject restrictions for a given projection.
 * Returns an array matching the frontend shape:
 *   [{ subjectKey, subjectName, classroomIds, pnfId, isExclusive, splitHours }, ...]
 * @param {string} proyectionId
 * @returns {Promise<Array>}
 */
export async function loadSubjectRestrictions (proyectionId) {
  let rows = await SubjectRestrictions.findAll({
    where: { proyection_id: proyectionId }
  })
  if (rows.length === 0) {
    rows = await SubjectRestrictions.findAll({
      where: { proyection_id: null }
    })
  }
  return rows.map(row => ({
    subjectKey: row.subject_key,
    subjectName: row.subject_name,
    classroomIds: Array.isArray(row.classroom_ids) ? row.classroom_ids : [],
    pnfId: row.pnf_id,
    isExclusive: row.is_exclusive,
    splitHours: row.split_hours
  }))
}

/**
 * Load classroom overrides for a given projection.
 * Returns an array matching the frontend shape:
 *   [{ subjectName, day, startTime, endTime, classroomId, seccion, pnfId, trayectoId }, ...]
 * @param {string} proyectionId
 * @returns {Promise<Array>}
 */
export async function loadClassroomOverrides (proyectionId) {
  const rows = await ClassroomOverrides.findAll({
    where: { proyection_id: proyectionId }
  })
  return rows.map(row => ({
    id: row.id,
    subject_name: row.subject_name,
    day: row.day,
    start_time: row.start_time,
    end_time: row.end_time,
    classroom_id: row.classroom_id,
    seccion: row.seccion,
    pnf_id: row.pnf_id,
    trayecto_id: row.trayecto_id
  }))
}

/**
 * Load locked sections for a given projection.
 * Returns a flat object matching the frontend shape:
 *   { sectionKey: [Event, ...], ... }
 * @param {string} proyectionId
 * @returns {Promise<Object>}
 */
export async function loadLockedSections (proyectionId) {
  const rows = await LockedSections.findAll({
    where: { proyection_id: proyectionId }
  })
  const result = {}
  for (const row of rows) {
    result[row.section_key] = row.events || []
  }
  return result
}
