import sequelize from '#dataBaseConnection';
import SubjectRestrictions from '#models/schedule/subjectsRestrictions.js';

/**
 * Automatic migration verification and application script
 * This script checks if global restrictions migration is needed and applies it if necessary
 */

const MIGRATION_NAME = 'global_restrictions_v1';

async function checkMigrationFlag() {
  try {
    // Create migration_flags table if it doesn't exist
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS migration_flags (
        id INT PRIMARY KEY AUTO_INCREMENT,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        version VARCHAR(50),
        details JSON
      )
    `);

    // Check if migration is already completed
    const [existingFlag] = await sequelize.query(`
      SELECT * FROM migration_flags 
      WHERE migration_name = ?
    `, {
      replacements: [MIGRATION_NAME],
      type: sequelize.QueryTypes.SELECT
    });

    return existingFlag;
  } catch (error) {
    console.warn('⚠️  Warning: Could not check migration flag:', error.message);
    return null;
  }
}

async function setMigrationFlag(details = {}) {
  try {
    await sequelize.query(`
      INSERT INTO migration_flags (migration_name, version, details) 
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE 
      completed_at = CURRENT_TIMESTAMP,
      version = VALUES(version),
      details = VALUES(details)
    `, {
      replacements: [MIGRATION_NAME, '1.0.0', JSON.stringify(details)],
      type: sequelize.QueryTypes.INSERT
    });
  } catch (error) {
    console.warn('⚠️  Warning: Could not set migration flag:', error.message);
  }
}

async function checkIfMigrationNeeded() {
  try {
    console.log('🔍 Checking if global restrictions migration is needed...');

    // Check 1: Verify table structure
    const [tableStructure] = await sequelize.query(`
      SELECT IS_NULLABLE 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'subjects_restrictions' 
      AND COLUMN_NAME = 'proyection_id'
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    if (!tableStructure || tableStructure.IS_NULLABLE !== 'YES') {
      console.log('📋 Migration needed: proyection_id is not nullable');
      return true;
    }

    // Check 2: Verify global restrictions exist
    const [restrictionCount] = await sequelize.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN proyection_id IS NULL THEN 1 END) as global_count
      FROM subjects_restrictions
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    if (restrictionCount.total > 0 && restrictionCount.global_count === 0) {
      console.log('📋 Migration needed: restrictions exist but none are global');
      return true;
    }

    // Check 3: Verify old index doesn't exist
    const [oldIndexCount] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.statistics 
      WHERE table_schema = DATABASE() 
      AND table_name = 'subjects_restrictions' 
      AND index_name = 'subjects_restrictions_proj_subj_pnf_key'
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    if (oldIndexCount.count > 0) {
      console.log('📋 Migration needed: old index still exists');
      return true;
    }

    console.log('✅ Migration not needed: everything is up to date');
    return false;

  } catch (error) {
    console.warn('⚠️  Warning: Could not determine migration need:', error.message);
    // If we can't check, assume migration might be needed
    return true;
  }
}

async function applyMigration() {
  try {
    console.log('🚀 Applying global restrictions migration...');

    // Import the migration function
    const { up: migrateUp } = await import('./migrateToGlobalRestrictions.js');
    
    // Apply the migration
    const result = await migrateUp();
    
    if (result.success) {
      console.log(`✅ Migration completed: ${result.migrated} restrictions migrated`);
      
      // Apply cleanup
      try {
        const { up: cleanupUp } = await import('./cleanupOldRestrictionsIndex.js');
        await cleanupUp();
        console.log('✅ Cleanup completed: old index removed');
      } catch (cleanupError) {
        console.warn('⚠️  Cleanup failed (non-critical):', cleanupError.message);
      }

      // Set migration flag
      await setMigrationFlag({
        migrated_restrictions: result.migrated,
        migration_date: new Date().toISOString(),
        success: true
      });

      return true;
    } else {
      throw new Error('Migration failed without success flag');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    // Set migration flag with error details
    await setMigrationFlag({
      success: false,
      error: error.message,
      migration_date: new Date().toISOString()
    });

    return false;
  }
}

export async function checkAndApplyGlobalRestrictions() {
  try {
    console.log('\n🔄 Global Restrictions Migration Check');
    console.log('=====================================');

    // Check if migration is already completed
    const migrationFlag = await checkMigrationFlag();
    
    if (migrationFlag) {
      const details = migrationFlag.details ? (typeof migrationFlag.details === 'string' ? JSON.parse(migrationFlag.details) : migrationFlag.details) : {};
      if (details.success) {
        console.log('✅ Migration already completed successfully');
        console.log(`   Completed: ${migrationFlag.completed_at}`);
        if (details.migrated_restrictions) {
          console.log(`   Restrictions migrated: ${details.migrated_restrictions}`);
        }
        return true;
      } else {
        console.log('⚠️  Previous migration failed, retrying...');
        console.log(`   Error: ${details.error || 'Unknown error'}`);
      }
    }

    // Check if migration is needed
    const migrationNeeded = await checkIfMigrationNeeded();
    
    if (migrationNeeded) {
      console.log('📋 Migration is required, applying...');
      const success = await applyMigration();
      
      if (success) {
        console.log('🎉 Global restrictions migration completed successfully!');
        console.log('📊 All restrictions are now global and will apply to future projections');
      } else {
        console.log('❌ Migration failed. Please check logs and consider manual migration.');
        return false;
      }
    }

    return true;

  } catch (error) {
    console.error('💥 Critical error in migration check:', error);
    // Don't fail server startup, but log the error
    console.log('⚠️  Server will continue starting, but manual migration may be required');
    return false;
  }
}

// Export for testing
export { checkMigrationFlag, checkIfMigrationNeeded, applyMigration };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkAndApplyGlobalRestrictions()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Script error:', error);
      process.exit(1);
    });
}
