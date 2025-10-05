# CVVIN Authentication Troubleshooting Guide

This guide helps you troubleshoot common issues with the CVVIN authentication system.

## 🚀 Quick Start

1. **Start Backend Server:**
   ```bash
   cd backend
   npm install
   cp env.example .env
   # Update .env with your Gmail credentials
   npm run dev
   ```

2. **Start Frontend Server:**
   ```bash
   npm install
   cp env.example .env.local
   # Update .env.local with your configuration
   npm run dev
   ```

3. **Test OTP System:**
   ```bash
   node test-otp.js
   ```

## 🔍 Common Issues & Solutions

### 1. Login Error Messages

**Problem:** Wrong email/password shows generic error messages.

**Solution:** ✅ **FIXED** - The system now shows specific error messages:
- "No user found with this email address" for wrong email
- "Incorrect password" for wrong password
- "Invalid email address" for malformed email
- "Too many failed attempts. Please try again later" for rate limiting

### 2. OTP Resend Issues

**Problem:** After resending OTP, old OTP still works or new OTP doesn't work.

**Solution:** ✅ **FIXED** - The system now:
- Invalidates old OTP when sending new one
- Only accepts the most recent OTP
- Properly handles OTP type (verification vs reset)

### 3. Forgot Password OTP Validation

**Problem:** After entering OTP for password reset, it always shows "invalid".

**Solution:** ✅ **FIXED** - The system now:
- Properly tracks OTP type (verification vs reset)
- Matches OTP by email AND type
- Provides detailed logging for debugging

## 🛠️ Debugging Steps

### Step 1: Check Backend Logs

Look for these log messages in the backend console:

```
Sending OTP for email: user@example.com, type: verification
Generated OTP: 123456 for user@example.com (verification)
OTP email sent successfully to user@example.com
```

### Step 2: Check OTP Verification

When verifying OTP, look for:

```
Verifying OTP for email: user@example.com, type: reset, otp: 123456
Checking OTP: user@example.com (reset) - 123456
Found OTP by email/type: Yes
OTP verified successfully for user@example.com
```

### Step 3: Test API Endpoints

Use the test script or test manually:

```bash
# Test health check
curl http://localhost:3001/health

# Test send OTP
curl -X POST http://localhost:3001/api/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","type":"verification"}'

# Test verify OTP
curl -X POST http://localhost:3001/api/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456","type":"verification"}'
```

## 📧 Email Issues

### Gmail SMTP Problems

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password:**
   - Go to Google Account → Security → 2-Step Verification
   - Generate app password for "Mail"
   - Use this password in `../backend/.env`

3. **Check Gmail Settings:**
   ```env
   MAIL_USERNAME=cvvinteam@gmail.com
   MAIL_PASSWORD=your_16_character_app_password
   MAIL_FROM=cvvinteam@gmail.com
   MAIL_PORT=587
   MAIL_SERVER=smtp.gmail.com
   ```

### Email Not Received

1. Check spam/junk folder
2. Verify email address is correct
3. Check backend logs for SMTP errors
4. Test with a different email address

## 🔧 Backend Issues

### Port Already in Use

```bash
# Kill process on port 3001
npx kill-port 3001

# Or change port in ../backend/.env
PORT=3002
```

### CORS Issues

Make sure `FRONTEND_URL` in `../backend/.env` matches your frontend URL:

```env
FRONTEND_URL=http://localhost:8080
```

### OTP Storage Issues

The system uses in-memory storage. If you restart the backend:
- All pending OTPs will be lost
- Users will need to request new OTPs

## 🎨 Frontend Issues

### Environment Variables

Make sure `.env.local` is properly configured:

```env
VITE_API_BASE_URL=http://localhost:3001
VITE_FIREBASE_API_KEY=your_firebase_key
# ... other Firebase config
```

### Network Errors

1. Check if backend is running on port 3001
2. Verify CORS configuration
3. Check browser console for errors
4. Test API endpoints directly

## 🐛 Debug Mode

### Enable Detailed Logging

The backend now includes detailed logging. Check console for:

- OTP generation and storage
- Email sending status
- OTP verification attempts
- Error details

### Test OTP Flow

1. **Send OTP:** Check logs for generation and email sending
2. **Verify OTP:** Check logs for lookup and validation
3. **Resend OTP:** Check logs for old OTP removal and new OTP creation

## 📱 Testing Checklist

### Login Flow
- [ ] Wrong email shows "No user found" error
- [ ] Wrong password shows "Incorrect password" error
- [ ] Valid credentials redirect to dashboard
- [ ] Error messages are user-friendly

### Signup Flow
- [ ] Email validation works
- [ ] Password strength validation works
- [ ] OTP email is sent
- [ ] OTP verification works
- [ ] User is redirected to dashboard after verification

### Forgot Password Flow
- [ ] Email validation works
- [ ] OTP email is sent with "reset" type
- [ ] OTP verification works for reset type
- [ ] User is redirected to set new password page

### OTP Resend
- [ ] Old OTP is invalidated when resending
- [ ] New OTP works correctly
- [ ] Resend cooldown works (30 seconds)
- [ ] Only one OTP is valid at a time

## 🚨 Emergency Fixes

### Reset All OTPs

If OTPs are stuck, restart the backend server:

```bash
cd backend
npm run dev
```

### Clear Browser Storage

Clear localStorage and sessionStorage:

```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
```

### Test with Fresh Email

Use a different email address to test the complete flow.

## 📞 Support

If issues persist:

1. Check backend logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test API endpoints independently
4. Check Gmail SMTP configuration
5. Ensure both frontend and backend servers are running

## 🔄 Recent Fixes Applied

1. **Login Error Messages:** Now shows specific Firebase error messages
2. **OTP Resend:** Properly invalidates old OTPs and creates new ones
3. **Forgot Password:** Fixed OTP type handling for password reset
4. **Debug Logging:** Added comprehensive logging for troubleshooting
5. **Error Handling:** Improved error messages and user feedback

The authentication system should now work correctly with proper error messages and OTP handling! 🎉

