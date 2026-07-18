const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Import services and middleware
const UserProfileService = require('../services/user.service');
const authMiddleware = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateRequired, validateEmail } = require('../middleware/validation');
const Logger = require('../utils/logger.utils');

// Initialize services
const userService = new UserProfileService();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'users', req.user.id);
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and PDFs
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, PNG) and PDF files are allowed'));
    }
  }
});

/**
 * Sync Firebase user to PostgreSQL
 * POST /api/users/sync
 */
router.post('/sync',
  authMiddleware.authenticate.bind(authMiddleware),
  asyncHandler(async (req, res) => {
    try {
      const firebaseUser = req.firebaseUser;
      
      // Sync user to PostgreSQL
      const user = await userService.syncFirebaseUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.name,
        photoURL: firebaseUser.picture,
        phoneNumber: null
      });

      Logger.info(`User synced: ${user.email}`);

      res.json({
        success: true,
        message: 'User synced successfully',
        data: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          profileImageUrl: user.profile_image_url,
          isActive: user.is_active,
          createdAt: user.created_at
        }
      });
    } catch (error) {
      Logger.error('User sync failed', error);
      res.status(500).json({
        success: false,
        error: 'Sync failed',
        message: error.message
      });
    }
  })
);

/**
 * Get user profile
 * GET /api/users/profile
 * Returns user profile with empty defaults if profile doesn't exist yet (seamless for new users)
 */
router.get('/profile',
  authMiddleware.authenticate.bind(authMiddleware),
  asyncHandler(async (req, res) => {
    try {
      // User should already exist due to auth middleware, but get basic user info
      const user = await userService.getUserById(req.user.id);
      
      if (!user) {
        // This shouldn't happen, but handle gracefully
        Logger.warn(`User not found in database after authentication: ${req.user.id}`);
        return res.status(404).json({
          success: false,
          error: 'User not found',
          message: 'User not found in database'
        });
      }

      // Try to get profile, but don't fail if it doesn't exist
      const profile = await userService.getUserProfile(req.user.id);
      
      // If no profile exists, return user data with empty profile structure (seamless for new users)
      if (!profile) {
        return res.json({
          success: true,
          data: {
            id: user.id,
            firebase_uid: user.firebase_uid,
            email: user.email,
            firstName: user.first_name || null,
            lastName: user.last_name || null,
            phone: user.phone || null,
            profileImageUrl: user.profile_image_url || null,
            isActive: user.is_active,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
            preferences: {
              targetRoles: []
            },
            profile: {
              resumeUrl: null,
              skills: [],
              education: [],
              certifications: [],
              languages: [],
              createdAt: null,
              updatedAt: null
            }
          }
        });
      }

      // Return full profile data
      res.json({
        success: true,
        data: {
          id: profile.id,
          firebase_uid: profile.firebase_uid,
          email: profile.email,
          firstName: profile.first_name || null,
          lastName: profile.last_name || null,
          phone: profile.phone || null,
          profileImageUrl: profile.profile_image_url || null,
          isActive: profile.is_active,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
          preferences: {
            targetRoles: profile.target_roles || []
          },
          profile: {
            resumeUrl: profile.resume_url || null,
            resumeText: profile.resume_text || null,
            skills: profile.skills || [],
            experienceYears: profile.experience_years || null,
            education: profile.education || [],
            certifications: profile.certifications || [],
            languages: profile.languages || [],
            createdAt: profile.profile_created_at,
            updatedAt: profile.profile_updated_at
          }
        }
      });
    } catch (error) {
      Logger.error('Failed to get user profile', error);
      res.status(500).json({
        success: false,
        error: 'Profile fetch failed',
        message: error.message
      });
    }
  })
);

/**
 * Update user profile
 * PUT /api/users/profile
 */
router.put('/profile',
  authMiddleware.authenticate.bind(authMiddleware),
  asyncHandler(async (req, res) => {
    try {
      const {
        firstName,
        lastName,
        phone,
        profileImageUrl,
        resumeUrl,
        skills,
        experienceYears,
        education,
        certifications,
        languages,
        targetRoles
      } = req.body;

      const profileData = {
        firstName,
        lastName,
        phone,
        profileImageUrl,
        resumeUrl,
        skills,
        experienceYears,
        education,
        certifications,
        languages,
        targetRoles
      };

      const updatedProfile = await userService.updateUserProfile(req.user.id, profileData);

      Logger.info(`User profile updated: ${req.user.email}`);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: updatedProfile.id,
          email: updatedProfile.email,
          firstName: updatedProfile.first_name,
          lastName: updatedProfile.last_name,
          phone: updatedProfile.phone,
          profileImageUrl: updatedProfile.profile_image_url,
          resumeUrl: updatedProfile.resume_url,
          skills: updatedProfile.skills || [],
          experienceYears: updatedProfile.experience_years,
          education: updatedProfile.education || [],
          certifications: updatedProfile.certifications || [],
          languages: updatedProfile.languages || [],
          updatedAt: updatedProfile.updated_at
        }
      });
    } catch (error) {
      Logger.error('Failed to update user profile', error);
      res.status(500).json({
        success: false,
        error: 'Profile update failed',
        message: error.message
      });
    }
  })
);

/**
 * Get profile completion status
 * GET /api/users/profile/completion
 */
router.get('/profile/completion',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireActiveUser.bind(authMiddleware),
  asyncHandler(async (req, res) => {
    try {
      const profile = await userService.getUserProfile(req.user.id);
      
      if (!profile) {
        return res.json({
          success: true,
          data: {
            isComplete: false,
            percentage: 0,
            missingFields: ['profile', 'resume', 'skills', 'education']
          }
        });
      }

      // Calculate completion percentage
      const fields = {
        firstName: profile.first_name,
        lastName: profile.last_name,
        email: profile.email,
        phone: profile.phone,
        profileImage: profile.profile_image_url,
        resume: profile.resume_url,
        skills: profile.skills && profile.skills.length > 0,
        education: profile.education && profile.education.length > 0,
        targetRoles: profile.target_roles && profile.target_roles.length > 0
      };

      const totalFields = Object.keys(fields).length;
      const completedFields = Object.values(fields).filter(Boolean).length;
      const percentage = Math.round((completedFields / totalFields) * 100);

      const missingFields = [];
      if (!fields.firstName) missingFields.push('first name');
      if (!fields.lastName) missingFields.push('last name');
      if (!fields.phone) missingFields.push('phone number');
      if (!fields.profileImage) missingFields.push('profile image');
      if (!fields.resume) missingFields.push('resume');
      if (!fields.skills) missingFields.push('skills');
      if (!fields.education) missingFields.push('education');
      if (!fields.targetRoles) missingFields.push('target roles');

      const isComplete = percentage >= 80 && missingFields.length <= 2;

      res.json({
        success: true,
        data: {
          isComplete,
          percentage,
          missingFields
        }
      });
    } catch (error) {
      Logger.error('Failed to get profile completion status', error);
      res.status(500).json({
        success: false,
        error: 'Profile completion check failed',
        message: error.message
      });
    }
  })
);

/**
 * Upload profile image
 * POST /api/users/profile/image
 */
router.post('/profile/image',
  authMiddleware.authenticate.bind(authMiddleware),
  upload.single('image'),
  asyncHandler(async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
          message: 'Please select an image file to upload'
        });
      }

      // Create file record in files table
      // req.file.path is absolute (e.g., C:\...\uploads\users\...)
      // We need to store relative path from project root (e.g., /uploads/users/...)
      const absolutePath = req.file.path;
      const projectRoot = process.cwd();
      let relativePath = path.relative(projectRoot, absolutePath).replace(/\\/g, '/');
      // Ensure it starts with /
      if (!relativePath.startsWith('/')) {
        relativePath = '/' + relativePath;
      }
      
      const fileData = {
        fileName: req.file.originalname,
        filePath: relativePath,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        userId: req.user.id
      };
      
      // Upload file to files table (this creates the record)
      const uploadedFile = await userService.uploadFile(fileData);
      
      // Create URL for the uploaded file (use file ID reference or path)
      const imageUrl = fileData.filePath;
      
      // Update user profile with image URL
      const updatedUser = await userService.updateProfileImage(req.user.id, imageUrl);

      Logger.info(`Profile image uploaded: ${req.user.email}`);

      res.json({
        success: true,
        message: 'Profile image uploaded successfully',
        data: {
          imageUrl: imageUrl,
          fileId: uploadedFile.id,
          fileName: req.file.filename,
          fileSize: req.file.size,
          updatedAt: updatedUser.updated_at
        }
      });
    } catch (error) {
      Logger.error('Failed to upload profile image', error);
      res.status(500).json({
        success: false,
        error: 'Image upload failed',
        message: error.message
      });
    }
  })
);

/**
 * Upload resume
 * POST /api/users/profile/resume
 */
router.post('/profile/resume',
  authMiddleware.authenticate.bind(authMiddleware),
  upload.single('resume'),
  asyncHandler(async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
          message: 'Please select a resume file to upload'
        });
      }

      // Create URL for the uploaded file
      const resumeUrl = `/uploads/users/${req.user.id}/${req.file.filename}`;
      
      // For now, we'll store the file path. In a real implementation,
      // you might want to extract text from the PDF here
      const resumeText = null; // TODO: Implement PDF text extraction
      
      // Update user profile with resume URL
      const updatedProfile = await userService.updateResumeUrl(req.user.id, resumeUrl, resumeText);

      Logger.info(`Resume uploaded: ${req.user.email}`);

      res.json({
        success: true,
        message: 'Resume uploaded successfully',
        data: {
          resumeUrl: resumeUrl,
          fileName: req.file.filename,
          fileSize: req.file.size,
          updatedAt: updatedProfile.updated_at
        }
      });
    } catch (error) {
      Logger.error('Failed to upload resume', error);
      res.status(500).json({
        success: false,
        error: 'Resume upload failed',
        message: error.message
      });
    }
  })
);

/**
 * Get user files
 * GET /api/users/files
 * Returns empty array for new users (seamless - no errors)
 */
router.get('/files',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireActiveUser.bind(authMiddleware),
  asyncHandler(async (req, res) => {
    try {
      const { type, path: filePath } = req.query;
      
      // If path is provided, find file by path
      if (filePath) {
        const file = await userService.getFileByPath(filePath, req.user.id);
        if (!file) {
          return res.json({
            success: true,
            data: []
          });
        }
        
        return res.json({
          success: true,
          data: [{
            id: file.id,
            fileName: file.fileName,
            filePath: file.filePath,
            fileSize: file.fileSize,
            mimeType: file.mimeType,
            storageMethod: file.storageMethod,
            uploadDate: file.createdAt
          }]
        });
      }
      
      // Otherwise, get files by type or all files
      // For new users, this will return an empty array - perfectly normal
      const files = await userService.getUserFiles(req.user.id, type);

      res.json({
        success: true,
        data: files.map(file => ({
          id: file.id,
          fileName: file.fileName,
          filePath: file.filePath,
          fileType: file.fileType,
          fileSize: file.fileSize,
          storageMethod: file.storageMethod,
          mimeType: file.mimeType,
          uploadDate: file.uploadDate,
          checksum: file.checksum,
          isProcessed: file.isProcessed,
          processingStatus: file.processingStatus
        }))
      });
    } catch (error) {
      Logger.error('Failed to get user files', error);
      // Return empty array instead of error for new users
      res.json({
        success: true,
        data: []
      });
    }
  })
);

/**
 * Delete user account
 * DELETE /api/users/account
 */
router.delete('/account',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireActiveUser.bind(authMiddleware),
  asyncHandler(async (req, res) => {
    try {
      const success = await userService.deleteUserAccount(req.user.id);
      
      if (success) {
        Logger.info(`User account deleted: ${req.user.email}`);
        
        res.json({
          success: true,
          message: 'Account deleted successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Account deletion failed',
          message: 'Unable to delete account'
        });
      }
    } catch (error) {
      Logger.error('Failed to delete user account', error);
      res.status(500).json({
        success: false,
        error: 'Account deletion failed',
        message: error.message
      });
    }
  })
);

/**
 * GET /api/users/resume-data
 * Get user's resume data for analysis
 */
router.get('/resume-data',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireActiveUser.bind(authMiddleware),
  asyncHandler(async (req, res) => {
    try {
      const resumeData = await userService.getUserResumeData(req.user.id);
      
      if (!resumeData) {
        return res.status(404).json({
          success: false,
          error: 'No resume data found',
          message: 'Please upload a resume first'
        });
      }
      
      Logger.info(`Resume data retrieved for user: ${req.user.email}`);
      
      res.json({
        success: true,
        data: resumeData
      });
      
    } catch (error) {
      Logger.error('Failed to get resume data', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get resume data',
        message: error.message
      });
    }
  })
);

/**
 * POST /api/users/files/upload
 * Upload a file (resume, image, etc.)
 */
router.post('/files/upload',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireActiveUser.bind(authMiddleware),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file provided',
          message: 'Please select a file to upload'
        });
      }
      
      // Convert absolute path to relative path (consistent with profile image upload)
      const absolutePath = req.file.path;
      const projectRoot = process.cwd();
      let relativePath = path.relative(projectRoot, absolutePath).replace(/\\/g, '/');
      // Ensure it starts with /
      if (!relativePath.startsWith('/')) {
        relativePath = '/' + relativePath;
      }
      
      const fileData = {
        fileName: req.file.originalname,
        filePath: relativePath,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        userId: req.user.id
      };
      
      const uploadedFile = await userService.uploadFile(fileData);
      
      Logger.info(`File uploaded for user: ${req.user.email}`, {
        fileName: req.file.originalname,
        fileSize: req.file.size
      });
      
      res.json({
        success: true,
        fileId: uploadedFile.id,
        fileName: uploadedFile.file_name,
        fileSize: uploadedFile.file_size,
        message: 'File uploaded successfully'
      });
      
    } catch (error) {
      Logger.error('File upload failed', error);
      res.status(500).json({
        success: false,
        error: 'File upload failed',
        message: error.message
      });
    }
  })
);


/**
 * GET /api/users/files/:fileId
 * Get file information
 */
router.get('/files/:fileId',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireActiveUser.bind(authMiddleware),
  asyncHandler(async (req, res) => {
    try {
      const { fileId } = req.params;
      const fileInfo = await userService.getFileInfo(fileId, req.user.id);
      
      if (!fileInfo) {
        return res.status(404).json({
          success: false,
          error: 'File not found',
          message: 'File does not exist or you do not have access to it'
        });
      }
      
      res.json({
        success: true,
        data: fileInfo
      });
      
    } catch (error) {
      Logger.error('Failed to get file info', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get file info',
        message: error.message
      });
    }
  })
);

/**
 * DELETE /api/users/files/:fileId
 * Delete a file
 */
router.delete('/files/:fileId',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireActiveUser.bind(authMiddleware),
  asyncHandler(async (req, res) => {
    try {
      const { fileId } = req.params;
      const success = await userService.deleteFile(fileId, req.user.id);
      
      if (success) {
        Logger.info(`File deleted by user: ${req.user.email}`, { fileId });
        
        res.json({
          success: true,
          message: 'File deleted successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'File not found',
          message: 'File does not exist or you do not have access to it'
        });
      }
      
    } catch (error) {
      Logger.error('Failed to delete file', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete file',
        message: error.message
      });
    }
  })
);

module.exports = router;
