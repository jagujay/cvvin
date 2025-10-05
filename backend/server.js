const createApp = require('./src/app');
const { SERVER_CONFIG } = require('./src/config/server.config');
const Logger = require('./src/utils/logger.utils');

/**
 * Start the server
 */
const startServer = () => {
  const app = createApp();
  
  const server = app.listen(SERVER_CONFIG.PORT, () => {
    Logger.info(`CVVIN Backend server running on port ${SERVER_CONFIG.PORT}`);
    Logger.info(`Health check: http://localhost:${SERVER_CONFIG.PORT}/health`);
    Logger.info(`Frontend URL: ${SERVER_CONFIG.FRONTEND_URL}`);
    Logger.info(`Environment: ${SERVER_CONFIG.NODE_ENV}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    Logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
      Logger.info('Process terminated');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    Logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
      Logger.info('Process terminated');
      process.exit(0);
    });
  });

  return server;
};

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = startServer;
