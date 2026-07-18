const express = require('express');
const router = express.Router();
const OTPService = require('../services/otp.service');
const EmailService = require('../services/email.service');
const AuthService = require('../services/auth.service');
const { asyncHandler } = require('../middleware/errorHandler');

// Initialize services for health checks
const otpService = new OTPService();
const emailService = new EmailService();
const authService = new AuthService();

/**
 * Basic health check
 * GET /health
 */
router.get('/', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * Detailed health check with service status
 * GET /health/detailed
 */
router.get('/detailed', asyncHandler(async (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {}
  };

  try {
    // Check email service
    const emailStatus = await emailService.testConnection();
    health.services.email = {
      status: emailStatus ? 'OK' : 'ERROR',
      connected: emailStatus
    };
  } catch (error) {
    health.services.email = {
      status: 'ERROR',
      error: error.message
    };
  }

  try {
    // Check Firebase Auth service
    // We'll test by trying to get the auth instance
    const auth = authService.auth;
    health.services.firebase = {
      status: auth ? 'OK' : 'ERROR',
      connected: !!auth
    };
  } catch (error) {
    health.services.firebase = {
      status: 'ERROR',
      error: error.message
    };
  }

  // Check OTP service
  const otpStats = otpService.getStats();
  health.services.otp = {
    status: 'OK',
    stats: otpStats
  };

  // Check memory usage
  const memUsage = process.memoryUsage();
  health.memory = {
    rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
    external: Math.round(memUsage.external / 1024 / 1024) + ' MB'
  };

  // Determine overall status
  const hasErrors = Object.values(health.services).some(service => service.status === 'ERROR');
  health.status = hasErrors ? 'DEGRADED' : 'OK';

  const statusCode = hasErrors ? 503 : 200;
  res.status(statusCode).json(health);
}));

/**
 * Service readiness check
 * GET /health/ready
 */
router.get('/ready', (req, res) => {
  // Check if all required environment variables are set
  const requiredEnvVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'MAIL_USERNAME',
    'MAIL_PASSWORD'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    return res.status(503).json({
      status: 'NOT_READY',
      message: 'Missing required environment variables',
      missing: missingVars
    });
  }

  res.json({
    status: 'READY',
    message: 'All required services are configured'
  });
});

module.exports = router;
