#!/usr/bin/env node
/**
 * Database Migration Runner
 * 
 * Usage:
 *   node run-migration.js <migration-file.sql>
 *   node run-migration.js 002_fix_files_table.sql
 *   
 * Or run all migrations:
 *   node run-migration.js --all
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration from environment or defaults
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'cvvin',
  password: process.env.DB_PASSWORD || 'postgre',
  port: process.env.DB_PORT || 5432,
});

/**
 * Run a single migration file
 */
async function runMigration(client, filePath) {
  const fileName = path.basename(filePath);
  
  try {
    console.log(`\n🔧 Running migration: ${fileName}`);
    
    // Read the SQL script
    const sqlScript = fs.readFileSync(filePath, 'utf8');
    
    // Execute the script
    await client.query(sqlScript);
    
    console.log(`✅ Migration completed: ${fileName}`);
    return true;
  } catch (error) {
    console.error(`❌ Error running migration ${fileName}:`, error.message);
    throw error;
  }
}

/**
 * Get all migration files in order
 */
function getMigrationFiles() {
  const migrationsDir = __dirname;
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql') && !file.startsWith('000_COMBINED'))
    .sort(); // Sorts by filename (001, 002, 003, etc.)
  
  return files.map(file => path.join(migrationsDir, file));
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
📚 Database Migration Runner

Usage:
  node run-migration.js <migration-file.sql>    Run a specific migration
  node run-migration.js --all                    Run all migrations in order
  node run-migration.js --combined               Run combined migration file

Examples:
  node run-migration.js 002_fix_files_table.sql
  node run-migration.js --all

Environment Variables:
  DB_USER      Database user (default: postgres)
  DB_HOST      Database host (default: localhost)
  DB_NAME      Database name (default: cvvin)
  DB_PASSWORD  Database password (default: postgre)
  DB_PORT      Database port (default: 5432)
    `);
    process.exit(0);
  }

  const client = await pool.connect();
  
  try {
    console.log('🔌 Connected to database');
    
    if (args[0] === '--all') {
      // Run all migrations
      const migrationFiles = getMigrationFiles();
      console.log(`\n📋 Found ${migrationFiles.length} migration files`);
      
      for (const filePath of migrationFiles) {
        await runMigration(client, filePath);
      }
      
      console.log('\n🎉 All migrations completed successfully!');
      
    } else if (args[0] === '--combined') {
      // Run combined migration
      const combinedPath = path.join(__dirname, '000_COMBINED_ALL_MIGRATIONS.sql');
      await runMigration(client, combinedPath);
      console.log('\n🎉 Combined migration completed successfully!');
      
    } else {
      // Run specific migration
      const migrationFile = args[0];
      const filePath = path.isAbsolute(migrationFile) 
        ? migrationFile 
        : path.join(__dirname, migrationFile);
      
      if (!fs.existsSync(filePath)) {
        console.error(`❌ Migration file not found: ${filePath}`);
        process.exit(1);
      }
      
      await runMigration(client, filePath);
      console.log('\n🎉 Migration completed successfully!');
    }
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
main().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});





