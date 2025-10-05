const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import configurations
const { SERVER_CONFIG } = require('./config/server.config');
const { initializeFirebase } = require('./config/firebase.config');

// Import middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { logRequest, sanitizeBody } = require('./middleware/validation');

// Import routes
const authRoutes = require('./routes/auth.routes');
const healthRoutes = require('./routes/health.routes');

/**
 * Create and configure Express application
 * @returns {express.Application} Configured Express app
 */
const createApp = () => {
  const app = express();

  // Initialize Firebase Admin SDK
  initializeFirebase();

  // Middleware
  app.use(cors(SERVER_CONFIG.CORS));
  app.use(express.json());
  app.use(logRequest);
  app.use(sanitizeBody);

  // Routes
  app.use('/health', healthRoutes);
  app.use('/api', authRoutes);

  // Error handling middleware (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

module.exports = createApp;
