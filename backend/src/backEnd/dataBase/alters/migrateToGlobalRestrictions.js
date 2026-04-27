import sequelize from '#dataBaseConnection'
import SubjectRestrictions from '#models/schedule/subjectsRestrictions.js'

/**
 * Migration script to convert subject restrictions from projection-specific to global
 * This script:
 * 1. Creates a backup of existing restrictions
 * 2. Modifies the table structure to allow proyection_id to be nullable
 * 3. Migrates existing restrictions to global (proyection_id = null)
 * 4. Updates indexes for global constraints
 */

export async function up () {
  try {
    console.log('Starting migration to global restrictions...')

    // Step 1: Create backup table
    console.log('Creating backup table...')
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS subjects_restrictions_backup AS 
      SELECT * FROM subjects_restrictions
    `)

    // Step 2: Start transaction for structural changes and data migration
    const transaction = await sequelize.transaction()
    try {
      // Drop foreign key constraint(s) on proyection_id before altering the column.
      // MySQL prevents MODIFY COLUMN when an FK references it with incompatible definition.
      console.log('Detecting and dropping foreign key(s) on proyection_id...')
      const [fkRows] = await sequelize.query(`
        SELECT CONSTRAINT_NAME 
        FROM information_schema.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'subjects_restrictions' 
          AND COLUMN_NAME = 'proyection_id' 
          AND REFERENCED_TABLE_NAME IS NOT NULL
      `, { transaction })

      const droppedFks = []
      for (const row of fkRows) {
        const fkName = row.CONSTRAINT_NAME
        console.log(`Dropping foreign key ${fkName}...`)
        await sequelize.query(
          `ALTER TABLE subjects_restrictions DROP FOREIGN KEY \`${fkName}\``,
          { transaction }
        )
        droppedFks.push(fkName)
      }

      // Ensure proyection_id allows NULL
      console.log('Allowing proyection_id column to accept NULL values...')
      await sequelize.query(`
        ALTER TABLE subjects_restrictions 
        MODIFY COLUMN proyection_id VARCHAR(36) NULL
      `, { transaction })

      // Recreate foreign key with ON DELETE SET NULL so global restrictions persist
      // when projections are deleted.
      if (droppedFks.length > 0) {
        console.log('Recreating foreign key on proyection_id (ON DELETE SET NULL)...')
        await sequelize.query(`
          ALTER TABLE subjects_restrictions 
          ADD CONSTRAINT subjects_restrictions_proyection_fk 
          FOREIGN KEY (proyection_id) REFERENCES proyections(id) 
          ON DELETE SET NULL ON UPDATE CASCADE
        `, { transaction }).catch(err => {
          console.warn('Could not recreate FK on proyection_id:', err.message)
        })
      }

      // Drop legacy unique indexes tied to proyection_id if they exist
      console.log('Removing legacy projection-specific indexes...')
      await sequelize.query(`
        ALTER TABLE subjects_restrictions 
        DROP INDEX subjects_restrictions_proj_subj_pnf_key
      `, { transaction }).catch(() => null)
      await sequelize.query(`
        ALTER TABLE subjects_restrictions 
        DROP INDEX subjects_restrictions_proyection_id_subject_key
      `, { transaction }).catch(() => null)
      await sequelize.query(`
        ALTER TABLE subjects_restrictions 
        DROP INDEX subjects_restrictions_proyection_subject_key
      `, { transaction }).catch(() => null)

      // Step 3: Load existing restrictions
      const existingRestrictions = await SubjectRestrictions.findAll({ raw: true, transaction })
      console.log(`Found ${existingRestrictions.length} existing restrictions to migrate`)

      // Helper to normalize classroom_ids values
      const parseObjectToArray = (value) => {
        if (!value || typeof value !== 'object') return []
        const raw = value.classroom_ids || value.classrooms || value
        if (Array.isArray(raw)) return raw
        if (typeof raw === 'string') {
          try {
            const parsed = JSON.parse(raw)
            return Array.isArray(parsed) ? parsed : []
          } catch (error) {
            return []
          }
        }
        return []
      }

      const normalizeClassroomIds = (value) => {
        if (!value) return []
        if (Array.isArray(value)) return value
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value)
            return Array.isArray(parsed) ? parsed : parseObjectToArray(parsed)
          } catch (error) {
            return [value]
          }
        }
        if (typeof value === 'object') {
          return parseObjectToArray(value)
        }
        return [value]
      }

      // Step 4: Consolidate records by subject_key + pnf_id
      console.log('Consolidating restrictions by subject and PNF...')
      const grouped = new Map()

      for (const restriction of existingRestrictions) {
        const groupKey = `${restriction.subject_key}::${restriction.pnf_id || 'NULL'}`
        const classroomIds = normalizeClassroomIds(restriction.classroom_ids)
        const normalizedRestriction = {
          ...restriction,
          proyection_id: null,
          classroom_ids: classroomIds,
          is_exclusive: Boolean(restriction.is_exclusive),
          split_hours: Boolean(restriction.split_hours)
        }

        const existing = grouped.get(groupKey)
        if (!existing) {
          grouped.set(groupKey, normalizedRestriction)
        } else {
          const mergedClassrooms = Array.from(new Set([...(existing.classroom_ids || []), ...classroomIds]))
          grouped.set(groupKey, {
            ...existing,
            classroom_ids: mergedClassrooms,
            is_exclusive: existing.is_exclusive || normalizedRestriction.is_exclusive,
            split_hours: existing.split_hours || normalizedRestriction.split_hours,
            updated_at: new Date()
          })
        }
      }

      // Step 5: Replace data with consolidated global records
      console.log('Replacing projection-specific restrictions with global records...')
      await sequelize.query('DELETE FROM subjects_restrictions', { transaction })

      for (const restriction of grouped.values()) {
        const {
          id,
          subject_key: subjectKey,
          subject_name: subjectName,
          classroom_ids: classroomIds,
          pnf_id: pnfId,
          is_exclusive: isExclusive,
          split_hours: splitHours
        } = restriction
        await SubjectRestrictions.create({
          id,
          proyection_id: null,
          subject_key: subjectKey,
          subject_name: subjectName,
          classroom_ids: classroomIds,
          pnf_id: pnfId || null,
          is_exclusive: isExclusive,
          split_hours: splitHours
        }, { transaction })
      }

      // Step 6: Ensure global unique index exists
      console.log('Ensuring global unique index (subject_key, pnf_id)...')
      await sequelize.query(`
        ALTER TABLE subjects_restrictions 
        ADD UNIQUE KEY subjects_restrictions_global_key (subject_key, pnf_id)
      `, { transaction }).catch(() => null)

      await transaction.commit()

      console.log('Migration completed successfully!')

      const globalRestrictions = await SubjectRestrictions.findAll({
        where: { proyection_id: null },
        raw: true
      })
      console.log(`Successfully migrated ${globalRestrictions.length} restrictions to global`)

      return { success: true, migrated: globalRestrictions.length }
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  }
}

export async function down () {
  try {
    console.log('Rolling back migration...')

    // Restore from backup if needed
    const [backupExists] = await sequelize.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_name = 'subjects_restrictions_backup'
    `, { type: sequelize.QueryTypes.SELECT })

    if (backupExists.count > 0) {
      console.log('Restoring from backup...')
      await sequelize.query(`
        TRUNCATE TABLE subjects_restrictions
      `)

      await sequelize.query(`
        INSERT INTO subjects_restrictions 
        SELECT * FROM subjects_restrictions_backup
      `)

      // Make proyection_id NOT NULL again
      await sequelize.query(`
        ALTER TABLE subjects_restrictions 
        MODIFY COLUMN proyection_id VARCHAR(36) NOT NULL
      `)

      // Remove global index
      await sequelize.query(`
        ALTER TABLE subjects_restrictions 
        DROP INDEX subjects_restrictions_global_key
      `)

      console.log('Rollback completed successfully')
    }

    return { success: true }
  } catch (error) {
    console.error('Rollback failed:', error)
    throw error
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  up()
    .then(result => {
      console.log('Migration result:', result)
      process.exit(0)
    })
    .catch(error => {
      console.error('Migration error:', error)
      process.exit(1)
    })
}
