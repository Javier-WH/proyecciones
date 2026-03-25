import sequelize from '#dataBaseConnection';

/**
 * Script to check the current table structure
 */

async function checkTableStructure() {
  try {
    console.log('Checking subjects_restrictions table structure...');
    
    // Get table structure
    const [structure] = await sequelize.query(`
      DESCRIBE subjects_restrictions
    `);
    
    console.log('\n📋 Table Structure:');
    structure.forEach(column => {
      console.log(`  ${column.Field}: ${column.Type} ${column.Null === 'YES' ? '(NULL)' : '(NOT NULL)'} ${column.Key ? `[${column.Key}]` : ''}`);
    });
    
    // Get indexes
    const [indexes] = await sequelize.query(`
      SHOW INDEX FROM subjects_restrictions
    `);
    
    console.log('\n🔑 Indexes:');
    indexes.forEach(index => {
      console.log(`  ${index.Key_name}: ${index.Column_name} (${index.Index_type})`);
    });
    
    // Get foreign keys
    const [foreignKeys] = await sequelize.query(`
      SELECT 
        CONSTRAINT_NAME, 
        COLUMN_NAME, 
        REFERENCED_TABLE_NAME, 
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'subjects_restrictions' 
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    
    console.log('\n🔗 Foreign Keys:');
    foreignKeys.forEach(fk => {
      console.log(`  ${fk.CONSTRAINT_NAME}: ${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}(${fk.REFERENCED_COLUMN_NAME})`);
    });
    
    // Check current data
    const [dataCount] = await sequelize.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN proyection_id IS NULL THEN 1 END) as global_count,
        COUNT(CASE WHEN proyection_id IS NOT NULL THEN 1 END) as projection_count
      FROM subjects_restrictions
    `);
    
    console.log('\n📊 Data Summary:');
    console.log(`  Total restrictions: ${dataCount[0].total}`);
    console.log(`  Global restrictions: ${dataCount[0].global_count}`);
    console.log(`  Projection-specific: ${dataCount[0].projection_count}`);
    
  } catch (error) {
    console.error('Error checking table structure:', error);
  }
}

checkTableStructure();
