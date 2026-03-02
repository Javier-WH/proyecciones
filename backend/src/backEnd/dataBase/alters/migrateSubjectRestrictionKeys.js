import sequelize from '#dataBaseConnection'
import { DataTypes } from 'sequelize'

const queryInterface = sequelize.getQueryInterface()
const TABLE_NAME = 'subjects_restrictions'

/**
 * Migration: Convert subject restriction keys to include trayecto.
 * 
 * Problem: Previously, subject_key was derived only from the subject name
 * (e.g., "matematica"). This caused the same subject (e.g., "MATEMÁTICA")
 * to share classroom restrictions across ALL trayectos, even though 
 * different trayectos may need different classroom assignments.
 * 
 * Solution: The new key format is "subjectname_t_trayectoname", allowing
 * per-trayecto restrictions. This migration:
 * 1. Widens subject_key from VARCHAR(36) to VARCHAR(255)
 * 2. Attempts to match existing restrictions with proyections data (stored as JSON in proyections table)
 *    to build the new compound key.
 * 3. Handles "unknown" key suffixes by attempting a repair if they are found.
 */
export default async function migrateSubjectRestrictionKeys() {
  try {
    const tableExists = await queryInterface.describeTable(TABLE_NAME).catch(() => null)
    if (!tableExists) {
      console.log('[migrateSubjectRestrictionKeys] Table does not exist yet, skipping.')
      return
    }

    const tableInfo = await queryInterface.describeTable(TABLE_NAME)

    // Step 1: Widen subject_key column from VARCHAR(36) to VARCHAR(255)
    if (tableInfo.subject_key) {
      const currentType = tableInfo.subject_key.type || ''
      if (currentType.includes('36') || currentType.includes('VARCHAR(36)')) {
        console.log('[migrateSubjectRestrictionKeys] Widening subject_key column to VARCHAR(255)...')
        await queryInterface.changeColumn(TABLE_NAME, 'subject_key', {
          type: DataTypes.STRING(255),
          allowNull: false,
        })
      }
    }

    // Step 2: Check if migration is needed or needs repair
    const [existingKeys] = await sequelize.query(
      `SELECT DISTINCT subject_key FROM ${TABLE_NAME} LIMIT 500`
    )

    const hasTrayectoKeys = existingKeys.some(row => row.subject_key && row.subject_key.includes('_t_'))
    const hasUnknownKeys = existingKeys.some(row => row.subject_key && row.subject_key.endsWith('_t_unknown'))

    if (hasTrayectoKeys && !hasUnknownKeys) {
      console.log('[migrateSubjectRestrictionKeys] Keys already contain trayecto info and no unknowns found, skipping.')
      return
    }

    if (existingKeys.length === 0) {
      console.log('[migrateSubjectRestrictionKeys] No existing restrictions to migrate.')
      return
    }

    if (hasUnknownKeys) {
      console.log('[migrateSubjectRestrictionKeys] Found "unknown" trayecto keys, attempting to repair...')
    } else {
      console.log(`[migrateSubjectRestrictionKeys] Found ${existingKeys.length} original subject keys to migrate...`)
    }

    // Step 3: Get all current restrictions
    const [restrictions] = await sequelize.query(
      `SELECT id, proyection_id, subject_key, subject_name, classroom_ids, pnf_id, is_exclusive, split_hours 
       FROM ${TABLE_NAME}`
    )

    // Step 4: Get trayecto data from proyections JSON
    const [proyections] = await sequelize.query('SELECT id, subjects FROM proyections')

    // Normalization logic MUST match frontend utils/textFilter.ts exactly
    const normalizeKey = (text) => {
      if (!text) return "";
      return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .toLowerCase()
        .replace(/\s/g, "");
    }

    // subjectTrayectoMap: proyectionId|normalizedSubject|pnfId -> Set of trayectoNames
    const subjectTrayectoMap = new Map()
    // fallbackMap: proyectionId|normalizedSubject -> Set of trayectoNames (ignoring pnfId)
    const fallbackMap = new Map()

    for (const proy of proyections) {
      if (!proy.subjects) continue
      try {
        const subjectsList = JSON.parse(proy.subjects)
        if (!Array.isArray(subjectsList)) continue

        for (const sub of subjectsList) {
          const normSub = normalizeKey(sub.subject)
          const trayectoName = sub.trayectoName
          if (!normSub || !trayectoName) continue

          const keyWithPnf = `${proy.id}|${normSub}|${sub.pnfId || ''}`
          if (!subjectTrayectoMap.has(keyWithPnf)) subjectTrayectoMap.set(keyWithPnf, new Set())
          subjectTrayectoMap.get(keyWithPnf).add(trayectoName)

          const keyFallback = `${proy.id}|${normSub}`
          if (!fallbackMap.has(keyFallback)) fallbackMap.set(keyFallback, new Set())
          fallbackMap.get(keyFallback).add(trayectoName)
        }
      } catch (e) {
        console.error(`[migrateSubjectRestrictionKeys] Error parsing subjects for proyection ${proy.id}:`, e)
      }
    }

    // Step 5: Build new/repaired restrictions
    const newRestrictions = []
    const seenRecords = new Set()

    for (const res of restrictions) {
      let baseKey = res.subject_key
      // If already has _t_, strip it to get the original base key
      if (baseKey.includes('_t_')) {
        baseKey = baseKey.split('_t_')[0]
      }

      const proyectionId = res.proyection_id
      const pnfId = res.pnf_id || ''

      // Try matching with pnfId first
      let trayectoSet = subjectTrayectoMap.get(`${proyectionId}|${baseKey}|${pnfId}`)

      // If no match, try fallback (ignore pnf_id)
      if (!trayectoSet || trayectoSet.size === 0) {
        trayectoSet = fallbackMap.get(`${proyectionId}|${baseKey}`)
      }

      if (trayectoSet && trayectoSet.size > 0) {
        for (const tName of trayectoSet) {
          const newKey = `${baseKey}_t_${normalizeKey(tName)}`
          const recordFingerprint = `${proyectionId}|${newKey}|${pnfId}`

          if (seenRecords.has(recordFingerprint)) continue
          seenRecords.add(recordFingerprint)

          newRestrictions.push({
            ...res,
            subject_key: newKey
          })
        }
      } else {
        // Still unknown, preserve it but don't lose the data
        const newKey = `${baseKey}_t_unknown`
        const recordFingerprint = `${proyectionId}|${newKey}|${pnfId}`

        if (seenRecords.has(recordFingerprint)) continue
        seenRecords.add(recordFingerprint)

        newRestrictions.push({
          ...res,
          subject_key: newKey
        })
      }
    }

    // Step 6: Apply in transaction
    const transaction = await sequelize.transaction()
    try {

      // Delete ALL records
      await sequelize.query(`DELETE FROM ${TABLE_NAME}`, { transaction })

      // Insert new records
      if (newRestrictions.length > 0) {
        for (const nr of newRestrictions) {
          await sequelize.query(
            `INSERT INTO ${TABLE_NAME} (id, proyection_id, subject_key, subject_name, classroom_ids, pnf_id, is_exclusive, split_hours, created_at, updated_at)
             VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            {
              replacements: [
                nr.proyection_id,
                nr.subject_key,
                nr.subject_name,
                typeof nr.classroom_ids === 'string' ? nr.classroom_ids : JSON.stringify(nr.classroom_ids),
                nr.pnf_id || null,
                nr.is_exclusive ? 1 : 0,
                nr.split_hours ? 1 : 0,
              ],
              transaction,
            }
          )
        }
      }


      await transaction.commit()
      console.log(`[migrateSubjectRestrictionKeys] Successfully processed/repaired ${restrictions.length} restrictions. Resulting in ${newRestrictions.length} rows.`)
    } catch (error) {
      await transaction.rollback()
      console.error('[migrateSubjectRestrictionKeys] Migration failed, rolled back:', error)
    }
  } catch (error) {
    console.error('[migrateSubjectRestrictionKeys] Error:', error)
  }
}
