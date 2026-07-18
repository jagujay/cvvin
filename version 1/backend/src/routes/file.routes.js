const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();

// Import services and middleware
const UserProfileService = require('../services/user.service');
const AnalysisService = require('../services/analysis.service');
const authMiddleware = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const Logger = require('../utils/logger.utils');

// Initialize services
const userService = new UserProfileService();
const analysisService = new AnalysisService();

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
        // Handle both absolute paths (old files) and relative paths (new files)
        let filePath;
        // On Windows: absolute paths start with C:\, D:\, etc.
        // On Unix: absolute paths start with /
        // We store relative paths as /uploads/... which path.isAbsolute() thinks is absolute on Windows
        // So we need special handling: if it's a Windows absolute path (has drive letter), use it; otherwise treat as relative
        if (process.platform === 'win32' && /^[A-Za-z]:[\\/]/.test(fileInfo.filePath)) {
          // Windows absolute path (e.g., C:\... or D:\...) - use directly
          filePath = fileInfo.filePath;
        } else if (process.platform !== 'win32' && path.isAbsolute(fileInfo.filePath)) {
          // Unix absolute path - use directly (shouldn't happen in our case)
          filePath = fileInfo.filePath;
        } else {
          // Relative path (including /uploads/... on Windows) - join with project root
          if (fileInfo.filePath.startsWith('/')) {
            // Remove leading / and join
            filePath = path.join(process.cwd(), fileInfo.filePath.substring(1));
          } else {
            filePath = path.join(process.cwd(), fileInfo.filePath);
          }
        }
        
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
          Logger.error(`File not found on filesystem`, {
            filePath: filePath,
            storedPath: fileInfo.filePath,
            isAbsolute: path.isAbsolute(fileInfo.filePath),
            cwd: process.cwd(),
            error: error.message
          });
          return res.status(404).json({
            success: false,
            error: 'File not found',
            message: `File exists in database but not on filesystem. Path: ${filePath}`,
            debug: {
              storedPath: fileInfo.filePath,
              resolvedPath: filePath,
              isAbsolute: path.isAbsolute(fileInfo.filePath)
            }
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
        // Handle both absolute paths (old files) and relative paths (new files)
        let filePath;
        // On Windows: absolute paths start with C:\, D:\, etc.
        // On Unix: absolute paths start with /
        // We store relative paths as /uploads/... which path.isAbsolute() thinks is absolute on Windows
        // So we need special handling: if it's a Windows absolute path (has drive letter), use it; otherwise treat as relative
        if (process.platform === 'win32' && /^[A-Za-z]:[\\/]/.test(fileInfo.filePath)) {
          // Windows absolute path (e.g., C:\... or D:\...) - use directly
          filePath = fileInfo.filePath;
        } else if (process.platform !== 'win32' && path.isAbsolute(fileInfo.filePath)) {
          // Unix absolute path - use directly (shouldn't happen in our case)
          filePath = fileInfo.filePath;
        } else {
          // Relative path (including /uploads/... on Windows) - join with project root
          if (fileInfo.filePath.startsWith('/')) {
            // Remove leading / and join
            filePath = path.join(process.cwd(), fileInfo.filePath.substring(1));
          } else {
            filePath = path.join(process.cwd(), fileInfo.filePath);
          }
        }
        
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
          Logger.error(`File not found on filesystem`, {
            filePath: filePath,
            storedPath: fileInfo.filePath,
            isAbsolute: path.isAbsolute(fileInfo.filePath),
            cwd: process.cwd(),
            error: error.message
          });
          return res.status(404).json({
            success: false,
            error: 'File not found',
            message: `File exists in database but not on filesystem. Path: ${filePath}`,
            debug: {
              storedPath: fileInfo.filePath,
              resolvedPath: filePath,
              isAbsolute: path.isAbsolute(fileInfo.filePath)
            }
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

/**
 * GET /api/files/serve-by-path
 * Serve a file by its path (for authenticated users, only their own files)
 * Query param: path (e.g., /uploads/users/{userId}/...)
 */
router.get('/serve-by-path',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireActiveUser.bind(authMiddleware),
  asyncHandler(async (req, res) => {
    try {
      const { path: filePath } = req.query;
      const userId = req.user.id;
      
      if (!filePath) {
        return res.status(400).json({
          success: false,
          error: 'Path required',
          message: 'Please provide a file path in the query parameter'
        });
      }

      // Get file info by path (only for current user)
      const fileInfo = await userService.getFileByPath(filePath, userId);
      
      if (!fileInfo) {
        return res.status(404).json({
          success: false,
          error: 'File not found',
          message: 'File does not exist or you do not have access to it'
        });
      }
      
      // Resolve file path (same logic as in /:fileId/view)
      let resolvedPath;
      if (process.platform === 'win32' && /^[A-Za-z]:[\\/]/.test(fileInfo.filePath)) {
        resolvedPath = fileInfo.filePath;
      } else if (process.platform !== 'win32' && path.isAbsolute(fileInfo.filePath)) {
        resolvedPath = fileInfo.filePath;
      } else {
        if (fileInfo.filePath.startsWith('/')) {
          resolvedPath = path.join(process.cwd(), fileInfo.filePath.substring(1));
        } else {
          resolvedPath = path.join(process.cwd(), fileInfo.filePath);
        }
      }
      
      try {
        await fs.access(resolvedPath);
        
        // Set appropriate headers for viewing (inline for images)
        res.setHeader('Content-Type', fileInfo.mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${fileInfo.fileName}"`);
        res.setHeader('Content-Length', fileInfo.fileSize);
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache
        
        // Stream the file
        const fileStream = require('fs').createReadStream(resolvedPath);
        fileStream.pipe(res);
        
        Logger.info(`File served by path: ${fileInfo.fileName} by user: ${req.user.email}`);
        
      } catch (error) {
        Logger.error(`File not found on filesystem`, {
          resolvedPath: resolvedPath,
          storedPath: fileInfo.filePath,
          error: error.message
        });
        return res.status(404).json({
          success: false,
          error: 'File not found',
          message: `File exists in database but not on filesystem. Path: ${resolvedPath}`
        });
      }
      
    } catch (error) {
      Logger.error('File serve by path failed', error);
      res.status(500).json({
        success: false,
        error: 'Serve failed',
        message: error.message
      });
    }
  })
);

/**
 * POST /api/files/extract-text
 * Extract text from a PDF file
 */
router.post('/extract-text',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireActiveUser.bind(authMiddleware),
  asyncHandler(async (req, res) => {
    try {
      const { fileId } = req.body;
      const userId = req.user.id;

      if (!fileId) {
        return res.status(400).json({
          success: false,
          error: 'File ID required',
          message: 'Please provide a fileId'
        });
      }

      // Get file info from database
      const fileInfo = await userService.getFileInfo(fileId, userId);

      if (!fileInfo) {
        return res.status(404).json({
          success: false,
          error: 'File not found',
          message: 'File does not exist or you do not have access to it'
        });
      }

      // Check if file is a PDF
      if (!fileInfo.fileName.toLowerCase().endsWith('.pdf')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid file type',
          message: 'Only PDF files are supported for text extraction'
        });
      }

      // Get file path
      let filePath;
      if (process.platform === 'win32' && /^[A-Za-z]:[\\/]/.test(fileInfo.filePath)) {
        filePath = fileInfo.filePath;
      } else if (process.platform !== 'win32' && path.isAbsolute(fileInfo.filePath)) {
        filePath = fileInfo.filePath;
      } else {
        // Relative path - resolve from project root
        filePath = path.join(process.cwd(), fileInfo.filePath.replace(/^\//, ''));
      }

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (error) {
        return res.status(404).json({
          success: false,
          error: 'File not found on disk',
          message: 'The file does not exist at the expected location'
        });
      }

      // Extract text from PDF
      Logger.info('Extracting text from PDF', { fileId, filePath });
      const extractedText = await analysisService.extractResumeText(filePath);

      if (!extractedText || !extractedText.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Text extraction failed',
          message: 'Could not extract text from the PDF file. The file might be empty or corrupted.'
        });
      }

      res.json({
        success: true,
        text: extractedText
      });

    } catch (error) {
      Logger.error('Failed to extract text from file', {
        error: error.message,
        userId: req.user?.id,
        fileId: req.body?.fileId
      });

      res.status(500).json({
        success: false,
        error: 'Extraction failed',
        message: error.message || 'Failed to extract text from file'
      });
    }
  })
);

module.exports = router;
