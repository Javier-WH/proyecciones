import sequelize from '#dataBaseConnection'

/**
 * Additive migration for backend-driven schedule synchronisation.
 *
 * Adds three columns to `schedules`:
 *   - `version`         INT NOT NULL DEFAULT 0 — optimistic lock counter.
 *   - `staged`          JSON NULL            — per-schedule staging bucket.
 *   - `state_snapshot`  JSON NULL            — last full computed state cache.
 *
 * Safe to run multiple times: existence of every column is checked first.
 * Coordinate with the user before running in production (agents.md §4.2).
 */

async function columnExists (tableName, columnName) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS c
       FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = :tableName
        AND column_name = :columnName`,
    { replacements: { tableName, columnName } }
  )
  return Number(rows[0].c) > 0
}

export async function up () {
  console.log('🔧 Adding backend-schedule-sync columns to schedules...')

  if (!(await columnExists('schedules', 'version'))) {
    await sequelize.query(
      'ALTER TABLE schedules ADD COLUMN `version` INT NOT NULL DEFAULT 0'
    )
    console.log('  ✅ Added column `version`')
  } else {
    console.log('  ℹ️  Column `version` already present')
  }

  if (!(await columnExists('schedules', 'staged'))) {
    await sequelize.query(
      'ALTER TABLE schedules ADD COLUMN `staged` JSON NULL'
    )
    console.log('  ✅ Added column `staged`')
  } else {
    console.log('  ℹ️  Column `staged` already present')
  }

  if (!(await columnExists('schedules', 'state_snapshot'))) {
    await sequelize.query(
      'ALTER TABLE schedules ADD COLUMN `state_snapshot` JSON NULL'
    )
    console.log('  ✅ Added column `state_snapshot`')
  } else {
    console.log('  ℹ️  Column `state_snapshot` already present')
  }

  return { success: true }
}

export async function down () {
  console.log('🔄 Reverting backend-schedule-sync columns from schedules...')

  for (const col of ['state_snapshot', 'staged', 'version']) {
    if (await columnExists('schedules', col)) {
      await sequelize.query(`ALTER TABLE schedules DROP COLUMN \`${col}\``)
      console.log(`  ✅ Dropped column \`${col}\``)
    }
  }

  return { success: true }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  up()
    .then((r) => { console.log('Migration result:', r); process.exit(0) })
    .catch((e) => { console.error('Migration error:', e); process.exit(1) })
}
