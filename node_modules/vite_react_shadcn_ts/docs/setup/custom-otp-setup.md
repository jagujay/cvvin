# Custom OTP Email Setup Guide

This guide will help you set up custom OTP email sending using your Gmail SMTP credentials for the CVVIN platform.

## Prerequisites

1. Gmail account with App Password enabled
2. Node.js and npm installed
3. The CVVIN project cloned locally

## Step 1: Enable Gmail App Password

1. Go to your [Google Account settings](https://myaccount.google.com/)
2. Navigate to Security → 2-Step Verification
3. Enable 2-Step Verification if not already enabled
4. Go to Security → App passwords
5. Generate a new app password for "Mail"
6. Copy the generated password (16 characters without spaces)

## Step 2: Configure Backend Environment

1. Copy the backend environment file:
   ```bash
   cd backend
   cp env.example .env
   ```

2. Update `../backend/.env` with your Gmail credentials:
   ```env
   # SMTP Email Configuration
   MAIL_USERNAME=cvvinteam@gmail.com
   MAIL_PASSWORD=your_16_character_app_password
   MAIL_FROM=cvvinteam@gmail.com
   MAIL_PORT=587
   MAIL_SERVER=smtp.gmail.com

   # Server Configuration
   PORT=3001
   NODE_ENV=development

   # CORS Configuration
   FRONTEND_URL=http://localhost:8080
   ```

## Step 3: Configure Frontend Environment

1. Copy the frontend environment file:
   ```bash
   cp env.example .env.local
   ```

2. Update `.env.local` with your configuration:
   ```env
   # Firebase Configuration (already configured)
   VITE_FIREBASE_API_KEY="AIzaSyAgE7kn0bltroNaG5R4v6rNVhOJK0AQWWM"
   VITE_FIREBASE_AUTH_DOMAIN="cvvin-platform.firebaseapp.com"
   VITE_FIREBASE_PROJECT_ID="cvvin-platform"
   VITE_FIREBASE_STORAGE_BUCKET="cvvin-platform.firebasestorage.app"
   VITE_FIREBASE_MESSAGING_SENDER_ID="905643483876"
   VITE_FIREBASE_APP_ID="1:905643483876:web:3693e2f3ea26b4a62802f1"
   VITE_FIREBASE_APP_MEASUREMENT_ID="G-5T38M0TH62"

   # Backend API Configuration
   VITE_API_BASE_URL=http://localhost:3001
   ```

## Step 4: Install Dependencies

1. Install backend dependencies:
   ```bash
   cd backend
   npm install
   cd ..
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

## Step 5: Start the Development Environment

### Option 1: Using the Batch File (Windows)
```bash
start-dev.bat
```

### Option 2: Manual Start
1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. In a new terminal, start the frontend:
   ```bash
   npm run dev
   ```

## Step 6: Test the Setup

1. Open your browser to `http://localhost:8080`
2. Try creating a new account
3. Check your Gmail inbox for the OTP email
4. Verify the OTP code works

## Features Implemented

### Custom OTP System
- ✅ 6-digit OTP generation
- ✅ Gmail SMTP email sending
- ✅ Professional email templates
- ✅ 10-minute OTP expiration
- ✅ OTP validation and cleanup

### Email Templates
- ✅ Branded CVVIN email design
- ✅ Responsive HTML email layout
- ✅ Clear instructions and OTP display
- ✅ Direct verification links
- ✅ Professional footer

### Authentication Flow
- ✅ Signup with custom OTP verification
- ✅ Password reset with custom OTP
- ✅ OTP resend functionality
- ✅ Error handling and user feedback

## Email Template Features

The custom OTP emails include:

1. **Professional Design**: CVVIN branded header and styling
2. **Clear OTP Display**: Large, easy-to-read 6-digit code
3. **Instructions**: Step-by-step verification process
4. **Direct Links**: Click-to-verify buttons for convenience
5. **Expiration Notice**: Clear 10-minute expiration warning
6. **Responsive Layout**: Works on all email clients

## API Endpoints

### Backend API (Port 3001)

- `GET /health` - Health check
- `POST /api/send-otp` - Send OTP email
- `POST /api/verify-otp` - Verify OTP code

### Example API Usage

```javascript
// Send OTP
const response = await fetch('http://localhost:3001/api/send-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    type: 'verification' // or 'reset'
  })
});

// Verify OTP
const response = await fetch('http://localhost:3001/api/verify-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    otp: '123456'
  })
});
```

## Troubleshooting

### Common Issues

1. **"Authentication failed" error**
   - Check that your Gmail App Password is correct
   - Ensure 2-Step Verification is enabled
   - Verify the password doesn't have spaces

2. **"Connection timeout" error**
   - Check your internet connection
   - Verify Gmail SMTP settings are correct
   - Try using port 465 with SSL instead of 587

3. **"OTP not received"**
   - Check spam/junk folder
   - Verify email address is correct
   - Check backend server logs for errors

4. **"CORS error"**
   - Ensure frontend URL is correct in ../backend/.env
   - Check that backend server is running on port 3001

### Debug Mode

1. Check backend logs in the terminal
2. Check browser console for frontend errors
3. Verify environment variables are loaded correctly
4. Test API endpoints directly using Postman or curl

## Production Deployment

For production deployment:

1. **Use Environment Variables**: Set all sensitive data via environment variables
2. **Use Redis/Database**: Replace in-memory OTP storage with persistent storage
3. **Rate Limiting**: Implement rate limiting for OTP requests
4. **Email Service**: Consider using SendGrid, AWS SES, or similar for better deliverability
5. **Security**: Implement proper CORS, rate limiting, and input validation

## Security Considerations

1. **App Passwords**: Never commit app passwords to version control
2. **Rate Limiting**: Implement rate limiting to prevent abuse
3. **OTP Expiration**: OTPs expire after 10 minutes for security
4. **Input Validation**: All inputs are validated and sanitized
5. **CORS**: Proper CORS configuration for cross-origin requests

## Support

If you encounter issues:

1. Check the backend server logs
2. Verify all environment variables are set correctly
3. Test the Gmail SMTP connection independently
4. Check browser console for JavaScript errors
5. Ensure both frontend and backend servers are running

The custom OTP system is now fully integrated with your Gmail SMTP credentials and provides a professional email experience for your users!

