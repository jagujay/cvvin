const { query } = require('./src/config/database.config');
const fs = require('fs');

(async () => {
  try {
    console.log('🔧 Running migration...');
    
    // Ensure UUID extension is installed
    await query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    
    // Read and execute migrations
    const migrations = [
      './migrations/create_proctoring_violations_table.sql',
      './migrations/add_violation_count_column.sql'
    ];
    
    for (const migrationPath of migrations) {
      if (fs.existsSync(migrationPath)) {
        console.log(`📄 Running migration: ${migrationPath}`);
        const sql = fs.readFileSync(migrationPath, 'utf8');
        await query(sql);
        console.log(`✅ Completed: ${migrationPath}`);
      } else {
        console.log(`⚠️  Migration file not found: ${migrationPath}`);
      }
    }
    
    console.log('✅ All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
})();

