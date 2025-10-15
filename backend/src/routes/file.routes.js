const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();

// Import services and middleware
const UserProfileService = require('../services/user.service');
const authMiddleware = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const Logger = require('../utils/logger.utils');

// Initialize services
const userService = new UserProfileService();

/**
 * GET /api/files/:fileId/download
 * Download a file by ID with authentication
 */
router.get('/:fileId/download',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireActiveUser.bind(authMiddleware),
  asyncHandler(async (req, res) => {
    try {
      const { fileId } = req.params;
      const userId = req.user.id;
      
      // Get file info from database
      const fileInfo = await userService.getFileInfo(fileId, userId);
      
      if (!fileInfo) {
        return res.status(404).json({
          success: false,
          error: 'File not found',
          message: 'File does not exist or you do not have access to it'
        });
      }
      
      // Check if file exists on filesystem
      if (fileInfo.storageMethod === 'filesystem') {
        const filePath = path.join(process.cwd(), fileInfo.filePath);
        
        try {
          await fs.access(filePath);
          
          // Set appropriate headers
          res.setHeader('Content-Type', fileInfo.mimeType);
          res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.fileName}"`);
          res.setHeader('Content-Length', fileInfo.fileSize);
          
          // Stream the file
          const fileStream = require('fs').createReadStream(filePath);
          fileStream.pipe(res);
          
          Logger.info(`File downloaded: ${fileInfo.fileName} by user: ${req.user.email}`);
          
        } catch (error) {
          Logger.error(`File not found on filesystem: ${filePath}`, error);
          return res.status(404).json({
            success: false,
            error: 'File not found',
            message: 'File exists in database but not on filesystem'
          });
        }
      } else {
        // Handle database-stored files (BYTEA)
        return res.status(501).json({
          success: false,
          error: 'Not implemented',
          message: 'Database file serving not yet implemented'
        });
      }
      
    } catch (error) {
      Logger.error('File download failed', error);
      res.status(500).json({
        success: false,
        error: 'Download failed',
        message: error.message
      });
    }
  })
);

/**
 * GET /api/files/:fileId/view
 * View a file in browser (for images, PDFs)
 */
router.get('/:fileId/view',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireActiveUser.bind(authMiddleware),
  asyncHandler(async (req, res) => {
    try {
      const { fileId } = req.params;
      const userId = req.user.id;
      
      // Get file info from database
      const fileInfo = await userService.getFileInfo(fileId, userId);
      
      if (!fileInfo) {
        return res.status(404).json({
          success: false,
          error: 'File not found',
          message: 'File does not exist or you do not have access to it'
        });
      }
      
      // Check if file exists on filesystem
      if (fileInfo.storageMethod === 'filesystem') {
        const filePath = path.join(process.cwd(), fileInfo.filePath);
        
        try {
          await fs.access(filePath);
          
          // Set appropriate headers for viewing
          res.setHeader('Content-Type', fileInfo.mimeType);
          res.setHeader('Content-Disposition', `inline; filename="${fileInfo.fileName}"`);
          res.setHeader('Content-Length', fileInfo.fileSize);
          
          // Stream the file
          const fileStream = require('fs').createReadStream(filePath);
          fileStream.pipe(res);
          
          Logger.info(`File viewed: ${fileInfo.fileName} by user: ${req.user.email}`);
          
        } catch (error) {
          Logger.error(`File not found on filesystem: ${filePath}`, error);
          return res.status(404).json({
            success: false,
            error: 'File not found',
            message: 'File exists in database but not on filesystem'
          });
        }
      } else {
        // Handle database-stored files (BYTEA)
        return res.status(501).json({
          success: false,
          error: 'Not implemented',
          message: 'Database file serving not yet implemented'
        });
      }
      
    } catch (error) {
      Logger.error('File view failed', error);
      res.status(500).json({
        success: false,
        error: 'View failed',
        message: error.message
      });
    }
  })
);

/**
 * GET /api/files/:fileId/url
 * Get a secure URL for file access
 */
router.get('/:fileId/url',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireActiveUser.bind(authMiddleware),
  asyncHandler(async (req, res) => {
    try {
      const { fileId } = req.params;
      const userId = req.user.id;
      
      // Get file info from database
      const fileInfo = await userService.getFileInfo(fileId, userId);
      
      if (!fileInfo) {
        return res.status(404).json({
          success: false,
          error: 'File not found',
          message: 'File does not exist or you do not have access to it'
        });
      }
      
      // Generate secure URLs
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const downloadUrl = `${baseUrl}/api/files/${fileId}/download`;
      const viewUrl = `${baseUrl}/api/files/${fileId}/view`;
      
      res.json({
        success: true,
        data: {
          fileId: fileInfo.id,
          fileName: fileInfo.fileName,
          fileSize: fileInfo.fileSize,
          mimeType: fileInfo.mimeType,
          downloadUrl: downloadUrl,
          viewUrl: viewUrl,
          createdAt: fileInfo.createdAt
        }
      });
      
    } catch (error) {
      Logger.error('Failed to get file URL', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get file URL',
        message: error.message
      });
    }
  })
);

module.exports = router;
