const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const Logger = require('../utils/logger.utils');
const transcriptionService = require('../services/transcription.service');
const hrQuestionService = require('../services/hr-question.service');
const hrFeedbackService = require('../services/hr-feedback.service');
const { query } = require('../config/database.config');

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      // Use a generic temp directory if user is not available yet
      // Auth middleware runs before multer, so req.user should be available
      const userId = req.user?.id || 'anonymous';
      const uploadDir = path.join(process.cwd(), 'temp', 'audio', userId);
      
      // Create directory synchronously (multer doesn't handle async well)
      const fsSync = require('fs');
      if (!fsSync.existsSync(uploadDir)) {
        fsSync.mkdirSync(uploadDir, { recursive: true });
      }
      
      cb(null, uploadDir);
    } catch (error) {
      Logger.error('Multer destination error', { error: error.message });
      // Fallback to a generic temp directory
      const fallbackDir = path.join(process.cwd(), 'temp', 'audio');
      const fsSync = require('fs');
      if (!fsSync.existsSync(fallbackDir)) {
        fsSync.mkdirSync(fallbackDir, { recursive: true });
      }
      cb(null, fallbackDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}.webm`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for audio files
  },
  fileFilter: (req, file, cb) => {
    // Accept all files - be very lenient for audio files
    // MediaRecorder can produce various audio formats and mimetypes
    // The transcription service will handle format validation
    Logger.info('File upload received', {
      mimetype: file.mimetype,
      originalname: file.originalname,
      fieldname: file.fieldname
    });
    cb(null, true); // Accept all files - let transcription service handle validation
  }
});

/**
 * POST /api/hr/start-session
 * Start a new HR interview session
 */
router.post('/start-session',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireActiveUser.bind(authMiddleware),
  asyncHandler(async (req, res) => {
    try {
      const { questionCount = 5, mode = 'fixed', useDistributed = true, sessionId } = req.body;
      const userId = req.user.id;

      // Generate or use provided session ID
      let finalSessionId = sessionId;
      if (!finalSessionId) {
        finalSessionId = uuidv4();
      }

      // Select questions - Always use fixed questions in specific order
      let questions;
      // Always use fixed questions (ignoring mode and useDistributed flags)
      questions = await hrQuestionService.selectFixedQuestions(questionCount);

      // Create session in database
      const sessionResult = await query(
        `INSERT INTO interview_sessions 
         (id, user_id, session_type, status, started_at, metadata)
         VALUES ($1, $2, $3, $4, NOW(), $5)
         RETURNING id, started_at`,
        [
          finalSessionId,
          userId,
          'hr',
          'in_progress',
          JSON.stringify({ questionCount, mode, useDistributed })
        ]
      );

      Logger.info('HR session started', {
        userId,
        sessionId: finalSessionId,
        questionCount: questions.length
      });

      res.json({
        success: true,
        sessionId: finalSessionId,
        questions: questions
      });
    } catch (error) {
      Logger.error('Failed to start HR session', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  })
);

/**
 * POST /api/hr/transcribe-audio
 * Upload audio file and transcribe it using local Whisper model
 */
router.post('/transcribe-audio',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireActiveUser.bind(authMiddleware),
  (req, res, next) => {
    // Handle multer errors
    upload.single('audio')(req, res, (err) => {
      if (err) {
        Logger.error('Multer upload error', {
          error: err.message,
          code: err.code,
          field: err.field
        });
        return res.status(400).json({
          success: false,
          error: `File upload failed: ${err.message}`
        });
      }
      next();
    });
  },
  asyncHandler(async (req, res) => {
    let uploadedFile = null;
    try {
      const { sessionId, questionId } = req.body;
      const userId = req.user.id;

      // Log request details for debugging
      Logger.info('Transcribe audio request received', {
        userId,
        sessionId,
        questionId,
        hasFile: !!req.file,
        fileMimetype: req.file?.mimetype,
        fileName: req.file?.originalname,
        fileSize: req.file?.size,
        filePath: req.file?.path
      });

      if (!req.file) {
        Logger.error('No file uploaded', {
          userId,
          body: req.body,
          files: req.files
        });
        return res.status(400).json({
          success: false,
          error: 'No audio file uploaded. Please ensure the file field is named "audio".'
        });
      }

      uploadedFile = req.file;

      // sessionId and questionId are optional - allow temporary sessions
      const effectiveSessionId = sessionId || `temp_${Date.now()}`;
      const effectiveQuestionId = questionId || `temp_q_${Date.now()}`;

      // Verify file exists on disk and get file stats
      let fileStats;
      try {
        await fs.access(req.file.path);
        fileStats = await fs.stat(req.file.path);
        
        // Verify file is not empty
        if (fileStats.size === 0) {
          Logger.error('Uploaded file is empty', {
            filePath: req.file.path,
            fileSize: fileStats.size
          });
          return res.status(400).json({
            success: false,
            error: 'Uploaded file is empty. Please try recording again.'
          });
        }
        
        // Verify file size matches what multer reported
        if (fileStats.size !== req.file.size) {
          Logger.warn('File size mismatch', {
            filePath: req.file.path,
            reportedSize: req.file.size,
            actualSize: fileStats.size
          });
        }
      } catch (accessError) {
        Logger.error('Uploaded file not found on disk', {
          filePath: req.file.path,
          error: accessError.message
        });
        return res.status(500).json({
          success: false,
          error: 'Uploaded file not found. Please try again.'
        });
      }

      // Wait a bit longer to ensure file is fully written to disk
      // Also verify file is readable
      let retries = 5;
      let fileReadable = false;
      while (retries > 0 && !fileReadable) {
        try {
          await fs.access(req.file.path, fs.constants.R_OK);
          const currentStats = await fs.stat(req.file.path);
          if (currentStats.size > 0 && currentStats.size === fileStats.size) {
            fileReadable = true;
          } else {
            Logger.warn('File size changed, waiting...', {
              originalSize: fileStats.size,
              currentSize: currentStats.size
            });
            await new Promise(resolve => setTimeout(resolve, 200));
            retries--;
          }
        } catch (accessError) {
          Logger.warn('File not readable yet, waiting...', { retries });
          await new Promise(resolve => setTimeout(resolve, 200));
          retries--;
        }
      }

      if (!fileReadable) {
        Logger.error('File not readable after retries', {
          filePath: req.file.path,
          fileSize: fileStats.size
        });
        return res.status(500).json({
          success: false,
          error: 'Uploaded file is not accessible. Please try recording again.',
          message: 'Uploaded file is not accessible. Please try recording again.',
          detail: 'Uploaded file is not accessible. Please try recording again.'
        });
      }

      Logger.info('Transcribing audio', {
        userId,
        sessionId: effectiveSessionId,
        questionId: effectiveQuestionId,
        filePath: req.file.path,
        fileSize: req.file.size,
        actualFileSize: fileStats.size,
        mimetype: req.file.mimetype
      });

      // Transcribe audio using local Whisper model
      let transcription;
      try {
        transcription = await transcriptionService.transcribeAudio(
          req.file.path,
          'en' // Default to English, can be made configurable
        );
        
        // Validate transcription result
        if (!transcription || !transcription.text) {
          throw new Error('Transcription returned empty result. Please check if faster-whisper is installed: pip install faster-whisper');
        }
      } catch (transcriptionError) {
        Logger.error('Transcription service error', {
          error: transcriptionError.message,
          stack: transcriptionError.stack,
          filePath: req.file.path,
          errorCode: transcriptionError.code,
          errorStdout: transcriptionError.stdout?.substring(0, 500),
          errorStderr: transcriptionError.stderr?.substring(0, 500)
        });
        // Pass through the actual error message from transcription service
        // Don't wrap it - let the actual error message come through
        throw transcriptionError;
      }

      // Clean up temporary audio file
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        Logger.warn('Failed to delete temp audio file', {
          path: req.file.path,
          error: unlinkError.message
        });
      }

      // Just return transcription - no database storage (like dashboard test)
      res.json({
        success: true,
        transcription: {
          text: transcription.text || '',
          language: transcription.language || 'en',
          segments: transcription.segments || [],
          words: transcription.words || [],
          duration: transcription.duration || 0
        }
      });
    } catch (error) {
      Logger.error('Failed to transcribe audio', { 
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
        sessionId: req.body?.sessionId,
        questionId: req.body?.questionId,
        filePath: uploadedFile?.path || req.file?.path,
        fileSize: uploadedFile?.size || req.file?.size,
        mimetype: uploadedFile?.mimetype || req.file?.mimetype
      });
      
      // Clean up uploaded file on error
      const fileToCleanup = uploadedFile || req.file;
      if (fileToCleanup) {
        try {
          await fs.unlink(fileToCleanup.path);
        } catch (unlinkError) {
          Logger.warn('Failed to cleanup audio file', { error: unlinkError.message });
        }
      }

      // Return detailed error message
      // Frontend expects 'message' or 'detail' field
      // Use the actual error message - don't wrap it
      const errorMessage = error.message || 'Failed to transcribe audio';
      
      // If the error already contains installation instructions, use it as-is
      const finalErrorMessage = errorMessage.includes('faster-whisper') || 
                                errorMessage.includes('pip install') ||
                                errorMessage.includes('Python') ||
                                errorMessage.includes('not installed')
        ? errorMessage
        : `${errorMessage}. Make sure faster-whisper is installed: pip install faster-whisper`;
      
      res.status(500).json({
        success: false,
        error: finalErrorMessage,
        message: finalErrorMessage, // Also include 'message' for frontend compatibility
        detail: finalErrorMessage,  // Also include 'detail' for frontend compatibility
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  })
);

/**
 * POST /api/hr/submit-answer
 * Submit a text answer for a question (alternative to audio)
 */
router.post('/submit-answer',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireActiveUser.bind(authMiddleware),
  asyncHandler(async (req, res) => {
    try {
      const { sessionId, questionId, transcription } = req.body;
      const userId = req.user.id;

      if (!sessionId || !questionId || !transcription) {
        return res.status(400).json({
          success: false,
          error: 'sessionId, questionId, and transcription are required'
        });
      }

      // Store transcription in session_components
      await query(
        `INSERT INTO session_components 
         (session_id, component_type, component_data, feedback)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (session_id, component_type) 
         DO UPDATE SET 
           component_data = $3,
           feedback = $4`,
        [
          sessionId,
          `hr_question_${questionId}`,
          JSON.stringify({
            questionId,
            transcription: transcription,
            source: 'text'
          }),
          JSON.stringify({
            transcription: transcription
          })
        ]
      );

      Logger.info('HR answer submitted', {
        userId,
        sessionId,
        questionId
      });

      res.json({
        success: true
      });
    } catch (error) {
      Logger.error('Failed to submit HR answer', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  })
);

/**
 * POST /api/hr/complete-session
 * Complete HR session and generate final analysis
 */
router.post('/complete-session',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireActiveUser.bind(authMiddleware),
  asyncHandler(async (req, res) => {
    try {
      const { sessionId, totalDuration, violationStats, qaPairs, gestureData } = req.body;
      const userId = req.user.id;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'sessionId is required'
        });
      }

      Logger.info('Completing HR session', {
        userId,
        sessionId,
        questionCount: qaPairs?.length || 0,
        hasGestureData: !!gestureData,
        gestureDataKeys: gestureData ? Object.keys(gestureData) : []
      });

      // Generate comprehensive HR feedback
      const feedback = await hrFeedbackService.generateHRFeedback(
        sessionId,
        qaPairs || [],
        violationStats || {},
        gestureData || null
      );
      
      Logger.info('HR feedback generated', {
        hasFeedback: !!feedback,
        feedbackKeys: feedback ? Object.keys(feedback) : [],
        hasGestureAnalysis: !!feedback?.gestureAnalysis,
        gestureAnalysisKeys: feedback?.gestureAnalysis ? Object.keys(feedback.gestureAnalysis) : []
      });

      // Update session status
      await query(
        `UPDATE interview_sessions 
         SET status = $1, 
             completed_at = NOW(),
             total_duration = $2,
             overall_score = $3,
             feedback = $4,
             metadata = $5
         WHERE id = $6 AND user_id = $7`,
        [
          'completed',
          totalDuration || 0,
          feedback.overallScore || 0,
          JSON.stringify(feedback),
          JSON.stringify({
            violationStats: violationStats || {},
            questionCount: qaPairs?.length || 0,
            gestureAnalysis: gestureData || null
          }),
          sessionId,
          userId
        ]
      );

      Logger.info('HR session completed', {
        userId,
        sessionId,
        overallScore: feedback.overallScore
      });

      res.json({
        success: true,
        feedback: feedback
      });
    } catch (error) {
      Logger.error('Failed to complete HR session', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  })
);

/**
 * GET /api/hr/session/:sessionId
 * Get HR session details
 */
router.get('/session/:sessionId',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireActiveUser.bind(authMiddleware),
  asyncHandler(async (req, res) => {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      // Get session
      const sessionResult = await query(
        `SELECT * FROM interview_sessions 
         WHERE id = $1 AND user_id = $2 AND session_type = $3`,
        [sessionId, userId, 'hr']
      );

      if (sessionResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      const session = sessionResult.rows[0];

      // Get all components for this session
      const componentsResult = await query(
        `SELECT * FROM session_components 
         WHERE session_id = $1 
         ORDER BY id ASC`,
        [sessionId]
      );

      let feedback = session.feedback;
      if (typeof feedback === 'string') {
        try {
          feedback = JSON.parse(feedback);
          Logger.info('Parsed feedback from session', {
            hasGestureAnalysis: !!feedback.gestureAnalysis,
            feedbackKeys: Object.keys(feedback),
            gestureAnalysisType: feedback.gestureAnalysis ? typeof feedback.gestureAnalysis : 'none',
            gestureAnalysisKeys: feedback.gestureAnalysis ? Object.keys(feedback.gestureAnalysis) : []
          });
        } catch (e) {
          Logger.error('Failed to parse feedback JSON', { error: e.message });
          feedback = {};
        }
      } else if (feedback) {
        Logger.info('Feedback already parsed', {
          hasGestureAnalysis: !!feedback.gestureAnalysis,
          feedbackKeys: Object.keys(feedback)
        });
      }

      // Extract metadata for gesture analysis
      let metadata = {};
      if (session.metadata) {
        try {
          metadata = typeof session.metadata === 'string' ? JSON.parse(session.metadata) : session.metadata;
          Logger.info('Parsed metadata from session', {
            hasGestureAnalysis: !!metadata.gestureAnalysis,
            metadataKeys: Object.keys(metadata),
            gestureAnalysisType: metadata.gestureAnalysis ? typeof metadata.gestureAnalysis : 'none'
          });
        } catch (e) {
          Logger.error('Failed to parse metadata JSON', { error: e.message });
          metadata = {};
        }
      }

      // Include gesture analysis in feedback if available
      // Priority: processed feedback.gestureAnalysis > raw metadata.gestureAnalysis
      if (metadata.gestureAnalysis && feedback) {
        if (!feedback.gestureAnalysis) {
          // If feedback doesn't have processed gestureAnalysis, use raw data from metadata
          feedback.gestureAnalysis = metadata.gestureAnalysis;
        }
      }
      
      // Ensure gestureAnalysis is accessible in both places
      if (feedback?.gestureAnalysis && !metadata.gestureAnalysis) {
        metadata.gestureAnalysis = feedback.gestureAnalysis;
      }
      
      Logger.info('Gesture analysis in session data', {
        sessionId: req.params.sessionId,
        hasFeedbackGesture: !!feedback?.gestureAnalysis,
        hasMetadataGesture: !!metadata?.gestureAnalysis,
        gestureKeys: feedback?.gestureAnalysis ? Object.keys(feedback.gestureAnalysis) : []
      });

      const sessionData = {
        id: session.id,
        type: 'HR Interview',
        sessionType: 'hr',
        startedAt: session.started_at,
        completedAt: session.completed_at,
        duration: session.total_duration || 0,
        score: session.overall_score || 0,
        status: session.status,
        feedback: feedback,
        metadata: metadata,
        components: componentsResult.rows.map(row => {
          let componentData = row.component_data;
          let componentFeedback = row.feedback;
          
          if (typeof componentData === 'string') {
            try {
              componentData = JSON.parse(componentData);
            } catch (e) {
              componentData = {};
            }
          }
          
          if (typeof componentFeedback === 'string') {
            try {
              componentFeedback = JSON.parse(componentFeedback);
            } catch (e) {
              componentFeedback = {};
            }
          }

          return {
            id: row.id,
            type: row.component_type,
            data: componentData,
            feedback: componentFeedback,
            score: row.score,
            createdAt: row.id // Use id as timestamp reference
          };
        }),
        metadata: session.metadata ? (typeof session.metadata === 'string' ? JSON.parse(session.metadata) : session.metadata) : {}
      };

      // Final check: ensure gestureAnalysis is in the response
      if (feedback.gestureAnalysis && !sessionData.feedback.gestureAnalysis) {
        sessionData.feedback.gestureAnalysis = feedback.gestureAnalysis;
      }
      if (metadata.gestureAnalysis && !sessionData.metadata.gestureAnalysis) {
        sessionData.metadata.gestureAnalysis = metadata.gestureAnalysis;
      }

      Logger.info('Final session data before sending', {
        sessionId: req.params.sessionId,
        feedbackHasGestureAnalysis: !!sessionData.feedback?.gestureAnalysis,
        metadataHasGestureAnalysis: !!sessionData.metadata?.gestureAnalysis,
        feedbackGestureKeys: sessionData.feedback?.gestureAnalysis ? Object.keys(sessionData.feedback.gestureAnalysis) : []
      });

      res.json({
        success: true,
        data: sessionData
      });
    } catch (error) {
      Logger.error('Failed to get HR session', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  })
);

module.exports = router;


