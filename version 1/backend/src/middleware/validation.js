const { isValidEmail, validatePassword, isValidOTP, validateRequiredFields } = require('../utils/validation.utils');
const Logger = require('../utils/logger.utils');

/**
 * Validate email in request body
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateEmail = (req, res, next) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Email is required'
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email format'
    });
  }

  next();
};

/**
 * Validate password in request body
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validatePasswordMiddleware = (req, res, next) => {
  const { newPassword } = req.body;
  
  if (!newPassword) {
    return res.status(400).json({
      success: false,
      error: 'New password is required'
    });
  }

  const validation = validatePassword(newPassword);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      error: validation.message
    });
  }

  next();
};

/**
 * Validate OTP in request body
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateOTP = (req, res, next) => {
  const { otp } = req.body;
  
  if (!otp) {
    return res.status(400).json({
      success: false,
      error: 'OTP is required'
    });
  }

  if (!isValidOTP(otp)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid OTP format'
    });
  }

  next();
};

/**
 * Validate required fields in request body
 * @param {Array} fields - Array of required field names
 * @returns {Function} Express middleware function
 */
const validateRequired = (fields) => {
  return (req, res, next) => {
    const validation = validateRequiredFields(req.body, fields);
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: validation.message
      });
    }

    next();
  };
};

/**
 * Sanitize request body
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const sanitizeBody = (req, res, next) => {
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    }
  }
  next();
};

/**
 * Log request details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const logRequest = (req, res, next) => {
  Logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method !== 'GET' ? req.body : undefined
  });
  next();
};

module.exports = {
  validateEmail,
  validatePasswordMiddleware,
  validateOTP,
  validateRequired,
  sanitizeBody,
  logRequest
};
