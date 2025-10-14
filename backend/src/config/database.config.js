const { Pool } = require('pg');
const Logger = require('../utils/logger.utils');

/**
 * Database configuration for PostgreSQL connection
 */
const DATABASE_CONFIG = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  database: process.env.DATABASE_NAME || 'cvvin',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgre',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// Create connection pool
let pool = null;

/**
 * Initialize database connection pool
 * @returns {Pool} PostgreSQL connection pool
 */
const initializeDatabase = () => {
  try {
    if (!pool) {
      pool = new Pool(DATABASE_CONFIG);
      
      // Handle pool errors
      pool.on('error', (err) => {
        Logger.error('Unexpected error on idle client', err);
        process.exit(-1);
      });

      Logger.info('Database connection pool initialized');
      Logger.info(`Connected to PostgreSQL: ${DATABASE_CONFIG.host}:${DATABASE_CONFIG.port}/${DATABASE_CONFIG.database}`);
    }
    return pool;
  } catch (error) {
    Logger.error('Failed to initialize database connection pool', error);
    throw error;
  }
};

/**
 * Get database connection pool
 * @returns {Pool} PostgreSQL connection pool
 */
const getPool = () => {
  if (!pool) {
    return initializeDatabase();
  }
  return pool;
};

/**
 * Test database connection
 * @returns {Promise<boolean>} Connection status
 */
const testConnection = async () => {
  try {
    const client = await getPool().connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    
    Logger.info('Database connection test successful');
    Logger.info(`Database time: ${result.rows[0].now}`);
    return true;
  } catch (error) {
    Logger.error('Database connection test failed', error);
    return false;
  }
};

/**
 * Execute a query with error handling
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
const query = async (text, params = []) => {
  const start = Date.now();
  try {
    const result = await getPool().query(text, params);
    const duration = Date.now() - start;
    
    Logger.debug('Executed query', {
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      duration: `${duration}ms`,
      rows: result.rowCount
    });
    
    return result;
  } catch (error) {
    Logger.error('Database query failed', {
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      error: error.message
    });
    throw error;
  }
};

/**
 * Get a client from the pool for transactions
 * @returns {Promise<Object>} Database client
 */
const getClient = async () => {
  return await getPool().connect();
};

/**
 * Close database connection pool
 * @returns {Promise<void>}
 */
const closePool = async () => {
  if (pool) {
    await pool.end();
    pool = null;
    Logger.info('Database connection pool closed');
  }
};

module.exports = {
  initializeDatabase,
  getPool,
  testConnection,
  query,
  getClient,
  closePool,
  DATABASE_CONFIG
};
