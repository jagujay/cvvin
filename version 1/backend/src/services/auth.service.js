const { getAuth } = require('../config/firebase.config');
const Logger = require('../utils/logger.utils');

/**
 * Authentication service for Firebase Auth operations
 */
class AuthService {
  constructor() {
    this._auth = null;
  }

  /**
   * Get Firebase Auth instance (lazy initialization)
   * @returns {admin.auth.Auth} Firebase Auth instance
   */
  get auth() {
    if (!this._auth) {
      this._auth = getAuth();
    }
    return this._auth;
  }

  /**
   * Get user by email
   * @param {string} email - User email
   * @returns {Promise<Object>} User record
   */
  async getUserByEmail(email) {
    try {
      const userRecord = await this.auth.getUserByEmail(email);
      Logger.info(`User found by email: ${email}`);
      return userRecord;
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        Logger.warn(`User not found: ${email}`);
        throw new Error('User not found');
      }
      Logger.error('Error getting user by email', error);
      throw error;
    }
  }

  /**
   * Update user password
   * @param {string} uid - User ID
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Updated user record
   */
  async updateUserPassword(uid, newPassword) {
    try {
      const userRecord = await this.auth.updateUser(uid, {
        password: newPassword
      });
      Logger.info(`Password updated for user: ${uid}`);
      return userRecord;
    } catch (error) {
      Logger.error('Error updating user password', error);
      throw error;
    }
  }

  /**
   * Update user password by email
   * @param {string} email - User email
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Updated user record
   */
  async updatePasswordByEmail(email, newPassword) {
    try {
      const userRecord = await this.getUserByEmail(email);
      return await this.updateUserPassword(userRecord.uid, newPassword);
    } catch (error) {
      Logger.error('Error updating password by email', error);
      throw error;
    }
  }

  /**
   * Create custom token for user
   * @param {string} uid - User ID
   * @param {Object} additionalClaims - Additional claims
   * @returns {Promise<string>} Custom token
   */
  async createCustomToken(uid, additionalClaims = {}) {
    try {
      const token = await this.auth.createCustomToken(uid, additionalClaims);
      Logger.info(`Custom token created for user: ${uid}`);
      return token;
    } catch (error) {
      Logger.error('Error creating custom token', error);
      throw error;
    }
  }

  /**
   * Verify ID token
   * @param {string} idToken - ID token to verify
   * @returns {Promise<Object>} Decoded token
   */
  async verifyIdToken(idToken) {
    try {
      const decodedToken = await this.auth.verifyIdToken(idToken);
      Logger.debug(`ID token verified for user: ${decodedToken.uid}`);
      return decodedToken;
    } catch (error) {
      Logger.error('Error verifying ID token', error);
      throw error;
    }
  }

  /**
   * Revoke refresh tokens for user
   * @param {string} uid - User ID
   * @returns {Promise<void>}
   */
  async revokeRefreshTokens(uid) {
    try {
      await this.auth.revokeRefreshTokens(uid);
      Logger.info(`Refresh tokens revoked for user: ${uid}`);
    } catch (error) {
      Logger.error('Error revoking refresh tokens', error);
      throw error;
    }
  }

  /**
   * Delete user account
   * @param {string} uid - User ID
   * @returns {Promise<void>}
   */
  async deleteUser(uid) {
    try {
      await this.auth.deleteUser(uid);
      Logger.info(`User account deleted: ${uid}`);
    } catch (error) {
      Logger.error('Error deleting user', error);
      throw error;
    }
  }
}

module.exports = AuthService;
