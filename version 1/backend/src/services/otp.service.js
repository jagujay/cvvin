const { v4: uuidv4 } = require('uuid');
const { generateOTP, cleanupExpiredOTPs, findOTPByEmailAndType } = require('../utils/otp.utils');
const { SERVER_CONFIG } = require('../config/server.config');
const Logger = require('../utils/logger.utils');

/**
 * OTP service for managing OTP generation, storage, and validation
 */
class OTPService {
  constructor() {
    // In-memory storage for OTPs (in production, use Redis or database)
    this.otpStorage = new Map();
    this.startCleanupInterval();
  }

  /**
   * Generate and store OTP for email
   * @param {string} email - User email
   * @param {string} type - OTP type ('verification' or 'reset')
   * @returns {Object} OTP data with ID
   */
  generateAndStoreOTP(email, type = 'verification') {
    // Remove any existing OTP for this email and type
    this.removeExistingOTP(email, type);

    // Generate new OTP
    const otp = generateOTP();
    const otpId = uuidv4();
    const now = new Date();
    
    const otpData = {
      email,
      otp,
      type,
      createdAt: now,
      expiresAt: new Date(now.getTime() + SERVER_CONFIG.OTP.EXPIRATION_MINUTES * 60 * 1000)
    };

    this.otpStorage.set(otpId, otpData);
    
    Logger.info(`Generated OTP for ${email}`, { type, otpId });
    
    return {
      otpId,
      ...otpData
    };
  }

  /**
   * Verify OTP
   * @param {string} email - User email
   * @param {string} otp - OTP code
   * @param {string} type - OTP type
   * @param {string} otpId - Optional OTP ID
   * @returns {Object} Verification result
   */
  verifyOTP(email, otp, type = 'verification', otpId = null) {
    try {
      let foundOTP = null;
      let foundId = null;

      if (otpId) {
        // Find by OTP ID
        foundOTP = this.otpStorage.get(otpId);
        foundId = otpId;
      } else {
        // Find by email and type
        const result = findOTPByEmailAndType(this.otpStorage, email, type);
        if (result) {
          foundOTP = result;
          foundId = result.id;
        }
      }

      if (!foundOTP) {
        Logger.warn(`OTP not found for ${email}`, { type });
        return {
          success: false,
          message: 'Invalid OTP or OTP not found'
        };
      }

      // Check if OTP is expired
      if (new Date() > foundOTP.expiresAt) {
        Logger.warn(`OTP expired for ${email}`);
        this.otpStorage.delete(foundId);
        return {
          success: false,
          message: 'OTP has expired'
        };
      }

      // Verify OTP
      if (foundOTP.otp !== otp) {
        Logger.warn(`OTP mismatch for ${email}`, { expected: foundOTP.otp, received: otp });
        return {
          success: false,
          message: 'Invalid OTP'
        };
      }

      Logger.info(`OTP verified successfully for ${email}`);
      
      // Remove used OTP
      this.otpStorage.delete(foundId);

      return {
        success: true,
        message: 'OTP verified successfully'
      };

    } catch (error) {
      Logger.error('Error verifying OTP', error);
      return {
        success: false,
        message: 'Failed to verify OTP'
      };
    }
  }

  /**
   * Remove existing OTP for email and type
   * @param {string} email - User email
   * @param {string} type - OTP type
   */
  removeExistingOTP(email, type) {
    for (const [id, otpData] of this.otpStorage.entries()) {
      if (otpData.email === email && otpData.type === type) {
        this.otpStorage.delete(id);
        Logger.info(`Removed existing OTP for ${email}`, { type });
      }
    }
  }

  /**
   * Get OTP statistics
   * @returns {Object} OTP storage statistics
   */
  getStats() {
    const total = this.otpStorage.size;
    const now = new Date();
    let expired = 0;
    let active = 0;

    for (const otpData of this.otpStorage.values()) {
      if (now > otpData.expiresAt) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      total,
      active,
      expired
    };
  }

  /**
   * Start cleanup interval for expired OTPs
   */
  startCleanupInterval() {
    setInterval(() => {
      cleanupExpiredOTPs(this.otpStorage);
    }, SERVER_CONFIG.OTP.CLEANUP_INTERVAL_MINUTES * 60 * 1000);
    
    Logger.info('OTP cleanup interval started', { 
      interval: SERVER_CONFIG.OTP.CLEANUP_INTERVAL_MINUTES 
    });
  }
}

module.exports = OTPService;
