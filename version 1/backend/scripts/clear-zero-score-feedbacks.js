#!/usr/bin/env node
/**
 * Script to clear all feedbacks where score is 0% from PostgreSQL
 * This will delete:
 * - interview_sessions where overall_score = 0 or NULL
 * - session_components where score = 0 or NULL
 * - resume_analyses where overall_score = 0 or NULL
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

// Database configuration (matching database.config.js)
const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'cvvin',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgre',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function clearZeroScoreFeedbacks() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Starting cleanup of zero-score feedbacks...\n');
    
    // Start transaction
    await client.query('BEGIN');
    
    // 1. Count and delete session_components with score = 0 or NULL
    console.log('📊 Checking session_components...');
    const componentsCountResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM session_components 
      WHERE score = 0 OR score IS NULL
    `);
    const componentsCount = parseInt(componentsCountResult.rows[0].count);
    console.log(`   Found ${componentsCount} session_components with score 0 or NULL`);
    
    if (componentsCount > 0) {
      const deleteComponentsResult = await client.query(`
        DELETE FROM session_components 
        WHERE score = 0 OR score IS NULL
        RETURNING id, session_id, component_type
      `);
      console.log(`   ✅ Deleted ${deleteComponentsResult.rows.length} session_components`);
    }
    
    // 2. Count and delete interview_sessions with overall_score = 0 or NULL
    console.log('\n📊 Checking interview_sessions...');
    const sessionsCountResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM interview_sessions 
      WHERE overall_score = 0 OR overall_score IS NULL
    `);
    const sessionsCount = parseInt(sessionsCountResult.rows[0].count);
    console.log(`   Found ${sessionsCount} interview_sessions with overall_score 0 or NULL`);
    
    if (sessionsCount > 0) {
      // First, delete related session_components (cascade should handle this, but being explicit)
      await client.query(`
        DELETE FROM session_components 
        WHERE session_id IN (
          SELECT id FROM interview_sessions 
          WHERE overall_score = 0 OR overall_score IS NULL
        )
      `);
      
      const deleteSessionsResult = await client.query(`
        DELETE FROM interview_sessions 
        WHERE overall_score = 0 OR overall_score IS NULL
        RETURNING id, session_type, user_id
      `);
      console.log(`   ✅ Deleted ${deleteSessionsResult.rows.length} interview_sessions`);
    }
    
    // 3. Count and delete resume_analyses with overall_score = 0 or NULL
    console.log('\n📊 Checking resume_analyses...');
    const resumeCountResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM resume_analyses 
      WHERE overall_score = 0 OR overall_score IS NULL
    `);
    const resumeCount = parseInt(resumeCountResult.rows[0].count);
    console.log(`   Found ${resumeCount} resume_analyses with overall_score 0 or NULL`);
    
    if (resumeCount > 0) {
      const deleteResumeResult = await client.query(`
        DELETE FROM resume_analyses 
        WHERE overall_score = 0 OR overall_score IS NULL
        RETURNING id, user_id, analysis_date
      `);
      console.log(`   ✅ Deleted ${deleteResumeResult.rows.length} resume_analyses`);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('\n✅ Cleanup completed successfully!');
    console.log(`\n📈 Summary:`);
    console.log(`   - Session Components deleted: ${componentsCount}`);
    console.log(`   - Interview Sessions deleted: ${sessionsCount}`);
    console.log(`   - Resume Analyses deleted: ${resumeCount}`);
    console.log(`   - Total records deleted: ${componentsCount + sessionsCount + resumeCount}`);
    
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
clearZeroScoreFeedbacks()
  .then(() => {
    console.log('\n✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });

