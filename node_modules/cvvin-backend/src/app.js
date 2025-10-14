const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import configurations
const { SERVER_CONFIG } = require('./config/server.config');
const { initializeFirebase } = require('./config/firebase.config');
const { initializeDatabase, testConnection } = require('./config/database.config');

// Import middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { logRequest, sanitizeBody } = require('./middleware/validation');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const healthRoutes = require('./routes/health.routes');

/**
 * Create and configure Express application
 * @returns {express.Application} Configured Express app
 */
const createApp = () => {
  const app = express();

  // Initialize Firebase Admin SDK
  initializeFirebase();

  // Initialize Database connection
  initializeDatabase();

  // Middleware
  app.use(cors(SERVER_CONFIG.CORS));
  app.use(express.json({ limit: '50mb' })); // Increase limit for file uploads
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(logRequest);
  app.use(sanitizeBody);

  // Serve uploaded files statically
  app.use('/uploads', express.static('uploads'));

  // Routes
  app.use('/health', healthRoutes);
  app.use('/api', authRoutes);
  app.use('/api/users', userRoutes);

  // Error handling middleware (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

module.exports = createApp;
