const MAX_VERSIONS = 100

// =====================================================
// Schedule state service — the single authoritative writer for the
// backend-driven schedule state. Every socket action handler MUST go
// through `applyAction`; no direct model writes.
//
// State shape (per proyection_id + trimestre):
//   {
//     eventData:           ScheduleEvent[]
//     stagedEvents:        ScheduleEvent[]
//     lockedSections:      { [sectionKey]: ScheduleEvent[] }
//     classroomOverrides:  ClassroomOverride[]
//     scheduleConfig:      object
//   }
//
// Versioning: each successful mutation increments `version` by 1 and the
// full state is persisted as JSON in `schedules.state_snapshot`. Clients
// send `baseVersion`; if it does not match the current version on disk,
// the handler throws a VERSION_CONFLICT error and the caller is expected
// to re-sync with `getState`.
// =====================================================

import sequelize from '#dataBaseConnection'
import { Op } from 'sequelize'
import Schedule from '#models/schedule/schedule.js'
import ScheduleVersion from '#models/schedule/scheduleVersion.js'

/** @typedef {'q1' | 'q2' | 'q3'} Trimestre */

/** Normalised schedule row name: `schedule-<proyectionId>-<trimestre>`. */
export function buildRowName (proyectionId, trimestre) {
  return `schedule-${proyectionId}-${trimestre}`
}

/**
 * Default empty state.
 * @returns {import('./stateTypes.js').ScheduleState}
 */
export function emptyState () {
  return {
    eventData: [],
    stagedEvents: [],
    lockedSections: {},
    classroomOverrides: [],
    scheduleConfig: {}
  }
}

/**
 * Error thrown on version mismatch. The caller must send a fresh snapshot
 * back to the client.
 */
export class VersionConflictError extends Error {
  /**
   * @param {number} expected
   * @param {number} current
   */
  constructor (expected, current) {
    super(`version conflict: expected=${expected}, current=${current}`)
    this.code = 'VERSION_CONFLICT'
    this.expected = expected
    this.currentVersion = current
  }
}

/**
 * Generic validation error surfaced to the client.
 */
export class ValidationError extends Error {
  /**
   * @param {string} message
   */
  constructor (message) {
    super(message)
    this.code = 'VALIDATION'
  }
}

/**
 * Load current `{ version, state }` for a `(proyection, trim)` pair.
 * If no row exists yet, returns a fresh empty state at version 0 without
 * creating a row (the row is lazily inserted on the first write).
 *
 * @param {string} proyectionId
 * @param {Trimestre} trimestre
 * @returns {Promise<{ row: any | null, version: number, state: import('./stateTypes.js').ScheduleState }>}
 */
export async function getState (proyectionId, trimestre) {
  const name = buildRowName(proyectionId, trimestre)
  const row = await Schedule.findOne({ where: { name }, raw: false })
  if (!row) {
    return { row: null, version: 0, state: emptyState() }
  }
  const version = Number(row.get('version') ?? 0)
  const snapshot = row.get('state_snapshot')
  let state
  if (snapshot && typeof snapshot === 'object') {
    state = { ...emptyState(), ...snapshot }
  } else if (typeof snapshot === 'string' && snapshot.length > 0) {
    try {
      state = { ...emptyState(), ...JSON.parse(snapshot) }
    } catch {
      state = emptyState()
    }
  } else {
    state = emptyState()
  }
  return { row, version, state }
}

/**
 * Save the current state as a version snapshot in the schedule_versions table,
 * then prune versions beyond the last 100 for this (proyectionId, trimestre).
 *
 * @param {object} opts
 * @param {string} opts.rowName
 * @param {string} opts.proyectionId
 * @param {Trimestre} opts.trimestre
 * @param {number} opts.versionNumber
 * @param {import('./stateTypes.js').ScheduleState} opts.state
 * @param {string} [opts.changeType] — 'autosave' (default) | 'manual' | handler name
 * @param {string} [opts.description]
 * @param {import('sequelize').Transaction} opts.transaction
 */
async function saveVersionSnapshot ({ rowName, proyectionId, trimestre, versionNumber, state, changeType = 'autosave', description, transaction: tx }) {
  console.log(`[stateService] saving version ${versionNumber} (${changeType}) for ${rowName}`)
  await ScheduleVersion.create({
    row_name: rowName,
    proyection_id: proyectionId,
    trimestre,
    version_number: versionNumber,
    state_snapshot: state,
    change_type: changeType,
    description: description || null,
  }, { transaction: tx })

  const count = await ScheduleVersion.count({
    where: { row_name: rowName },
    transaction: tx,
  })
  if (count > 100) {
    const rows = await ScheduleVersion.findAll({
      where: { row_name: rowName },
      order: [['version_number', 'DESC']],
      offset: 99,
      limit: 1,
      attributes: ['version_number'],
      transaction: tx,
    })
    if (rows.length > 0) {
      await ScheduleVersion.destroy({
        where: {
          row_name: rowName,
          version_number: { [Op.lt]: rows[0].version_number },
        },
        transaction: tx,
      })
    }
  }
}

/**
 * Apply a mutator to the state inside a transaction with optimistic locking.
 *
 * The `mutator` receives the current state and returns the new one (or a
 * Promise resolving to it). It MUST be pure (or at worst idempotent) — do
 * not perform side-effects that cannot be retried.
 *
 * @template T
 * @param {{
 *   proyectionId: string,
 *   trimestre: Trimestre,
 *   baseVersion: number,
 *   mutator: (state: import('./stateTypes.js').ScheduleState) => import('./stateTypes.js').ScheduleState | Promise<import('./stateTypes.js').ScheduleState>,
 *   changeType?: string,
 *   changeDescription?: string,
 * }} params
 * @returns {Promise<{ version: number, state: import('./stateTypes.js').ScheduleState }>}
 */
export async function applyAction ({ proyectionId, trimestre, baseVersion, mutator, changeType, changeDescription }) {
  return sequelize.transaction(async (tx) => {
    const name = buildRowName(proyectionId, trimestre)
    const existing = await Schedule.findOne({
      where: { name },
      transaction: tx,
      lock: tx.LOCK.UPDATE
    })

    const currentVersion = existing ? Number(existing.get('version') ?? 0) : 0
    if (baseVersion !== currentVersion) {
      throw new VersionConflictError(baseVersion, currentVersion)
    }

    const currentState = existing
      ? (() => {
          const snap = existing.get('state_snapshot')
          if (snap && typeof snap === 'object') return { ...emptyState(), ...snap }
          if (typeof snap === 'string' && snap.length > 0) {
            try { return { ...emptyState(), ...JSON.parse(snap) } } catch { return emptyState() }
          }
          return emptyState()
        })()
      : emptyState()

    // Save current state as a version snapshot before applying the mutation.
    // This enables the "Abrir" modal to show the last 100 changes and allows
    // users to restore any previous version.
    try {
      await saveVersionSnapshot({
        rowName: name,
        proyectionId,
        trimestre,
        versionNumber: currentVersion,
        state: currentState,
        changeType: changeType || 'autosave',
        description: changeDescription || null,
        transaction: tx,
      })
    } catch (err) {
      console.error('[stateService] Failed to save version snapshot:', err.message)
      // Non-blocking: the mutation proceeds even if version saving fails
    }

    const nextState = await mutator(currentState)
    const nextVersion = currentVersion + 1

    if (existing) {
      existing.set('version', nextVersion)
      existing.set('state_snapshot', nextState)
      // Keep the legacy `schedule` TEXT column in sync with eventData so
      // pre-existing consumers keep working (see `getSchedule` query).
      existing.set('schedule', JSON.stringify(nextState.eventData || []))
      if (nextState.stagedEvents) existing.set('staged', nextState.stagedEvents)
      await existing.save({ transaction: tx })
    } else {
      await Schedule.create({
        name,
        proyection_id: proyectionId,
        schedule: JSON.stringify(nextState.eventData || []),
        version: nextVersion,
        staged: nextState.stagedEvents || [],
        state_snapshot: nextState
      }, { transaction: tx })
    }

    return { version: nextVersion, state: nextState }
  })
}

/**
 * Retrieve the last N version snapshots for a (proyectionId, trimestre) pair.
 * Returns at most MAX_VERSIONS (100) entries, ordered by version_number DESC.
 *
 * @param {string} proyectionId
 * @param {Trimestre} trimestre
 * @returns {Promise<Array<{ id: string, version_number: number, change_type: string, description: string|null, created_at: string }>>}
 */
export async function getVersions (proyectionId, trimestre) {
  const name = buildRowName(proyectionId, trimestre)
  const rows = await ScheduleVersion.findAll({
    where: { row_name: name },
    order: [['version_number', 'DESC']],
    limit: MAX_VERSIONS,
    attributes: ['id', 'version_number', 'change_type', 'description', 'created_at'],
    raw: true,
  })
  return rows
}

/**
 * Load the full state snapshot for a specific version by its id.
 *
 * @param {string} versionId
 * @returns {Promise<import('./stateTypes.js').ScheduleState|null>}
 */
export async function getVersionState (versionId) {
  const row = await ScheduleVersion.findByPk(versionId, {
    attributes: ['state_snapshot'],
    raw: true,
  })
  if (!row) return null
  const snap = row.state_snapshot
  if (!snap) return null
  if (typeof snap === 'object') return { ...emptyState(), ...snap }
  try {
    return { ...emptyState(), ...JSON.parse(snap) }
  } catch {
    return null
  }
}

/**
 * Manually save a version snapshot. Used by the "Guardar" button to create a
 * named version.
 *
 * @param {object} opts
 * @param {string} opts.proyectionId
 * @param {Trimestre} opts.trimestre
 * @param {import('./stateTypes.js').ScheduleState} opts.state
 * @param {string} opts.changeType
 * @param {string} [opts.description]
 */
export async function saveManualVersion ({ proyectionId, trimestre, state, changeType = 'manual', description }) {
  const name = buildRowName(proyectionId, trimestre)
  const { version: currentVersion } = await getState(proyectionId, trimestre)
  await sequelize.transaction(async (tx) => {
    await saveVersionSnapshot({
      rowName: name,
      proyectionId,
      trimestre,
      versionNumber: currentVersion,
      state,
      changeType,
      description,
      transaction: tx,
    })
  })
}
