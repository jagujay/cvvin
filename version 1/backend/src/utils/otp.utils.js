const { SERVER_CONFIG } = require('../config/server.config');

/**
 * Generate a random 6-digit OTP
 * @returns {string} 6-digit OTP string
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Check if OTP is expired
 * @param {Date} createdAt - OTP creation date
 * @param {number} expirationMinutes - Expiration time in minutes
 * @returns {boolean} True if OTP is expired
 */
const isOTPExpired = (createdAt, expirationMinutes = SERVER_CONFIG.OTP.EXPIRATION_MINUTES) => {
  const expirationTime = new Date(createdAt.getTime() + expirationMinutes * 60 * 1000);
  return new Date() > expirationTime;
};

/**
 * Clean up expired OTPs from storage
 * @param {Map} otpStorage - OTP storage Map
 * @returns {number} Number of OTPs cleaned up
 */
const cleanupExpiredOTPs = (otpStorage) => {
  let cleanedCount = 0;
  const now = new Date();
  
  for (const [id, otpData] of otpStorage.entries()) {
    if (now > otpData.expiresAt) {
      otpStorage.delete(id);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`Cleaned up ${cleanedCount} expired OTPs`);
  }
  
  return cleanedCount;
};

/**
 * Find OTP by email and type
 * @param {Map} otpStorage - OTP storage Map
 * @param {string} email - User email
 * @param {string} type - OTP type ('verification' or 'reset')
 * @returns {Object|null} OTP data or null if not found
 */
const findOTPByEmailAndType = (otpStorage, email, type) => {
  for (const [id, otpData] of otpStorage.entries()) {
    if (otpData.email === email && otpData.type === type) {
      return { id, ...otpData };
    }
  }
  return null;
};

module.exports = {
  generateOTP,
  isOTPExpired,
  cleanupExpiredOTPs,
  findOTPByEmailAndType
};
