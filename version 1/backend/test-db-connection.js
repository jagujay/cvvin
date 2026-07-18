const { Pool } = require('pg');

// Test database connection
async function testDatabaseConnection() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'cvvin',
    user: 'postgres',
    password: 'jagujay', // Change this to your actual PostgreSQL password
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  try {
    console.log('Testing database connection...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    client.release();
    
    console.log('✅ Database connection successful!');
    console.log('Current time:', result.rows[0].current_time);
    console.log('PostgreSQL version:', result.rows[0].pg_version);
    
    // Test if tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('\n📋 Existing tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    await pool.end();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    
    if (error.code === '28P01') {
      console.log('\n💡 Password authentication failed. Please check:');
      console.log('  1. PostgreSQL password is correct');
      console.log('  2. User "postgres" exists and has proper permissions');
      console.log('  3. Update the password in backend/.env file');
    } else if (error.code === '3D000') {
      console.log('\n💡 Database "cvvin" does not exist. Please:');
      console.log('  1. Create the database: CREATE DATABASE cvvin;');
      console.log('  2. Run the database_setup.sql script');
    }
    
    await pool.end();
    return false;
  }
}

// Run the test
testDatabaseConnection().then(success => {
  process.exit(success ? 0 : 1);
});
