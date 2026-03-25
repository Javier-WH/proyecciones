import sequelize from '#dataBaseConnection';

/**
 * Cleanup script to remove old projection-specific index
 * This should be run after verifying that global restrictions work correctly
 */

export async function up() {
  try {
    console.log('🧹 Cleaning up old restrictions index...');
    
    // Remove the old projection-specific index
    console.log('Removing old projection-specific index...');
    await sequelize.query(`
      ALTER TABLE subjects_restrictions 
      DROP INDEX subjects_restrictions_proj_subj_pnf_key
    `);
    
    console.log('✅ Old index removed successfully');
    
    // Verify the index was removed
    const [indexCount] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.statistics 
      WHERE table_schema = DATABASE() 
      AND table_name = 'subjects_restrictions' 
      AND index_name = 'subjects_restrictions_proj_subj_pnf_key'
    `);
    
    if (indexCount[0].count === 0) {
      console.log('✅ Verification passed: Old index no longer exists');
    } else {
      throw new Error('Old index still exists after cleanup');
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

export async function down() {
  try {
    console.log('🔄 Restoring old restrictions index...');
    
    // Restore the old index
    await sequelize.query(`
      ALTER TABLE subjects_restrictions 
      ADD UNIQUE KEY subjects_restrictions_proj_subj_pnf_key (proyection_id, subject_key, pnf_id)
    `);
    
    console.log('✅ Old index restored successfully');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Restore failed:', error);
    throw error;
  }
}

// Run cleanup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  up()
    .then(result => {
      console.log('Cleanup result:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Cleanup error:', error);
      process.exit(1);
    });
}
