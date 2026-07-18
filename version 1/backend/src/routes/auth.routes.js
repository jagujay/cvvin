const express = require('express');
const router = express.Router();
const OTPService = require('../services/otp.service');
const EmailService = require('../services/email.service');
const AuthService = require('../services/auth.service');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateEmail, validateOTP, validatePasswordMiddleware, validateRequired } = require('../middleware/validation');
const Logger = require('../utils/logger.utils');

// Initialize services
const otpService = new OTPService();
const emailService = new EmailService();
const authService = new AuthService();

/**
 * Send OTP for email verification or password reset
 * POST /api/send-otp
 */
router.post('/send-otp', 
  validateEmail,
  asyncHandler(async (req, res) => {
    const { email, type = 'verification' } = req.body;

    Logger.info(`Sending OTP for email: ${email}`, { type });

    // Generate and store OTP
    const otpData = otpService.generateAndStoreOTP(email, type);

    // Send email
    await emailService.sendOTPEmail(email, otpData.otp, type);

    Logger.info(`OTP email sent successfully to ${email}`);

    res.json({
      success: true,
      message: 'OTP sent successfully',
      otpId: otpData.otpId // For testing purposes, remove in production
    });
  })
);

/**
 * Verify OTP
 * POST /api/verify-otp
 */
router.post('/verify-otp',
  validateEmail,
  validateOTP,
  asyncHandler(async (req, res) => {
    const { email, otp, otpId, type = 'verification' } = req.body;

    Logger.info(`Verifying OTP for email: ${email}`, { type });

    const result = otpService.verifyOTP(email, otp, type, otpId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * Reset password using OTP verification
 * POST /api/reset-password
 */
router.post('/reset-password',
  validateEmail,
  validatePasswordMiddleware,
  asyncHandler(async (req, res) => {
    const { email, newPassword } = req.body;

    Logger.info(`Resetting password for email: ${email}`);

    try {
      // Update the user's password using Firebase Admin SDK
      await authService.updatePasswordByEmail(email, newPassword);

      Logger.info(`Password updated successfully for ${email}`);

      res.json({
        success: true,
        message: 'Password updated successfully'
      });

    } catch (error) {
      if (error.message === 'User not found') {
        return res.status(400).json({
          success: false,
          error: 'User not found'
        });
      }

      Logger.error('Error resetting password', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset password',
        message: error.message
      });
    }
  })
);

/**
 * Get OTP statistics (for monitoring)
 * GET /api/otp-stats
 */
router.get('/otp-stats', (req, res) => {
  const stats = otpService.getStats();
  res.json({
    success: true,
    data: stats
  });
});

module.exports = router;
