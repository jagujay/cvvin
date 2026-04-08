const { query, getClient } = require('../config/database.config');
const Logger = require('../utils/logger.utils');

/**
 * User Profile Service for managing user data in PostgreSQL
 */
class UserProfileService {
  
  /**
   * Sync Firebase user to PostgreSQL
   * @param {Object} firebaseUser - Firebase user object
   * @returns {Promise<Object>} Created/updated user record
   */
  async syncFirebaseUser(firebaseUser) {
    try {
      const { uid, email, displayName, photoURL, phoneNumber } = firebaseUser;
      
      // Check if user already exists
      const existingUser = await this.getUserByFirebaseUid(uid);
      
      if (existingUser) {
        // Update existing user - ONLY update fields that should come from Firebase
        // Preserve user-entered data (first_name, last_name, phone, profile_image_url)
        // Only update: email, last_login (and Firebase photo if user doesn't have a profile image)
        const updateQuery = `
          UPDATE users 
          SET email = $1,
              last_login = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE firebase_uid = $2
          RETURNING *
        `;
        
        // Only update profile_image_url if:
        // 1. User doesn't have one yet (existingUser.profile_image_url is null)
        // 2. And Firebase has one (photoURL is not null)
        let finalUpdateQuery = updateQuery;
        let queryParams = [email, uid];
        
        if (!existingUser.profile_image_url && photoURL) {
          finalUpdateQuery = `
            UPDATE users 
            SET email = $1,
                profile_image_url = $2,
                last_login = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE firebase_uid = $3
            RETURNING *
          `;
          queryParams = [email, photoURL, uid];
        }
        
        const result = await query(finalUpdateQuery, queryParams);
        
        Logger.info(`User synced (preserving user data): ${email}`);
        return result.rows[0];
      } else {
        // Create new user with ON CONFLICT handling to prevent race conditions
        // If user is created by another request simultaneously, just return the existing one
        const insertQuery = `
          INSERT INTO users (
            firebase_uid, email, first_name, last_name, phone, 
            profile_image_url, last_login, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (firebase_uid) DO UPDATE SET
            email = EXCLUDED.email,
            last_login = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          RETURNING *
        `;
        
        const nameParts = displayName ? displayName.split(' ') : ['', ''];
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        try {
          const result = await query(insertQuery, [
            uid,
            email,
            firstName,
            lastName,
            phoneNumber || null,
            photoURL || null
          ]);
          
          Logger.info(`New user created or updated: ${email}`);
          return result.rows[0];
        } catch (error) {
          // If still fails (shouldn't happen with ON CONFLICT), try to get existing user
          if (error.code === '23505') { // Unique violation
            Logger.warn(`Race condition detected, fetching existing user: ${email}`);
            const existingUser = await this.getUserByFirebaseUid(uid);
            if (existingUser) {
              return existingUser;
            }
          }
          throw error;
        }
      }
    } catch (error) {
      Logger.error('Failed to sync Firebase user', error);
      throw error;
    }
  }

  /**
   * Get user by Firebase UID
   * @param {string} firebaseUid - Firebase UID
   * @returns {Promise<Object|null>} User record
   */
  async getUserByFirebaseUid(firebaseUid) {
    try {
      const result = await query(
        'SELECT * FROM users WHERE firebase_uid = $1',
        [firebaseUid]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      Logger.error('Failed to get user by Firebase UID', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} User record
   */
  async getUserById(userId) {
    try {
      const result = await query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      Logger.error('Failed to get user by ID', error);
      throw error;
    }
  }

  /**
   * Get user profile with additional data
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} User profile with related data
   */
  async getUserProfile(userId) {
    try {
      const result = await query(`
        SELECT 
          u.*,
          up.resume_url,
          up.resume_text,
          up.skills,
          up.experience_years,
          up.education,
          up.certifications,
          up.languages,
          up.target_roles,
          up.created_at as profile_created_at,
          up.updated_at as profile_updated_at
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE u.id = $1
      `, [userId]);
      
      return result.rows[0] || null;
    } catch (error) {
      Logger.error('Failed to get user profile', error);
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} profileData - Profile data to update
   * @returns {Promise<Object>} Updated profile
   */
  async updateUserProfile(userId, profileData) {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');
      
      // Update basic user info - build query dynamically based on provided fields
      const updateFields = [];
      const queryParams = [];
      let paramIndex = 1;
      
      // Build dynamic update query for users table
      if (profileData.firstName !== undefined) {
        const value = profileData.firstName !== '' ? profileData.firstName : null;
        updateFields.push(`first_name = $${paramIndex}`);
        queryParams.push(value);
        paramIndex++;
      }
      
      if (profileData.lastName !== undefined) {
        const value = profileData.lastName !== '' ? profileData.lastName : null;
        updateFields.push(`last_name = $${paramIndex}`);
        queryParams.push(value);
        paramIndex++;
      }
      
      if (profileData.phone !== undefined) {
        const value = profileData.phone !== '' ? profileData.phone : null;
        updateFields.push(`phone = $${paramIndex}`);
        queryParams.push(value);
        paramIndex++;
      }
      
      if (profileData.profileImageUrl !== undefined) {
        updateFields.push(`profile_image_url = $${paramIndex}`);
        queryParams.push(profileData.profileImageUrl);
        paramIndex++;
      }
      
      // Always update updated_at
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      
      // Only run update if there are fields to update
      if (updateFields.length > 1) { // More than just updated_at
        queryParams.push(userId);
        
        const userUpdateQuery = `
          UPDATE users 
          SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex}
        `;
        
        await client.query(userUpdateQuery, queryParams);
      }
      
      // Update or create user profile
      const profileExistsQuery = 'SELECT id FROM user_profiles WHERE user_id = $1';
      const profileExists = await client.query(profileExistsQuery, [userId]);
      
      if (profileExists.rows.length > 0) {
        // Update existing profile
        const profileUpdateQuery = `
          UPDATE user_profiles 
          SET skills = COALESCE($1, skills),
              experience_years = COALESCE($2, experience_years),
              education = COALESCE($3, education),
              certifications = COALESCE($4, certifications),
              languages = COALESCE($5, languages),
              target_roles = COALESCE($6, target_roles),
              resume_url = COALESCE($7, resume_url),
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $8
        `;
        
        // Handle resume URL - convert file ID to URL if needed
        let resumeUrl = profileData.resumeUrl;
        if (resumeUrl && !resumeUrl.startsWith('/uploads/') && !resumeUrl.startsWith('http')) {
          // This is likely a file ID, get the actual file path from files table
          try {
            const fileQuery = 'SELECT file_path FROM files WHERE id = $1 AND user_id = $2';
            const fileResult = await client.query(fileQuery, [resumeUrl, userId]);
            if (fileResult.rows.length > 0) {
              resumeUrl = fileResult.rows[0].file_path;
            }
          } catch (error) {
            Logger.warn(`Failed to get file path for resume ID: ${resumeUrl}`, error);
            resumeUrl = null;
          }
        }
        
        await client.query(profileUpdateQuery, [
          profileData.skills !== undefined ? JSON.stringify(profileData.skills) : null,
          profileData.experienceYears !== undefined ? profileData.experienceYears : null,
          profileData.education !== undefined ? JSON.stringify(profileData.education) : null,
          profileData.certifications !== undefined ? JSON.stringify(profileData.certifications) : null,
          profileData.languages !== undefined ? JSON.stringify(profileData.languages) : null,
          profileData.targetRoles !== undefined ? JSON.stringify(profileData.targetRoles) : null,
          resumeUrl !== undefined ? resumeUrl : null,
          userId
        ]);
      } else {
        // Create new profile
        const profileInsertQuery = `
          INSERT INTO user_profiles (
            user_id, skills, experience_years, education, 
            certifications, languages, target_roles, resume_url, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;
        
        // Handle resume URL - convert file ID to URL if needed
        let resumeUrl = profileData.resumeUrl;
        if (resumeUrl && !resumeUrl.startsWith('/uploads/') && !resumeUrl.startsWith('http')) {
          // This is likely a file ID, get the actual file path from files table
          try {
            const fileQuery = 'SELECT file_path FROM files WHERE id = $1 AND user_id = $2';
            const fileResult = await client.query(fileQuery, [resumeUrl, userId]);
            if (fileResult.rows.length > 0) {
              resumeUrl = fileResult.rows[0].file_path;
            }
          } catch (error) {
            Logger.warn(`Failed to get file path for resume ID: ${resumeUrl}`, error);
            resumeUrl = null;
          }
        }
        
        await client.query(profileInsertQuery, [
          userId,
          profileData.skills !== undefined ? JSON.stringify(profileData.skills) : JSON.stringify([]),
          profileData.experienceYears !== undefined ? profileData.experienceYears : null,
          profileData.education !== undefined ? JSON.stringify(profileData.education) : JSON.stringify([]),
          profileData.certifications !== undefined ? JSON.stringify(profileData.certifications) : JSON.stringify([]),
          profileData.languages !== undefined ? JSON.stringify(profileData.languages) : JSON.stringify([]),
          profileData.targetRoles !== undefined ? JSON.stringify(profileData.targetRoles) : JSON.stringify([]),
          resumeUrl !== undefined ? resumeUrl : null
        ]);
      }
      
      await client.query('COMMIT');
      
      // Return updated profile
      const updatedProfile = await this.getUserProfile(userId);
      Logger.info(`User profile updated: ${userId}`);
      
      return updatedProfile;
    } catch (error) {
      await client.query('ROLLBACK');
      Logger.error('Failed to update user profile', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update user profile image
   * @param {string} userId - User ID
   * @param {string} imageUrl - Profile image URL
   * @returns {Promise<Object>} Updated user record
   */
  async updateProfileImage(userId, imageUrl) {
    try {
      const result = await query(
        'UPDATE users SET profile_image_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [imageUrl, userId]
      );
      
      Logger.info(`Profile image updated for user: ${userId}`);
      return result.rows[0];
    } catch (error) {
      Logger.error('Failed to update profile image', error);
      throw error;
    }
  }

  /**
   * Update user resume URL
   * @param {string} userId - User ID
   * @param {string} resumeUrl - Resume URL
   * @param {string} resumeText - Extracted resume text
   * @returns {Promise<Object>} Updated profile
   */
  async updateResumeUrl(userId, resumeUrl, resumeText = null) {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');
      
      // Check if profile exists
      const profileExistsQuery = 'SELECT id FROM user_profiles WHERE user_id = $1';
      const profileExists = await client.query(profileExistsQuery, [userId]);
      
      if (profileExists.rows.length > 0) {
        // Update existing profile
        const updateQuery = `
          UPDATE user_profiles 
          SET resume_url = $1, 
              resume_text = COALESCE($2, resume_text),
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $3
        `;
        
        await client.query(updateQuery, [resumeUrl, resumeText, userId]);
      } else {
        // Create new profile with resume
        const insertQuery = `
          INSERT INTO user_profiles (
            user_id, resume_url, resume_text, skills, experience_years, 
            education, certifications, languages, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;
        
        await client.query(insertQuery, [
          userId,
          resumeUrl,
          resumeText,
          JSON.stringify([]), // Default empty skills
          null, // Default experience years
          JSON.stringify([]), // Default empty education
          JSON.stringify([]), // Default empty certifications
          JSON.stringify([])  // Default empty languages
        ]);
      }
      
      await client.query('COMMIT');
      
      const updatedProfile = await this.getUserProfile(userId);
      Logger.info(`Resume URL updated for user: ${userId}`);
      
      return updatedProfile;
    } catch (error) {
      await client.query('ROLLBACK');
      Logger.error('Failed to update resume URL', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get user's files
   * @param {string} userId - User ID
   * @param {string} fileType - Optional file type filter
   * @returns {Promise<Array>} User's files
   */
  async getUserFiles(userId, fileType = null) {
    try {
      let queryText = 'SELECT * FROM files WHERE user_id = $1';
      let params = [userId];
      
      if (fileType) {
        queryText += ' AND file_type = $2';
        params.push(fileType);
      }
      
      queryText += ' ORDER BY upload_date DESC';
      
      const result = await query(queryText, params);
      return result.rows;
    } catch (error) {
      Logger.error('Failed to get user files', error);
      throw error;
    }
  }

  /**
   * Get user's resume data for analysis
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Resume data
   */
  async getUserResumeData(userId) {
    try {
      const sqlQuery = `
        SELECT 
          up.resume_url,
          up.resume_text,
          up.skills,
          up.experience_years,
          up.education,
          up.certifications,
          up.languages
        FROM user_profiles up
        WHERE up.user_id = $1 AND up.resume_url IS NOT NULL
      `;
      
      const result = await query(sqlQuery, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const profile = result.rows[0];
      return {
        resumeUrl: profile.resume_url,
        resumeText: profile.resume_text,
        skills: profile.skills || [],
        experienceYears: profile.experience_years,
        education: profile.education || [],
        certifications: profile.certifications || [],
        languages: profile.languages || []
      };
      
    } catch (error) {
      Logger.error('Failed to get user resume data', error);
      throw error;
    }
  }

  /**
   * Upload a file
   * @param {Object} fileData - File data
   * @returns {Promise<Object>} Uploaded file record
   */
  async uploadFile(fileData) {
    const client = await getClient();
    
    try {
      const { fileName, filePath, fileSize, mimeType, userId } = fileData;
      
      // Determine file type based on mime type
      let fileType = 'document';
      if (mimeType === 'application/pdf') {
        fileType = 'resume_pdf';
      } else if (mimeType.startsWith('image/')) {
        fileType = 'profile_image';
      }
      
      const insertQuery = `
        INSERT INTO files (
          id, user_id, file_name, file_type, file_path, file_size, 
          mime_type, storage_method, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'filesystem', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) RETURNING *
      `;
      
      const result = await client.query(insertQuery, [
        userId, fileName, fileType, filePath, fileSize, mimeType
      ]);
      
      Logger.info(`File uploaded: ${fileName} for user: ${userId}`);
      return result.rows[0];
      
    } catch (error) {
      Logger.error('Failed to upload file', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all user's files
   * @param {string} userId - User ID
   * @param {string} fileType - Optional file type filter
   * @returns {Promise<Array>} User's files
   */
  async getUserFiles(userId, fileType = null) {
    try {
      let sqlQuery = `
        SELECT 
          id, file_name, file_type, file_path, file_size, mime_type, 
          storage_method, upload_date, is_processed, processing_status, checksum
        FROM files 
        WHERE user_id = $1
      `;
      
      const params = [userId];
      
      if (fileType) {
        sqlQuery += ` AND file_type = $2`;
        params.push(fileType);
      }
      
      sqlQuery += ` ORDER BY upload_date DESC`;
      
      const result = await query(sqlQuery, params);
      
      return result.rows.map(file => ({
        id: file.id,
        fileName: file.file_name,
        fileType: file.file_type,
        filePath: file.file_path,
        fileSize: file.file_size,
        mimeType: file.mime_type,
        storageMethod: file.storage_method,
        uploadDate: file.upload_date,
        isProcessed: file.is_processed,
        processingStatus: file.processing_status,
        checksum: file.checksum
      }));
      
    } catch (error) {
      Logger.error('Failed to get user files', error);
      throw error;
    }
  }

  /**
   * Get file information
   * @param {string} fileId - File ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} File information
   */
  async getFileInfo(fileId, userId) {
    try {
      const sqlQuery = `
        SELECT 
          id, file_name, file_path, file_size, mime_type, 
          storage_method, created_at, updated_at
        FROM files 
        WHERE id = $1 AND user_id = $2
      `;
      
      const result = await query(sqlQuery, [fileId, userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const file = result.rows[0];
      return {
        id: file.id,
        fileName: file.file_name,
        filePath: file.file_path,
        fileSize: file.file_size,
        mimeType: file.mime_type,
        storageMethod: file.storage_method,
        createdAt: file.created_at,
        updatedAt: file.updated_at
      };
      
    } catch (error) {
      Logger.error('Failed to get file info', error);
      throw error;
    }
  }

  /**
   * Get file by path
   * @param {string} filePath - File path
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} File information
   */
  async getFileByPath(filePath, userId) {
    try {
      const sqlQuery = `
        SELECT 
          id, file_name, file_path, file_size, mime_type, 
          storage_method, created_at, updated_at
        FROM files 
        WHERE file_path = $1 AND user_id = $2
        LIMIT 1
      `;
      
      const result = await query(sqlQuery, [filePath, userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const file = result.rows[0];
      return {
        id: file.id,
        fileName: file.file_name,
        filePath: file.file_path,
        fileSize: file.file_size,
        mimeType: file.mime_type,
        storageMethod: file.storage_method,
        createdAt: file.created_at,
        updatedAt: file.updated_at
      };
      
    } catch (error) {
      Logger.error('Failed to get file by path', error);
      throw error;
    }
  }

  /**
   * Delete a file
   * @param {string} fileId - File ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(fileId, userId) {
    const client = await getClient();
    
    try {
      const deleteQuery = 'DELETE FROM files WHERE id = $1 AND user_id = $2';
      const result = await client.query(deleteQuery, [fileId, userId]);
      
      if (result.rowCount === 0) {
        return false;
      }
      
      Logger.info(`File deleted: ${fileId} by user: ${userId}`);
      return true;
      
    } catch (error) {
      Logger.error('Failed to delete file', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete user account and all related data
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteUserAccount(userId) {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');
      
      // Delete user files from filesystem (if any)
      const filesQuery = 'SELECT file_path FROM files WHERE user_id = $1 AND storage_method = $2';
      const filesResult = await client.query(filesQuery, [userId, 'filesystem']);
      
      // Note: In a production environment, you'd want to actually delete the files
      // For now, we'll just delete the database records
      
      // Delete all user data (cascade will handle related records)
      await client.query('DELETE FROM users WHERE id = $1', [userId]);
      
      await client.query('COMMIT');
      
      Logger.info(`User account deleted: ${userId}`);
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      Logger.error('Failed to delete user account', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = UserProfileService;
