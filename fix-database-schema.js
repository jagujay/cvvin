const { Pool } = require('pg');
const fs = require('fs');

// Database configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'cvvin',
  password: 'postgre',
  port: 5432,
});

async function fixFilesTable() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing files table schema...');
    
    // Read the SQL script
    const sqlScript = fs.readFileSync('fix-files-table.sql', 'utf8');
    
    // Execute the script
    await client.query(sqlScript);
    
    console.log('✅ Files table schema fixed successfully!');
    
    // Verify the changes
    const result = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'files' 
      AND column_name IN ('created_at', 'updated_at', 'upload_date')
      ORDER BY column_name
    `);
    
    console.log('\n📋 Files table columns:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (default: ${row.column_default})`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing files table:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixFilesTable()
  .then(() => {
    console.log('\n🎉 Database schema fix completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed to fix database schema:', error);
    process.exit(1);
  });
