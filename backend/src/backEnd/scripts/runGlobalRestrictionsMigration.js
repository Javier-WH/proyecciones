import { up } from '../dataBase/alters/migrateToGlobalRestrictions.js';

/**
 * Script to run the global restrictions migration
 * Usage: node runGlobalRestrictionsMigration.js
 */

async function runMigration() {
  try {
    console.log('🚀 Starting global restrictions migration...');
    
    const result = await up();
    
    if (result.success) {
      console.log('✅ Migration completed successfully!');
      console.log(`📊 Migrated ${result.migrated} restrictions to global`);
      console.log('🎉 Restrictions are now global and will apply to all future projections!');
    } else {
      console.log('❌ Migration failed');
    }
    
  } catch (error) {
    console.error('💥 Migration error:', error.message);
    process.exit(1);
  }
}

// Run the migration
runMigration();
