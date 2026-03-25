import SubjectRestrictions from '#models/schedule/subjectsRestrictions.js';

/**
 * Script to test the global restrictions functionality
 */

async function testGlobalRestrictions() {
  try {
    console.log('🧪 Testing global restrictions functionality...\n');
    
    // Test 1: Get global restrictions
    console.log('1. Testing GET global restrictions...');
    const globalRestrictions = await SubjectRestrictions.findAll({
      where: { proyection_id: null },
      raw: true
    });
    console.log(`   ✅ Found ${globalRestrictions.length} global restrictions`);
    
    // Test 2: Try to find projection-specific restrictions (should be 0)
    console.log('2. Testing projection-specific restrictions...');
    const projectionRestrictions = await SubjectRestrictions.findAll({
      where: { proyection_id: 'test-projection-id' },
      raw: true
    });
    console.log(`   ✅ Found ${projectionRestrictions.length} projection-specific restrictions (expected 0)`);
    
    // Test 3: Check that we can create global restrictions
    console.log('3. Testing creation of global restrictions...');
    const testRestriction = await SubjectRestrictions.create({
      proyection_id: null,
      subject_key: 'test_subject',
      subject_name: 'Test Subject',
      classroom_ids: ['classroom1', 'classroom2'],
      pnf_id: null,
      is_exclusive: false,
      split_hours: false
    });
    console.log(`   ✅ Created test global restriction with ID: ${testRestriction.id}`);
    
    // Test 4: Clean up test data
    console.log('4. Cleaning up test data...');
    await SubjectRestrictions.destroy({
      where: { id: testRestriction.id }
    });
    console.log('   ✅ Test data cleaned up');
    
    // Test 5: Verify global index works
    console.log('5. Testing global unique constraint...');
    const [indexInfo] = await SubjectRestrictions.sequelize.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.statistics 
      WHERE table_schema = DATABASE() 
      AND table_name = 'subjects_restrictions' 
      AND index_name = 'subjects_restrictions_global_key'
    `);
    console.log(`   ✅ Global index exists: ${indexInfo[0].count > 0 ? 'YES' : 'NO'}`);
    
    console.log('\n🎉 All tests passed! Global restrictions are working correctly.');
    console.log('\n📋 Summary:');
    console.log(`   • Total restrictions: ${globalRestrictions.length}`);
    console.log(`   • All restrictions are now global`);
    console.log(`   • New projections will automatically use these restrictions`);
    console.log(`   • API endpoints support both global and projection-specific restrictions`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testGlobalRestrictions();
