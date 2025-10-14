const { Pool } = require('pg');

const commonPasswords = [
  'postgres',
  'admin', 
  'password',
  '123456',
  'jagujay',
  '', // empty password
  'root',
  'test'
];

async function testPasswords() {
  console.log('🔍 Testing common PostgreSQL passwords...\n');
  
  for (const password of commonPasswords) {
    console.log(`Testing password: "${password}"`);
    
    const pool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'postgres', // Try connecting to default postgres database first
      user: 'postgres',
      password: password,
      connectionTimeoutMillis: 2000,
    });

    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      await pool.end();
      
      console.log(`✅ SUCCESS! Password "${password}" works!`);
      console.log(`\n📝 Update your backend/.env file with:`);
      console.log(`DATABASE_PASSWORD=${password}`);
      return password;
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
      await pool.end();
    }
  }
  
  console.log('\n❌ None of the common passwords worked.');
  console.log('💡 You may need to reset the PostgreSQL password.');
  return null;
}

testPasswords().then(password => {
  if (password) {
    console.log('\n🎉 Database connection test successful!');
    console.log('You can now start the backend server.');
  } else {
    console.log('\n🔧 Please reset your PostgreSQL password and try again.');
  }
});
