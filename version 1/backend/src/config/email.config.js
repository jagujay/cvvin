const nodemailer = require('nodemailer');

/**
 * Create and configure nodemailer transporter
 * @returns {nodemailer.Transporter} Configured email transporter
 */
const createTransporter = () => {
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_SERVER,
    port: process.env.MAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD
    }
  });

  console.log('Email transporter configured successfully');
  return transporter;
};

/**
 * Email configuration constants
 */
const EMAIL_CONFIG = {
  FROM: process.env.MAIL_FROM || 'cvvinteam@gmail.com',
  SUBJECTS: {
    VERIFICATION: 'CVVIN - Verify Your Email Address',
    RESET: 'CVVIN - Password Reset Code'
  },
  EXPIRATION_MINUTES: 10
};

module.exports = {
  createTransporter,
  EMAIL_CONFIG
};
