const { Pool } = require('pg');

async function testNewPassword() {
  console.log('🧪 Testing database connection with new password...\n');
  
  // You'll need to update this with your new password
  const password = 'postgre'; // Change this to your new password
  
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: password,
    connectionTimeoutMillis: 5000,
  });

  try {
    console.log('Connecting to PostgreSQL...');
    const client = await pool.connect();
    
    // Test basic connection
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Connection successful!');
    console.log('Current time:', result.rows[0].current_time);
    
    // Check if cvvin database exists
    const dbResult = await client.query(`
      SELECT 1 FROM pg_database WHERE datname = 'cvvin'
    `);
    
    if (dbResult.rows.length > 0) {
      console.log('✅ Database "cvvin" exists');
      
      // Test connection to cvvin database
      client.release();
      await pool.end();
      
      const cvvinPool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'cvvin',
        user: 'postgres',
        password: password,
        connectionTimeoutMillis: 5000,
      });
      
      const cvvinClient = await cvvinPool.connect();
      const tablesResult = await cvvinClient.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `);
      
      console.log('\n📋 Tables in cvvin database:');
      tablesResult.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
      
      cvvinClient.release();
      await cvvinPool.end();
      
    } else {
      console.log('❌ Database "cvvin" does not exist');
      console.log('💡 You need to create it and run the database_setup.sql script');
    }
    
    console.log('\n🎉 Database test completed successfully!');
    console.log('📝 Update your backend/.env file with:');
    console.log(`DATABASE_PASSWORD=${password}`);
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    
    if (error.code === '28P01') {
      console.log('\n💡 Password is still incorrect. Please try again.');
    } else if (error.code === '3D000') {
      console.log('\n💡 Database "cvvin" does not exist. Please create it first.');
    }
  }
}

testNewPassword();
