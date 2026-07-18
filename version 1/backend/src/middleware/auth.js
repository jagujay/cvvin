const { getAuth } = require('../config/firebase.config');
const UserProfileService = require('../services/user.service');
const Logger = require('../utils/logger.utils');

/**
 * Authentication middleware for Firebase token verification
 */
class AuthMiddleware {
  constructor() {
    this.auth = null;
    this.userService = new UserProfileService();
  }

  /**
   * Get Firebase Auth instance (lazy initialization)
   * @returns {admin.auth.Auth} Firebase Auth instance
   */
  get firebaseAuth() {
    if (!this.auth) {
      this.auth = getAuth();
    }
    return this.auth;
  }

  /**
   * Verify Firebase ID token and extract user information
   * @param {string} idToken - Firebase ID token
   * @returns {Promise<Object>} Decoded token with user info
   */
  async verifyToken(idToken) {
    try {
      const decodedToken = await this.firebaseAuth.verifyIdToken(idToken);
      
      Logger.debug(`Token verified for user: ${decodedToken.uid}`);
      
      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        name: decodedToken.name,
        picture: decodedToken.picture,
        firebaseUser: decodedToken
      };
    } catch (error) {
      Logger.error('Token verification failed', error);
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Get or create user in PostgreSQL database
   * @param {Object} firebaseUser - Firebase user data
   * @returns {Promise<Object>} PostgreSQL user record
   */
  async getOrCreateUser(firebaseUser) {
    try {
      // First, try to get existing user
      let user = await this.userService.getUserByFirebaseUid(firebaseUser.uid);
      
      if (!user) {
        // Create new user if doesn't exist
        // syncFirebaseUser now handles race conditions with ON CONFLICT
        try {
          user = await this.userService.syncFirebaseUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.name,
            photoURL: firebaseUser.picture,
            phoneNumber: null // Phone number not available in ID token
          });
        } catch (error) {
          // If creation fails due to race condition, fetch the user that was created
          if (error.code === '23505' || error.message.includes('duplicate key')) {
            Logger.warn(`Race condition in user creation, fetching existing user: ${firebaseUser.uid}`);
            user = await this.userService.getUserByFirebaseUid(firebaseUser.uid);
            if (!user) {
              throw error; // If still not found, throw original error
            }
          } else {
            throw error;
          }
        }
      }
      
      return user;
    } catch (error) {
      Logger.error('Failed to get or create user', error);
      throw error;
    }
  }

  /**
   * Express middleware for authentication
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async authenticate(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'Authorization header missing or invalid',
          message: 'Please provide a valid Bearer token'
        });
      }

      const idToken = authHeader.split('Bearer ')[1];
      
      if (!idToken) {
        return res.status(401).json({
          success: false,
          error: 'Token missing',
          message: 'Please provide a valid token'
        });
      }

      // Verify Firebase token
      const firebaseUser = await this.verifyToken(idToken);
      
      // Get or create user in PostgreSQL
      const user = await this.getOrCreateUser(firebaseUser);
      
      // Add user info to request object
      req.user = {
        id: user.id,
        firebaseUid: user.firebase_uid,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        profileImageUrl: user.profile_image_url,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      };
      
      req.firebaseUser = firebaseUser;
      
      Logger.debug(`User authenticated: ${user.email} (${user.id})`);
      
      next();
    } catch (error) {
      Logger.error('Authentication failed', error);
      
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: error.message || 'Invalid token'
      });
    }
  }

  /**
   * Optional authentication middleware (doesn't fail if no token)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async optionalAuthenticate(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // No token provided, continue without authentication
        req.user = null;
        req.firebaseUser = null;
        return next();
      }

      const idToken = authHeader.split('Bearer ')[1];
      
      if (!idToken) {
        // No token provided, continue without authentication
        req.user = null;
        req.firebaseUser = null;
        return next();
      }

      // Try to verify token
      const firebaseUser = await this.verifyToken(idToken);
      const user = await this.getOrCreateUser(firebaseUser);
      
      req.user = {
        id: user.id,
        firebaseUid: user.firebase_uid,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        profileImageUrl: user.profile_image_url,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      };
      
      req.firebaseUser = firebaseUser;
      
      Logger.debug(`Optional authentication successful: ${user.email}`);
      
      next();
    } catch (error) {
      Logger.warn('Optional authentication failed, continuing without auth', error.message);
      
      // Continue without authentication
      req.user = null;
      req.firebaseUser = null;
      next();
    }
  }

  /**
   * Middleware to check if user is active
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async requireActiveUser(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please authenticate first'
      });
    }

    if (!req.user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account deactivated',
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    next();
  }

  /**
   * Middleware to check if user has completed profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async requireCompleteProfile(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please authenticate first'
      });
    }

    try {
      const profile = await this.userService.getUserProfile(req.user.id);
      
      if (!profile || !profile.resume_url) {
        return res.status(400).json({
          success: false,
          error: 'Profile incomplete',
          message: 'Please complete your profile and upload a resume first'
        });
      }

      req.userProfile = profile;
      next();
    } catch (error) {
      Logger.error('Failed to check profile completion', error);
      
      return res.status(500).json({
        success: false,
        error: 'Profile check failed',
        message: 'Unable to verify profile completion'
      });
    }
  }
}

// Create singleton instance
const authMiddleware = new AuthMiddleware();

module.exports = authMiddleware;
