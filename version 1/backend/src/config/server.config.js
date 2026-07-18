/**
 * Server configuration constants
 */
const SERVER_CONFIG = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:8080',
  
  // CORS configuration
  CORS: {
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    credentials: true
  },
  
  // Rate limiting
  RATE_LIMIT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },
  
  // OTP configuration
  OTP: {
    LENGTH: 6,
    EXPIRATION_MINUTES: 10,
    CLEANUP_INTERVAL_MINUTES: 5
  }
};

module.exports = {
  SERVER_CONFIG
};
