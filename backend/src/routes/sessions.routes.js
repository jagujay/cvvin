const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { query } = require('../config/database.config');
const Logger = require('../utils/logger.utils');

/**
 * GET /api/sessions
 * Get all interview sessions for the authenticated user
 */
router.get('/',
  authMiddleware.authenticate.bind(authMiddleware),
  asyncHandler(async (req, res) => {
    try {
      const userId = req.user.id;

      // Fetch all interview sessions for the user
      const sessionsResult = await query(
        `SELECT 
          id,
          session_type,
          status,
          started_at,
          completed_at,
          total_duration,
          overall_score,
          feedback,
          metadata
        FROM interview_sessions
        WHERE user_id = $1
        ORDER BY started_at DESC`,
        [userId]
      );

      // Fetch all resume analyses for the user
      const resumeAnalysesResult = await query(
        `SELECT 
          id,
          file_id,
          job_description,
          analysis_result,
          overall_score,
          analysis_date,
          model_version
        FROM resume_analyses
        WHERE user_id = $1
        ORDER BY analysis_date DESC`,
        [userId]
      );

      const sessions = sessionsResult.rows.map(session => {
        // Determine display type based on session_type
        let displayType = 'Full Mock Interview';
        let iconType = 'full_mock';
        
        if (session.session_type === 'technical') {
          displayType = 'Technical Interview';
          iconType = 'technical';
        } else if (session.session_type === 'hr') {
          displayType = 'HR Interview';
          iconType = 'hr';
        } else if (session.session_type === 'resume') {
          displayType = 'Resume Analysis';
          iconType = 'resume';
        } else if (session.session_type === 'full_mock') {
          displayType = 'Full Mock Interview';
          iconType = 'full_mock';
        }

        // Parse feedback if it's a string
        let feedback = session.feedback;
        if (typeof feedback === 'string') {
          try {
            feedback = JSON.parse(feedback);
          } catch (e) {
            feedback = {};
          }
        }

        // Parse metadata if it's a string
        let metadata = session.metadata;
        if (typeof metadata === 'string') {
          try {
            metadata = JSON.parse(metadata);
          } catch (e) {
            metadata = {};
          }
        }

        return {
          id: session.id,
          type: displayType,
          iconType: iconType,
          date: session.started_at,
          duration: session.total_duration || 0,
          score: session.overall_score || 0,
          status: session.status,
          completedAt: session.completed_at,
          feedback: feedback,
          metadata: metadata
        };
      });

      // Transform resume analyses into session-like format
      const resumeSessions = resumeAnalysesResult.rows.map(analysis => {
        // Parse analysis_result if it's a string
        let analysisResult = analysis.analysis_result;
        if (typeof analysisResult === 'string') {
          try {
            analysisResult = JSON.parse(analysisResult);
          } catch (e) {
            analysisResult = {};
          }
        }

        return {
          id: analysis.id,
          type: 'Resume Analysis',
          iconType: 'resume',
          date: analysis.analysis_date,
          duration: 0, // Resume analysis doesn't have duration
          score: analysis.overall_score || 0,
          status: 'completed',
          completedAt: analysis.analysis_date,
          feedback: analysisResult,
          metadata: {
            fileId: analysis.file_id,
            jobDescription: analysis.job_description,
            modelVersion: analysis.model_version
          },
          isResumeAnalysis: true // Flag to identify resume analyses
        };
      });

      // Combine and sort all sessions by date
      const allSessions = [...sessions, ...resumeSessions].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA; // Most recent first
      });

      // Calculate summary statistics
      const totalSessions = allSessions.length;
      const completedSessions = allSessions.filter(s => s.status === 'completed');
      const averageScore = completedSessions.length > 0
        ? Math.round(completedSessions.reduce((acc, s) => acc + (s.score || 0), 0) / completedSessions.length)
        : 0;
      const bestScore = completedSessions.length > 0
        ? Math.max(...completedSessions.map(s => s.score || 0))
        : 0;
      const totalTime = allSessions.reduce((acc, s) => acc + (s.duration || 0), 0);

      Logger.info('Fetched user sessions', {
        userId: userId,
        totalSessions: totalSessions,
        interviewSessions: sessions.length,
        resumeAnalyses: resumeSessions.length,
        completedSessions: completedSessions.length
      });

      res.json({
        success: true,
        sessions: allSessions,
        statistics: {
          totalSessions: totalSessions,
          averageScore: averageScore,
          bestScore: bestScore,
          totalTime: totalTime
        }
      });
    } catch (error) {
      Logger.error('Failed to fetch sessions', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  })
);

/**
 * GET /api/sessions/:sessionId
 * Get a single session by ID
 */
router.get('/:sessionId',
  authMiddleware.authenticate.bind(authMiddleware),
  asyncHandler(async (req, res) => {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      Logger.info('Fetching session details', {
        userId: userId,
        sessionId: sessionId
      });

      // Fetch session from interview_sessions
      const sessionResult = await query(
        `SELECT 
          id,
          session_type,
          status,
          started_at,
          completed_at,
          total_duration,
          overall_score,
          feedback,
          metadata
        FROM interview_sessions
        WHERE id = $1 AND user_id = $2`,
        [sessionId, userId]
      );

      if (sessionResult.rows.length === 0) {
        // Try resume_analyses table as fallback
        const resumeResult = await query(
          `SELECT 
            id,
            file_id,
            job_description,
            analysis_result as feedback,
            overall_score,
            analysis_date as started_at,
            analysis_date as completed_at,
            model_version
          FROM resume_analyses
          WHERE id = $1 AND user_id = $2`,
          [sessionId, userId]
        );

        if (resumeResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Session not found',
            message: 'The requested session does not exist or you do not have access to it'
          });
        }

        // Return resume analysis
        const resume = resumeResult.rows[0];
        let feedback = resume.feedback;
        if (typeof feedback === 'string') {
          try {
            feedback = JSON.parse(feedback);
          } catch (e) {
            feedback = {};
          }
        }

        return res.json({
          success: true,
          data: {
            id: resume.id,
            type: 'Resume Analysis',
            sessionType: 'resume',
            score: resume.overall_score || 0,
            startedAt: resume.started_at,
            completedAt: resume.completed_at,
            status: 'completed',
            feedback: feedback,
            metadata: {
              fileId: resume.file_id,
              jobDescription: resume.job_description,
              modelVersion: resume.model_version
            }
          }
        });
      }

      // Interview session found
      const session = sessionResult.rows[0];

      // Parse feedback if it's a string
      let feedback = session.feedback;
      if (typeof feedback === 'string') {
        try {
          feedback = JSON.parse(feedback);
        } catch (e) {
          feedback = {};
        }
      }

      // Parse metadata if it's a string
      let metadata = session.metadata;
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata);
        } catch (e) {
          metadata = {};
        }
      }

      // Get session components (MCQ, Coding, HR questions)
      const componentsResult = await query(
        `SELECT 
          id,
          component_type,
          component_data,
          feedback as component_feedback,
          score as component_score,
          completed_at
        FROM session_components
        WHERE session_id = $1
        ORDER BY completed_at ASC`,
        [sessionId]
      );

      const components = componentsResult.rows.map(comp => {
        let compData = comp.component_data;
        if (typeof compData === 'string') {
          try {
            compData = JSON.parse(compData);
          } catch (e) {
            compData = {};
          }
        }

        let compFeedback = comp.component_feedback;
        if (typeof compFeedback === 'string') {
          try {
            compFeedback = JSON.parse(compFeedback);
          } catch (e) {
            compFeedback = {};
          }
        }

        return {
          id: comp.id,
          type: comp.component_type,
          data: compData,
          feedback: compFeedback,
          score: comp.component_score,
          completedAt: comp.completed_at
        };
      });

      Logger.info('Session fetched successfully', {
        userId: userId,
        sessionId: sessionId,
        sessionType: session.session_type,
        componentCount: components.length
      });

      res.json({
        success: true,
        data: {
          id: session.id,
          type: session.session_type === 'technical' ? 'Technical Interview' : 
                session.session_type === 'hr' ? 'HR Interview' : 'Full Mock Interview',
          sessionType: session.session_type,
          score: session.overall_score || 0,
          startedAt: session.started_at,
          completedAt: session.completed_at,
          duration: session.total_duration || 0,
          status: session.status,
          feedback: feedback,
          metadata: metadata,
          components: components
        }
      });
    } catch (error) {
      Logger.error('Failed to fetch session', { 
        error: error.message,
        sessionId: req.params.sessionId
      });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  })
);

/**
 * DELETE /api/sessions/:sessionId
 * Delete a session and its components
 */
router.delete('/:sessionId',
  authMiddleware.authenticate.bind(authMiddleware),
  asyncHandler(async (req, res) => {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      Logger.info('Deleting session', {
        userId: userId,
        sessionId: sessionId
      });

      // Verify ownership
      const sessionCheck = await query(
        'SELECT id FROM interview_sessions WHERE id = $1 AND user_id = $2',
        [sessionId, userId]
      );

      if (sessionCheck.rows.length === 0) {
        // Check if it's a resume analysis
        const resumeCheck = await query(
          'SELECT id FROM resume_analyses WHERE id = $1 AND user_id = $2',
          [sessionId, userId]
        );

        if (resumeCheck.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Session not found or you do not have permission to delete it'
          });
        }

        // Delete resume analysis
        await query('DELETE FROM resume_analyses WHERE id = $1', [sessionId]);
        
        Logger.info('Resume analysis deleted successfully', {
          userId: userId,
          analysisId: sessionId
        });

        return res.json({
          success: true,
          message: 'Resume analysis deleted successfully'
        });
      }

      // Delete session components first (foreign key constraint)
      await query('DELETE FROM session_components WHERE session_id = $1', [sessionId]);
      
      // Delete the session
      await query('DELETE FROM interview_sessions WHERE id = $1', [sessionId]);

      Logger.info('Session deleted successfully', {
        userId: userId,
        sessionId: sessionId
      });

      res.json({
        success: true,
        message: 'Session deleted successfully'
      });
    } catch (error) {
      Logger.error('Failed to delete session', { 
        error: error.message,
        sessionId: req.params.sessionId
      });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  })
);

module.exports = router;

