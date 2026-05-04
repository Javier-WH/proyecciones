// =====================================================
// Load schedule restrictions from the database.
//
// These helpers fetch teacher restrictions, subject restrictions,
// classroom overrides, and locked sections, returning them in the
// format expected by the schedule engine.
// =====================================================

import TeachersRestrictions from '#models/teachers_restrictions'
import SubjectRestrictions from '#models/subjects_restrictions'
import ClassroomOverrides from '#models/classroom_overrides'
import LockedSections from '#models/frozen_sections'

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
  const rows = await SubjectRestrictions.findAll({
    where: { proyection_id: proyectionId }
  })
  return rows.map(row => ({
    subjectKey: row.subject_key,
    subjectName: row.subject_name,
    classroomIds: row.classroom_ids || [],
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
    subjectName: row.subject_name,
    day: row.day,
    startTime: row.start_time,
    endTime: row.end_time,
    classroomId: row.classroom_id,
    seccion: row.seccion,
    pnfId: row.pnf_id,
    trayectoId: row.trayecto_id
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
