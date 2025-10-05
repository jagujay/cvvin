# Firebase Admin SDK Setup Guide

This guide will help you set up Firebase Admin SDK for password reset functionality in the CVVIN platform.

## 🔧 Prerequisites

1. Firebase project already created
2. Backend server running
3. Node.js and npm installed

## Step 1: Generate Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`cvvin-platform`)
3. Go to **Project Settings** (gear icon) → **Service Accounts** tab
4. Click **Generate new private key**
5. Download the JSON file (keep it secure!)

## Step 2: Extract Credentials

From the downloaded JSON file, extract these values:

```json
{
  "project_id": "cvvin-platform",
  "client_email": "firebase-adminsdk-xxxxx@cvvin-platform.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
}
```

## Step 3: Configure Backend Environment

1. Copy the backend environment file:
   ```bash
   cd backend
   cp env.example .env
   ```

2. Update `../backend/.env` with your Firebase Admin credentials:
   ```env
   # SMTP Email Configuration
   MAIL_USERNAME=cvvinteam@gmail.com
   MAIL_PASSWORD=ewha nqvk opyf brhf 
   MAIL_FROM=cvvinteam@gmail.com
   MAIL_PORT=587
   MAIL_SERVER=smtp.gmail.com

   # Server Configuration
   PORT=3001
   NODE_ENV=development

   # CORS Configuration
   FRONTEND_URL=http://localhost:8080

   # Firebase Admin SDK Configuration
   FIREBASE_PROJECT_ID=cvvin-platform
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@cvvin-platform.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
   ```

## Step 4: Install Dependencies

```bash
cd backend
npm install
```

## Step 5: Test the Setup

1. Start the backend server:
   ```bash
   npm run dev
   ```

2. Test the password reset endpoint:
   ```bash
   curl -X POST http://localhost:3001/api/reset-password \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","newPassword":"newpassword123"}'
   ```

## 🔒 Security Considerations

### Environment Variables
- **Never commit** the `.env` file to version control
- **Keep the service account key secure**
- **Use different keys** for development and production

### Service Account Permissions
The service account needs these permissions:
- `Firebase Authentication Admin`
- `Cloud Firestore User` (if using Firestore)

### Production Deployment
For production:
1. Use environment variables from your hosting platform
2. Rotate service account keys regularly
3. Monitor service account usage
4. Use least privilege principle

## 🧪 Testing Password Reset Flow

### Complete Flow Test

1. **Start both servers:**
   ```bash
   # Backend
   cd backend && npm run dev
   
   # Frontend
   npm run dev
   ```

2. **Test the complete flow:**
   - Go to login page
   - Click "Forgot password?"
   - Enter email address
   - Check email for OTP
   - Enter OTP code
   - Set new password
   - Try logging in with new password

3. **Verify password was updated:**
   - Try logging in with old password (should fail)
   - Try logging in with new password (should succeed)

## 🐛 Troubleshooting

### Common Issues

1. **"Firebase Admin SDK not initialized"**
   - Check environment variables are set correctly
   - Verify private key format (include `\n` for newlines)
   - Ensure project ID matches your Firebase project

2. **"Permission denied"**
   - Check service account has proper permissions
   - Verify the service account email is correct
   - Ensure the private key is valid

3. **"User not found"**
   - Verify the email exists in Firebase Auth
   - Check email spelling
   - Ensure user account is not disabled

### Debug Mode

Enable debug logging by checking backend console for:
```
Resetting password for email: user@example.com
Password updated successfully for user@example.com
```

## 📋 API Endpoints

### Password Reset Endpoint

**POST** `/api/reset-password`

**Request Body:**
```json
{
  "email": "user@example.com",
  "newPassword": "newpassword123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

**Response (Error):**
```json
{
  "error": "User not found",
  "message": "User not found"
}
```

## 🔄 Integration with Frontend

The password reset flow now works as follows:

1. **User requests password reset** → OTP sent to email
2. **User verifies OTP** → Redirected to set new password
3. **User sets new password** → Password updated in Firebase
4. **User can login** with new password

## 🚀 Production Deployment

### Environment Variables
Set these in your production environment:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

### Security Checklist
- [ ] Service account key is secure
- [ ] Environment variables are set
- [ ] HTTPS is enabled
- [ ] CORS is properly configured
- [ ] Rate limiting is implemented
- [ ] Error logging is enabled

## 📞 Support

If you encounter issues:

1. Check backend logs for detailed error messages
2. Verify Firebase Admin SDK credentials
3. Test API endpoints independently
4. Ensure user exists in Firebase Auth
5. Check service account permissions

The password reset functionality is now fully integrated with Firebase Authentication! 🎉

