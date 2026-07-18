const express = require('express');
const router = express.Router();

// Import services and middleware
const TechnicalFeedbackService = require('../services/technical-feedback.service');
const authMiddleware = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const Logger = require('../utils/logger.utils');
const { query } = require('../config/database.config');

// Initialize services
const technicalFeedbackService = new TechnicalFeedbackService();

/**
 * POST /api/technical/submit-mcq
 * Submit MCQ answers and generate analysis
 */
router.post('/submit-mcq',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireActiveUser.bind(authMiddleware),
  asyncHandler(async (req, res) => {
    try {
      const { questions, answers, timeTaken, sessionId, totalTime } = req.body;
      const userId = req.user.id;

      // Validate input
      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing questions',
          message: 'Please provide questions array'
        });
      }

      if (!answers || typeof answers !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Missing answers',
          message: 'Please provide answers object'
        });
      }

      Logger.info('Starting MCQ analysis', {
        userId: userId,
        questionCount: questions.length,
        sessionId: sessionId
      });

      // Perform MCQ analysis
      const mcqAnalysis = await technicalFeedbackService.analyzeMCQ(
        questions,
        answers,
        timeTaken || {}
      );

      Logger.info('MCQ analysis completed', {
        userId: userId,
        overallScore: mcqAnalysis.overallScore
      });

      // Create or get session
      let actualSessionId = sessionId;
      try {
        // Validate UUID format - if sessionId is provided but not a valid UUID, ignore it
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isValidUUID = sessionId && uuidRegex.test(sessionId);

        if (sessionId && isValidUUID) {
          // Check if session exists
          const sessionCheck = await query(
            'SELECT id FROM interview_sessions WHERE id = $1 AND user_id = $2',
            [sessionId, userId]
          );

          if (sessionCheck.rows.length === 0) {
            // Session doesn't exist, create it with the provided UUID
            const newSession = await query(
              `INSERT INTO interview_sessions (
                id, user_id, session_type, status, started_at
              ) VALUES ($1, $2, $3, $4, $5)
              RETURNING id`,
              [
                sessionId,
                userId,
                'technical',
                'active',
                new Date()
              ]
            );
            actualSessionId = newSession.rows[0].id;
            Logger.info('Created new technical session', {
              sessionId: actualSessionId,
              userId: userId
            });
          }
        } else {
          // No valid sessionId provided, create new session (backend generates UUID)
          const newSession = await query(
            `INSERT INTO interview_sessions (
              user_id, session_type, status, started_at
            ) VALUES ($1, $2, $3, $4)
            RETURNING id`,
            [
              userId,
              'technical',
              'active',
              new Date()
            ]
          );
          actualSessionId = newSession.rows[0].id;
          Logger.info('Created new technical session', {
            sessionId: actualSessionId,
            userId: userId
          });
        }

        // Store MCQ component - delete existing if any, then insert
        await query(
          `DELETE FROM session_components 
           WHERE session_id = $1 AND component_type = $2`,
          [actualSessionId, 'mcq']
        );
        
        await query(
          `INSERT INTO session_components (
            session_id, component_type, component_data, score, completed_at, feedback
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            actualSessionId,
            'mcq',
            JSON.stringify({
              questions: questions,
              answers: answers,
              timeTaken: timeTaken || {},
              totalTime: totalTime
            }),
            mcqAnalysis.overallScore,
            new Date(),
            JSON.stringify(mcqAnalysis)
          ]
        );

        Logger.info('MCQ analysis stored in database', {
          sessionId: actualSessionId,
          userId: userId
        });
      } catch (dbError) {
        Logger.error('Failed to store MCQ analysis in database', {
          error: dbError.message,
          userId: userId,
          sessionId: actualSessionId
        });
        // Continue even if database storage fails
      }

      res.json({
        success: true,
        data: mcqAnalysis,
        sessionId: actualSessionId  // Return the actual sessionId
      });

    } catch (error) {
      Logger.error('MCQ analysis failed', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'MCQ analysis failed',
        message: error.message
      });
    }
  })
);

/**
 * POST /api/technical/submit-coding
 * Submit coding solution and generate analysis
 */
router.post('/submit-coding',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireActiveUser.bind(authMiddleware),
  asyncHandler(async (req, res) => {
    try {
      const { problem, code, language, testResults, timeTaken, sessionId } = req.body;
      const userId = req.user.id;

      // Validate input
      if (!problem) {
        return res.status(400).json({
          success: false,
          error: 'Missing problem',
          message: 'Please provide problem data'
        });
      }

      if (!code || !code.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Missing code',
          message: 'Please provide code solution'
        });
      }

      if (!testResults) {
        return res.status(400).json({
          success: false,
          error: 'Missing test results',
          message: 'Please provide test results'
        });
      }

      Logger.info('Starting Coding analysis', {
        userId: userId,
        problemId: problem.id,
        language: language,
        sessionId: sessionId
      });

      // Prepare solution data
      const solution = {
        code: code,
        language: language || 'javascript',
        timeTaken: timeTaken || 0
      };

      // Perform Coding analysis
      const codingAnalysis = await technicalFeedbackService.analyzeCoding(
        problem,
        solution,
        testResults
      );

      Logger.info('Coding analysis completed', {
        userId: userId,
        overallScore: codingAnalysis.overallScore
      });

      // Create or get session
      let actualSessionId = sessionId;
      try {
        // Validate UUID format - if sessionId is provided but not a valid UUID, ignore it
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isValidUUID = sessionId && uuidRegex.test(sessionId);

        if (sessionId && isValidUUID) {
          // Check if session exists
          const sessionCheck = await query(
            'SELECT id FROM interview_sessions WHERE id = $1 AND user_id = $2',
            [sessionId, userId]
          );

          if (sessionCheck.rows.length === 0) {
            // Session doesn't exist, create it with the provided UUID
            const newSession = await query(
              `INSERT INTO interview_sessions (
                id, user_id, session_type, status, started_at
              ) VALUES ($1, $2, $3, $4, $5)
              RETURNING id`,
              [
                sessionId,
                userId,
                'technical',
                'active',
                new Date()
              ]
            );
            actualSessionId = newSession.rows[0].id;
            Logger.info('Created new technical session', {
              sessionId: actualSessionId,
              userId: userId
            });
          }
        } else {
          // No valid sessionId provided, create new session (backend generates UUID)
          const newSession = await query(
            `INSERT INTO interview_sessions (
              user_id, session_type, status, started_at
            ) VALUES ($1, $2, $3, $4)
            RETURNING id`,
            [
              userId,
              'technical',
              'active',
              new Date()
            ]
          );
          actualSessionId = newSession.rows[0].id;
          Logger.info('Created new technical session', {
            sessionId: actualSessionId,
            userId: userId
          });
        }

        // Store Coding component - delete existing if any, then insert
        await query(
          `DELETE FROM session_components 
           WHERE session_id = $1 AND component_type = $2`,
          [actualSessionId, 'coding']
        );
        
        await query(
          `INSERT INTO session_components (
            session_id, component_type, component_data, score, completed_at, feedback
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            actualSessionId,
            'coding',
            JSON.stringify({
              problem: problem,
              solution: solution,
              testResults: testResults
            }),
            codingAnalysis.overallScore,
            new Date(),
            JSON.stringify(codingAnalysis)
          ]
        );

        Logger.info('Coding analysis stored in database', {
          sessionId: actualSessionId,
          userId: userId
        });
      } catch (dbError) {
        Logger.error('Failed to store Coding analysis in database', {
          error: dbError.message,
          userId: userId,
          sessionId: actualSessionId
        });
        // Continue even if database storage fails
      }

      res.json({
        success: true,
        data: codingAnalysis,
        sessionId: actualSessionId  // Return the actual sessionId
      });

    } catch (error) {
      Logger.error('Coding analysis failed', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Coding analysis failed',
        message: error.message
      });
    }
  })
);

/**
 * POST /api/technical/generate-combined-analysis
 * Generate combined analysis from MCQ and Coding results
 */
router.post('/generate-combined-analysis',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireActiveUser.bind(authMiddleware),
  asyncHandler(async (req, res) => {
    try {
      const { sessionId, violationStats } = req.body;
      const userId = req.user.id;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Missing sessionId',
          message: 'Please provide session ID'
        });
      }

      Logger.info('Generating combined technical analysis', {
        userId: userId,
        sessionId: sessionId,
        hasViolationStats: !!violationStats,
        totalViolations: violationStats ? Object.values(violationStats).reduce((sum, count) => sum + count, 0) : 0
      });

      // Get MCQ and Coding components from database
      const components = await query(
        `SELECT component_type, component_data, feedback, score
         FROM session_components
         WHERE session_id = $1 AND component_type IN ('mcq', 'coding')
         ORDER BY completed_at`,
        [sessionId]
      );

      if (components.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No components found',
          message: 'No MCQ or Coding data found for this session'
        });
      }

      // Extract MCQ and Coding analyses
      let mcqAnalysis = null;
      let codingAnalysis = null;

      components.rows.forEach(row => {
        if (row.component_type === 'mcq') {
          // Handle both JSON string and object (JSONB returns objects)
          mcqAnalysis = row.feedback ? 
            (typeof row.feedback === 'string' ? JSON.parse(row.feedback) : row.feedback) : null;
        } else if (row.component_type === 'coding') {
          // Handle both JSON string and object (JSONB returns objects)
          codingAnalysis = row.feedback ? 
            (typeof row.feedback === 'string' ? JSON.parse(row.feedback) : row.feedback) : null;
        }
      });

      // Generate combined analysis (including proctoring feedback)
      const combinedAnalysis = await technicalFeedbackService.generateCombinedAnalysis(
        mcqAnalysis,
        codingAnalysis,
        violationStats || {}
      );

      // Update session with combined analysis
      await query(
        `UPDATE interview_sessions 
         SET feedback = $1, overall_score = $2, status = $3, completed_at = $4
         WHERE id = $5 AND user_id = $6`,
        [
          JSON.stringify(combinedAnalysis),
          combinedAnalysis.overallScore,
          'completed',
          new Date(),
          sessionId,
          userId
        ]
      );

      Logger.info('Combined analysis generated and stored', {
        sessionId: sessionId,
        userId: userId,
        overallScore: combinedAnalysis.overallScore
      });

      res.json({
        success: true,
        data: combinedAnalysis
      });

    } catch (error) {
      Logger.error('Combined analysis generation failed', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Combined analysis generation failed',
        message: error.message
      });
    }
  })
);

module.exports = router;
