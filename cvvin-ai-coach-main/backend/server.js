const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));
app.use(express.json());

// In-memory storage for OTPs (in production, use Redis or database)
const otpStorage = new Map();

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

// Configure nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_SERVER,
  port: process.env.MAIL_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD
  }
});

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
const sendOTPEmail = async (email, otp, type = 'verification') => {
  const subject = type === 'verification' 
    ? 'CVVIN - Verify Your Email Address' 
    : 'CVVIN - Password Reset Code';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
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
            <li>The code will expire in 10 minutes</li>
            <li>If you didn't request this, please ignore this email</li>
          </ul>
        </div>
        
        <p>If you're having trouble with the code, you can also click the button below:</p>
        
        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL}/auth/verify-otp?email=${encodeURIComponent(email)}&otp=${otp}" class="button">
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

  const mailOptions = {
    from: `"CVVIN Team" <${process.env.MAIL_FROM}>`,
    to: email,
    subject: subject,
    html: htmlContent
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`OTP email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw error;
  }
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Send OTP for email verification
app.post('/api/send-otp', async (req, res) => {
  try {
    const { email, type = 'verification' } = req.body;

    console.log(`Sending OTP for email: ${email}, type: ${type}`);

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Remove any existing OTP for this email and type
    for (const [id, otpData] of otpStorage.entries()) {
      if (otpData.email === email && otpData.type === type) {
        console.log(`Removing existing OTP for ${email} (${type})`);
        otpStorage.delete(id);
      }
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpId = uuidv4();
    
    console.log(`Generated OTP: ${otp} for ${email} (${type})`);
    
    // Store OTP with expiration (10 minutes)
    otpStorage.set(otpId, {
      email,
      otp,
      type,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });

    // Send email
    await sendOTPEmail(email, otp, type);

    console.log(`OTP email sent successfully to ${email}`);

    res.json({ 
      success: true, 
      message: 'OTP sent successfully',
      otpId // For testing purposes, remove in production
    });

  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ 
      error: 'Failed to send OTP',
      message: error.message 
    });
  }
});

// Verify OTP
app.post('/api/verify-otp', (req, res) => {
  try {
    const { email, otp, otpId, type = 'verification' } = req.body;

    console.log(`Verifying OTP for email: ${email}, type: ${type}, otp: ${otp}`);

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    // Find OTP by email or otpId
    let foundOTP = null;
    let foundId = null;
    
    if (otpId) {
      foundOTP = otpStorage.get(otpId);
      foundId = otpId;
      console.log(`Found OTP by ID: ${foundOTP ? 'Yes' : 'No'}`);
    } else {
      // Search by email and type
      for (const [id, otpData] of otpStorage.entries()) {
        console.log(`Checking OTP: ${otpData.email} (${otpData.type}) - ${otpData.otp}`);
        if (otpData.email === email && otpData.type === type) {
          foundOTP = otpData;
          foundId = id;
          break;
        }
      }
      console.log(`Found OTP by email/type: ${foundOTP ? 'Yes' : 'No'}`);
    }

    if (!foundOTP) {
      console.log(`No OTP found for ${email} (${type})`);
      return res.status(400).json({ error: 'Invalid OTP or OTP not found' });
    }

    // Check if OTP is expired
    if (new Date() > foundOTP.expiresAt) {
      console.log(`OTP expired for ${email}`);
      if (foundId) {
        otpStorage.delete(foundId);
      }
      return res.status(400).json({ error: 'OTP has expired' });
    }

    // Verify OTP
    if (foundOTP.otp !== otp) {
      console.log(`OTP mismatch: expected ${foundOTP.otp}, got ${otp}`);
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    console.log(`OTP verified successfully for ${email}`);
    
    // Remove used OTP
    if (foundId) {
      otpStorage.delete(foundId);
    }

    res.json({ 
      success: true, 
      message: 'OTP verified successfully' 
    });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ 
      error: 'Failed to verify OTP',
      message: error.message 
    });
  }
});

// Reset password endpoint
app.post('/api/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    console.log(`Resetting password for email: ${email}`);

    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Get user by email using Firebase Admin SDK
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        return res.status(400).json({ error: 'User not found' });
      }
      throw error;
    }

    // Update the user's password
    await admin.auth().updateUser(userRecord.uid, {
      password: newPassword
    });

    console.log(`Password updated successfully for ${email}`);

    res.json({ 
      success: true, 
      message: 'Password updated successfully' 
    });

  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ 
      error: 'Failed to reset password',
      message: error.message 
    });
  }
});

// Clean up expired OTPs (run every 5 minutes)
setInterval(() => {
  const now = new Date();
  for (const [id, otpData] of otpStorage.entries()) {
    if (now > otpData.expiresAt) {
      otpStorage.delete(id);
    }
  }
}, 5 * 60 * 1000);

// Start server
app.listen(PORT, () => {
  console.log(`CVVIN Backend server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:8080'}`);
});
