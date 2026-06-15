import sequelize from '#dataBaseConnection'

async function tableExists(tableName) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS c FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = :tableName`,
    { replacements: { tableName } }
  )
  return Number(rows[0].c) > 0
}

async function columnExists(tableName, columnName) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS c FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = :tableName AND column_name = :columnName`,
    { replacements: { tableName, columnName } }
  )
  return Number(rows[0].c) > 0
}

export async function up () {
  console.log('🔧 Creating schedule_versions table...')
  if (!(await tableExists('schedule_versions'))) {
    await sequelize.query(`
      CREATE TABLE schedule_versions (
        id CHAR(36) PRIMARY KEY,
        row_name VARCHAR(255) NOT NULL,
        proyection_id CHAR(36) NOT NULL,
        trimestre VARCHAR(2) NOT NULL,
        version_number INT NOT NULL,
        state_snapshot JSON NULL,
        change_type VARCHAR(50) DEFAULT 'autosave',
        description VARCHAR(255) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_row_name_version (row_name, version_number),
        INDEX idx_proyection_trimestre (proyection_id, trimestre),
        INDEX idx_created_at (created_at)
      )
    `)
    console.log('  ✅ Created schedule_versions table')
  } else {
    console.log('  ℹ️  schedule_versions table already exists')
    // Legacy fix: earlier the model created camelCase timestamp columns
    // (createdAt/updatedAt) which mismatched the routes that query
    // created_at/updated_at. Rename them to snake_case if present.
    if ((await columnExists('schedule_versions', 'createdAt')) && !(await columnExists('schedule_versions', 'created_at'))) {
      await sequelize.query('ALTER TABLE schedule_versions CHANGE `createdAt` `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP')
      console.log('  ✅ Renamed createdAt → created_at')
    }
    if ((await columnExists('schedule_versions', 'updatedAt')) && !(await columnExists('schedule_versions', 'updated_at'))) {
      await sequelize.query('ALTER TABLE schedule_versions CHANGE `updatedAt` `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      console.log('  ✅ Renamed updatedAt → updated_at')
    }
  }
  return { success: true }
}

export async function down () {
  await sequelize.query('DROP TABLE IF EXISTS schedule_versions')
  return { success: true }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  up()
    .then((r) => { console.log('Migration result:', r); process.exit(0) })
    .catch((e) => { console.error('Migration error:', e); process.exit(1) })
}
