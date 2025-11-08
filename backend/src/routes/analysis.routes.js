const express = require('express');
const path = require('path');
const router = express.Router();

// Import services and middleware
const AnalysisService = require('../services/analysis.service');
const UserProfileService = require('../services/user.service');
const authMiddleware = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const Logger = require('../utils/logger.utils');

// Initialize services
const analysisService = new AnalysisService();
const userService = new UserProfileService();

/**
 * Helper function to resolve file path (similar to file.routes.js)
 */
function resolveFilePath(filePath) {
  if (process.platform === 'win32' && /^[A-Za-z]:[\\/]/.test(filePath)) {
    // Windows absolute path (e.g., C:\... or D:\...) - use directly
    return filePath;
  } else if (process.platform !== 'win32' && path.isAbsolute(filePath)) {
    // Unix absolute path - use directly
    return filePath;
  } else {
    // Relative path (including /uploads/... on Windows) - join with project root
    if (filePath.startsWith('/')) {
      // Remove leading / and join
      return path.join(process.cwd(), filePath.substring(1));
    } else {
      return path.join(process.cwd(), filePath);
    }
  }
}

/**
 * POST /api/analysis/resume
 * Analyze a resume against a job description
 */
router.post('/resume',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireActiveUser.bind(authMiddleware),
  asyncHandler(async (req, res) => {
    try {
      const { fileId, jobDescription } = req.body;
      const userId = req.user.id;

      // Validate input
      if (!fileId) {
        return res.status(400).json({
          success: false,
          error: 'Missing fileId',
          message: 'Please provide a file ID for the resume'
        });
      }

      if (!jobDescription || !jobDescription.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Missing job description',
          message: 'Please provide a job description'
        });
      }

      // Get file info from database
      const fileInfo = await userService.getFileInfo(fileId, userId);

      if (!fileInfo) {
        return res.status(404).json({
          success: false,
          error: 'File not found',
          message: 'Resume file does not exist or you do not have access to it'
        });
      }

      // Check if file is a PDF
      if (fileInfo.mimeType !== 'application/pdf' && !fileInfo.fileName.toLowerCase().endsWith('.pdf')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid file type',
          message: 'Only PDF files are supported for resume analysis'
        });
      }

      // Check if file is stored on filesystem
      if (fileInfo.storageMethod !== 'filesystem') {
        return res.status(501).json({
          success: false,
          error: 'Not supported',
          message: 'Analysis is only supported for filesystem-stored files'
        });
      }

      // Resolve file path
      const resolvedFilePath = resolveFilePath(fileInfo.filePath);

      Logger.info('Starting resume analysis', {
        userId: userId,
        fileId: fileId,
        filePath: resolvedFilePath
      });

      // Perform analysis
      const analysisResult = await analysisService.analyzeResume(
        resolvedFilePath,
        jobDescription.trim()
      );

      Logger.info('Resume analysis completed', {
        userId: userId,
        fileId: fileId,
        overallScore: analysisResult.overallScore
      });

      res.json({
        success: true,
        data: analysisResult
      });

    } catch (error) {
      Logger.error('Resume analysis failed', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      // Provide helpful error messages
      let errorMessage = error.message;
      if (error.message.includes('Python')) {
        errorMessage = 'Analysis service is not available. Please ensure Python and Ollama are installed and configured.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Analysis took too long. Please try again with a smaller file or simpler job description.';
      } else if (error.message.includes('not found')) {
        errorMessage = 'Resume file not found. Please upload the file again.';
      }

      res.status(500).json({
        success: false,
        error: 'Analysis failed',
        message: errorMessage
      });
    }
  })
);

module.exports = router;





