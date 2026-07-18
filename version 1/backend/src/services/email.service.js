const { createTransporter, EMAIL_CONFIG } = require('../config/email.config');
const Logger = require('../utils/logger.utils');

/**
 * Email service for sending OTP and other emails
 */
class EmailService {
  constructor() {
    this.transporter = createTransporter();
  }

  /**
   * Send OTP email
   * @param {string} email - Recipient email
   * @param {string} otp - OTP code
   * @param {string} type - Email type ('verification' or 'reset')
   * @returns {Promise<boolean>} Success status
   */
  async sendOTPEmail(email, otp, type = 'verification') {
    try {
      const subject = type === 'verification' 
        ? EMAIL_CONFIG.SUBJECTS.VERIFICATION 
        : EMAIL_CONFIG.SUBJECTS.RESET;

      const htmlContent = this.generateOTPEmailHTML(email, otp, type);

      const mailOptions = {
        from: `"CVVIN Team" <${EMAIL_CONFIG.FROM}>`,
        to: email,
        subject: subject,
        html: htmlContent
      };

      await this.transporter.sendMail(mailOptions);
      Logger.info(`OTP email sent to ${email}`, { type, otp: '***' });
      return true;
    } catch (error) {
      Logger.error('Error sending OTP email', error);
      throw error;
    }
  }

  /**
   * Generate HTML content for OTP email
   * @param {string} email - Recipient email
   * @param {string} otp - OTP code
   * @param {string} type - Email type
   * @returns {string} HTML content
   */
  generateOTPEmailHTML(email, otp, type) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${type === 'verification' ? 'Verify Your Email Address' : 'Password Reset Request'}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
          }
          .otp-code {
            background: #f8fafc;
            border: 2px dashed #2563eb;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
          }
          .otp-number {
            font-size: 32px;
            font-weight: bold;
            color: #2563eb;
            letter-spacing: 5px;
            font-family: 'Courier New', monospace;
          }
          .instructions {
            background: #eff6ff;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
          }
          .button {
            display: inline-block;
            background: #2563eb;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">CVVIN</div>
            <p>Your AI Interview Preparation Partner</p>
          </div>
          
          <h2>${type === 'verification' ? 'Verify Your Email Address' : 'Password Reset Request'}</h2>
          
          <p>Hello!</p>
          
          <p>${type === 'verification' 
            ? 'Thank you for signing up with CVVIN! To complete your registration, please verify your email address using the code below:'
            : 'We received a request to reset your password. Use the code below to proceed with password reset:'
          }</p>
          
          <div class="otp-code">
            <div class="otp-number">${otp}</div>
          </div>
          
          <div class="instructions">
            <p><strong>Instructions:</strong></p>
            <ul>
              <li>Enter this 6-digit code in the verification form</li>
              <li>The code will expire in ${EMAIL_CONFIG.EXPIRATION_MINUTES} minutes</li>
              <li>If you didn't request this, please ignore this email</li>
            </ul>
          </div>
          
          <p>If you're having trouble with the code, you can also click the button below:</p>
          
          <div style="text-align: center;">
            <a href="${frontendUrl}/auth/verify-otp?email=${encodeURIComponent(email)}&otp=${otp}" class="button">
              ${type === 'verification' ? 'Verify Email' : 'Reset Password'}
            </a>
          </div>
          
          <div class="footer">
            <p>This email was sent by CVVIN Team</p>
            <p>If you have any questions, please contact us at cvvinteam@gmail.com</p>
            <p>© 2024 CVVIN. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Test email connection
   * @returns {Promise<boolean>} Connection status
   */
  async testConnection() {
    try {
      await this.transporter.verify();
      Logger.info('Email service connection verified');
      return true;
    } catch (error) {
      Logger.error('Email service connection failed', error);
      return false;
    }
  }
}

module.exports = EmailService;
