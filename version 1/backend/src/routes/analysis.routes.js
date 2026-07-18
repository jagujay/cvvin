const express = require('express');
const path = require('path');
const router = express.Router();

// Import services and middleware
const AnalysisService = require('../services/analysis.service');
const UserProfileService = require('../services/user.service');
const authMiddleware = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const Logger = require('../utils/logger.utils');
const { query } = require('../config/database.config');

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
 * Check if file exists and log details for debugging
 */
async function checkFileExists(filePath) {
  const fs = require('fs').promises;
  try {
    await fs.access(filePath);
    const stats = await fs.stat(filePath);
    return { exists: true, size: stats.size };
  } catch (error) {
    return { exists: false, error: error.message };
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

      // Check if file exists before proceeding
      const fileCheck = await checkFileExists(resolvedFilePath);
      if (!fileCheck.exists) {
        Logger.error('Resume file not found', {
          userId: userId,
          fileId: fileId,
          originalPath: fileInfo.filePath,
          resolvedPath: resolvedFilePath,
          error: fileCheck.error
        });
        return res.status(404).json({
          success: false,
          error: 'Resume file not found',
          message: `Resume file not found at: ${resolvedFilePath}. Please upload the file again.`
        });
      }

      Logger.info('Starting resume analysis', {
        userId: userId,
        fileId: fileId,
        originalPath: fileInfo.filePath,
        resolvedPath: resolvedFilePath,
        fileSize: fileCheck.size
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

      // Extract resume text for storage (first 1000 chars)
      let resumeText = '';
      try {
        const fs = require('fs').promises;
        const pdfText = await analysisService.extractResumeText(resolvedFilePath);
        resumeText = pdfText ? pdfText.substring(0, 1000) : '';
      } catch (error) {
        Logger.warn('Could not extract resume text for storage', { error: error.message });
      }

      // Store analysis result in PostgreSQL
      try {
        const insertQuery = `
          INSERT INTO resume_analyses (
            user_id,
            file_id,
            job_description,
            analysis_result,
            overall_score,
            resume_text,
            model_version
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, analysis_date
        `;

        const result = await query(insertQuery, [
          userId,
          fileId,
          jobDescription.trim(),
          JSON.stringify(analysisResult),
          analysisResult.overallScore || 0,
          resumeText,
          'resume-analyzer-enhanced-v1'
        ]);

        Logger.info('Resume analysis stored in database', {
          analysisId: result.rows[0].id,
          userId: userId,
          fileId: fileId
        });
      } catch (dbError) {
        Logger.error('Failed to store analysis in database', {
          error: dbError.message,
          userId: userId,
          fileId: fileId
        });
        // Continue even if database storage fails - return the analysis result
      }

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

/**
 * GET /api/analysis/resume/:analysisId
 * Get a specific resume analysis by ID
 */
router.get('/resume/:analysisId',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireActiveUser.bind(authMiddleware),
  asyncHandler(async (req, res) => {
    try {
      const { analysisId } = req.params;
      const userId = req.user.id;

      // Get analysis from database
      const result = await query(
        `SELECT 
          id,
          user_id,
          file_id,
          job_description,
          analysis_result,
          overall_score,
          resume_text,
          analysis_date,
          model_version
        FROM resume_analyses
        WHERE id = $1 AND user_id = $2`,
        [analysisId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Analysis not found',
          message: 'Resume analysis does not exist or you do not have access to it'
        });
      }

      const analysis = result.rows[0];

      // Parse analysis_result if it's a string
      let analysisResult = analysis.analysis_result;
      if (typeof analysisResult === 'string') {
        try {
          analysisResult = JSON.parse(analysisResult);
        } catch (e) {
          analysisResult = {};
        }
      }

      // Transform to frontend format
      const sessionReport = {
        sessionId: analysis.id,
        date: analysis.analysis_date,
        duration: 0, // Resume analysis doesn't have duration
        overallScore: analysis.overall_score || 0,
        status: 'completed',
        type: 'Resume Analysis',
        isResumeAnalysis: true,
        resume: {
          analysisResult: analysisResult,
          jobDescription: analysis.job_description,
          fileId: analysis.file_id,
          modelVersion: analysis.model_version,
          resumeText: analysis.resume_text
        }
      };

      res.json({
        success: true,
        data: sessionReport
      });
    } catch (error) {
      Logger.error('Failed to get resume analysis', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  })
);

module.exports = router;
