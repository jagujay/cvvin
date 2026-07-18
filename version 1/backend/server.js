const createApp = require('./src/app');
const { SERVER_CONFIG } = require('./src/config/server.config');
const { testConnection, closePool } = require('./src/config/database.config');
const Logger = require('./src/utils/logger.utils');

/**
 * Start the server
 */
const startServer = async () => {
  try {
    // Test database connection before starting server
    const dbConnected = await testConnection();
    if (!dbConnected) {
      Logger.error('Database connection failed. Server will not start.');
      process.exit(1);
    }

    const app = createApp();
    
    const server = app.listen(SERVER_CONFIG.PORT, () => {
      Logger.info(`CVVIN Backend server running on port ${SERVER_CONFIG.PORT}`);
      Logger.info(`Health check: http://localhost:${SERVER_CONFIG.PORT}/health`);
      Logger.info(`Frontend URL: ${SERVER_CONFIG.FRONTEND_URL}`);
      Logger.info(`Environment: ${SERVER_CONFIG.NODE_ENV}`);
      Logger.info(`Database: Connected to PostgreSQL`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      Logger.info('SIGTERM received, shutting down gracefully');
      server.close(async () => {
        await closePool();
        Logger.info('Process terminated');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      Logger.info('SIGINT received, shutting down gracefully');
      server.close(async () => {
        await closePool();
        Logger.info('Process terminated');
        process.exit(0);
      });
    });

    return server;
  } catch (error) {
    Logger.error('Failed to start server', error);
    process.exit(1);
  }
};

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = startServer;
