# Firebase Authentication Setup Guide

This guide will help you set up Firebase Authentication for the CVVIN platform.

## Prerequisites

1. A Google account
2. Node.js and npm installed
3. The CVVIN project cloned locally

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name: `cvvin-platform` (or your preferred name)
4. Enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Authentication

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable the following providers:
   - **Email/Password**: Click on it and toggle "Enable"
   - **Google**: Click on it, toggle "Enable", and add your project's support email

## Step 3: Get Firebase Configuration

1. Go to Project Settings (gear icon) → General tab
2. Scroll down to "Your apps" section
3. Click "Add app" → Web app (</> icon)
4. Register your app with a nickname: `cvvin-web`
5. Copy the Firebase configuration object

## Step 4: Configure Environment Variables

1. Copy `env.example` to `.env.local`:
   ```bash
   cp env.example .env.local
   ```

2. Update `.env.local` with your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY=your_actual_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_actual_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_actual_sender_id
   VITE_FIREBASE_APP_ID=your_actual_app_id
   ```

## Step 5: Set Up Firestore Database

1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location close to your users
5. Click "Done"

## Step 6: Configure Firestore Security Rules

1. Go to Firestore Database → Rules tab
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read and write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can read and write their own sessions
    match /sessions/{sessionId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // Users can read and write their own feedback
    match /feedback/{feedbackId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
  }
}
```

3. Click "Publish"

## Step 7: Test the Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser to `http://localhost:8080`
4. Try creating a new account
5. Check Firebase Console → Authentication to see the new user
6. Check Firestore Database to see the user document

## Features Implemented

### Authentication Methods
- ✅ Email/Password signup and login
- ✅ Google OAuth sign-in
- ✅ Password reset via email
- ✅ Email verification

### User Management
- ✅ User profile creation in Firestore
- ✅ Profile completion tracking
- ✅ Session management
- ✅ Automatic logout on token expiry

### Security
- ✅ Protected routes
- ✅ Firestore security rules
- ✅ Input validation
- ✅ Error handling

## Troubleshooting

### Common Issues

1. **"Firebase: Error (auth/invalid-api-key)"**
   - Check that your environment variables are correctly set
   - Ensure the API key is copied correctly from Firebase Console

2. **"Firebase: Error (auth/domain-not-authorized)"**
   - Add your domain to Firebase Console → Authentication → Settings → Authorized domains

3. **"Firebase: Error (auth/operation-not-allowed)"**
   - Enable the authentication method in Firebase Console → Authentication → Sign-in method

4. **"Firebase: Error (auth/too-many-requests)"**
   - Wait a few minutes before trying again
   - Check if you're in a development environment with rate limiting

### Development Tips

1. **Firebase Emulator Suite**: For local development, consider using Firebase emulators
2. **Debug Mode**: Enable debug mode in Firebase Console for detailed error logs
3. **Network Tab**: Check browser network tab for failed requests
4. **Console Logs**: Check browser console for JavaScript errors

## Next Steps

1. **Production Setup**: Configure production Firebase project
2. **Custom Claims**: Implement user roles and permissions
3. **Advanced Security**: Set up more granular Firestore rules
4. **Analytics**: Integrate Firebase Analytics for user behavior tracking
5. **Performance**: Add Firebase Performance Monitoring

## Support

If you encounter issues:
1. Check the [Firebase Documentation](https://firebase.google.com/docs)
2. Review the [Firebase Auth Web SDK Reference](https://firebase.google.com/docs/reference/js/auth)
3. Check the browser console for detailed error messages
4. Ensure all environment variables are properly set
