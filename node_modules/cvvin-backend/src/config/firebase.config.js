const admin = require('firebase-admin');

/**
 * Initialize Firebase Admin SDK
 * @returns {admin.app.App} Firebase Admin app instance
 */
const initializeFirebase = () => {
  if (!admin.apps.length) {
    const app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    
    console.log('Firebase Admin SDK initialized successfully');
    return app;
  }
  
  return admin.app();
};

/**
 * Get Firebase Auth instance
 * @returns {admin.auth.Auth} Firebase Auth instance
 */
const getAuth = () => {
  return admin.auth();
};

/**
 * Get Firestore instance
 * @returns {admin.firestore.Firestore} Firestore instance
 */
const getFirestore = () => {
  return admin.firestore();
};

module.exports = {
  initializeFirebase,
  getAuth,
  getFirestore
};
