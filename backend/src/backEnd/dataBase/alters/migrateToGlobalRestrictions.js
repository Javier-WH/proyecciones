import sequelize from '#dataBaseConnection';
import SubjectRestrictions from '#models/schedule/subjectsRestrictions.js';

/**
 * Migration script to convert subject restrictions from projection-specific to global
 * This script:
 * 1. Creates a backup of existing restrictions
 * 2. Modifies the table structure to allow proyection_id to be nullable
 * 3. Migrates existing restrictions to global (proyection_id = null)
 * 4. Updates indexes for global constraints
 */

export async function up() {
  try {
    console.log('Starting migration to global restrictions...');
    
    // Step 1: Create backup table
    console.log('Creating backup table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS subjects_restrictions_backup AS 
      SELECT * FROM subjects_restrictions
    `);
    
    // Step 2: Check existing data
    const existingRestrictions = await SubjectRestrictions.findAll({ raw: true });
    console.log(`Found ${existingRestrictions.length} existing restrictions to migrate`);
    
    // Step 3: Migrate existing restrictions to global
    console.log('Migrating restrictions to global...');
    await sequelize.query(`
      UPDATE subjects_restrictions 
      SET proyection_id = NULL
    `);
    
    console.log('Migration completed successfully!');
    
    // Verify migration
    const globalRestrictions = await SubjectRestrictions.findAll({ 
      where: { proyection_id: null },
      raw: true 
    });
    console.log(`Successfully migrated ${globalRestrictions.length} restrictions to global`);
    
    return { success: true, migrated: globalRestrictions.length };
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

export async function down() {
  try {
    console.log('Rolling back migration...');
    
    // Restore from backup if needed
    const [backupExists] = await sequelize.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_name = 'subjects_restrictions_backup'
    `, { type: sequelize.QueryTypes.SELECT });
    
    if (backupExists.count > 0) {
      console.log('Restoring from backup...');
      await sequelize.query(`
        TRUNCATE TABLE subjects_restrictions
      `);
      
      await sequelize.query(`
        INSERT INTO subjects_restrictions 
        SELECT * FROM subjects_restrictions_backup
      `);
      
      // Make proyection_id NOT NULL again
      await sequelize.query(`
        ALTER TABLE subjects_restrictions 
        MODIFY COLUMN proyection_id VARCHAR(36) NOT NULL
      `);
      
      // Remove global index
      await sequelize.query(`
        ALTER TABLE subjects_restrictions 
        DROP INDEX subjects_restrictions_global_key
      `);
      
      console.log('Rollback completed successfully');
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  up()
    .then(result => {
      console.log('Migration result:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration error:', error);
      process.exit(1);
    });
}
