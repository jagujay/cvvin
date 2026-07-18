/**
 * Simple logging utility with different log levels
 */
class Logger {
  /**
   * Log info message
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   */
  static info(message, data = null) {
    const timestamp = new Date().toISOString();
    if (data) {
      console.log(`[${timestamp}] INFO: ${message}`, data);
    } else {
      console.log(`[${timestamp}] INFO: ${message}`);
    }
  }

  /**
   * Log error message
   * @param {string} message - Error message
   * @param {Error} error - Error object
   */
  static error(message, error = null) {
    const timestamp = new Date().toISOString();
    if (error) {
      console.error(`[${timestamp}] ERROR: ${message}`, error);
    } else {
      console.error(`[${timestamp}] ERROR: ${message}`);
    }
  }

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {Object} data - Additional data to log
   */
  static warn(message, data = null) {
    const timestamp = new Date().toISOString();
    if (data) {
      console.warn(`[${timestamp}] WARN: ${message}`, data);
    } else {
      console.warn(`[${timestamp}] WARN: ${message}`);
    }
  }

  /**
   * Log debug message (only in development)
   * @param {string} message - Debug message
   * @param {Object} data - Additional data to log
   */
  static debug(message, data = null) {
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString();
      if (data) {
        console.log(`[${timestamp}] DEBUG: ${message}`, data);
      } else {
        console.log(`[${timestamp}] DEBUG: ${message}`);
      }
    }
  }
}

module.exports = Logger;
