const express = require('express');
const router = express.Router();
const { query } = require('../config/database.config');
const { asyncHandler } = require('../middleware/errorHandler');
const authMiddleware = require('../middleware/auth');
const Logger = require('../utils/logger.utils');

/**
 * Store violations for a session
 * POST /api/proctoring/violations
 */
router.post(
  '/violations',
  authMiddleware.authenticate.bind(authMiddleware),
  asyncHandler(async (req, res) => {
    try {
      const { sessionId, violations } = req.body;
      const userId = req.user.id;

      Logger.info('Storing violations', {
        userId,
        sessionId,
        violationCount: violations?.length
      });

      if (!sessionId || !violations || !Array.isArray(violations)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request. sessionId and violations array are required.'
        });
      }

      // Verify session ownership
      const sessionCheck = await query(
        'SELECT id FROM interview_sessions WHERE id = $1 AND user_id = $2',
        [sessionId, userId]
      );

      if (sessionCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Session not found or you do not have permission to update it'
        });
      }

      // Store violations (with counts if provided)
      const storedViolations = [];
      for (const violation of violations) {
        const count = violation.count || 1; // Default to 1 if count not provided
        
        const result = await query(
          `INSERT INTO proctoring_violations 
           (session_id, violation_type, details, severity, timestamp, metadata, count) 
           VALUES ($1, $2, $3, $4, $5, $6, $7) 
           RETURNING *`,
          [
            sessionId,
            violation.type,
            violation.details,
            violation.severity,
            violation.timestamp,
            JSON.stringify(violation.metadata || {}),
            count
          ]
        );
        storedViolations.push(result.rows[0]);
      }

      Logger.info('Violations stored successfully', {
        userId,
        sessionId,
        storedCount: storedViolations.length
      });

      res.json({
        success: true,
        data: {
          sessionId,
          violationsStored: storedViolations.length,
          violations: storedViolations
        }
      });
    } catch (error) {
      Logger.error('Failed to store violations', {
        error: error.message,
        userId: req.user?.id,
        sessionId: req.body?.sessionId
      });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  })
);

/**
 * Get violations for a session
 * GET /api/proctoring/violations/:sessionId
 */
router.get(
  '/violations/:sessionId',
  authMiddleware.authenticate.bind(authMiddleware),
  asyncHandler(async (req, res) => {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      Logger.info('Fetching violations', {
        userId,
        sessionId
      });

      // Verify session ownership
      const sessionCheck = await query(
        'SELECT id FROM interview_sessions WHERE id = $1 AND user_id = $2',
        [sessionId, userId]
      );

      if (sessionCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Session not found or you do not have permission to access it'
        });
      }

      // Fetch violations
      const result = await query(
        `SELECT * FROM proctoring_violations 
         WHERE session_id = $1 
         ORDER BY timestamp ASC`,
        [sessionId]
      );

      // Calculate statistics (using count column)
      const stats = {
        total: result.rows.length,
        totalOccurrences: 0, // Sum of all counts
        byType: {},
        bySeverity: {}
      };

      result.rows.forEach(v => {
        const count = v.count || 1;
        stats.totalOccurrences += count;
        stats.byType[v.violation_type] = (stats.byType[v.violation_type] || 0) + count;
        stats.bySeverity[v.severity] = (stats.bySeverity[v.severity] || 0) + count;
      });

      Logger.info('Violations fetched successfully', {
        userId,
        sessionId,
        violationCount: result.rows.length
      });

      res.json({
        success: true,
        data: {
          sessionId,
          violations: result.rows,
          statistics: stats
        }
      });
    } catch (error) {
      Logger.error('Failed to fetch violations', {
        error: error.message,
        userId: req.user?.id,
        sessionId: req.params?.sessionId
      });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  })
);

/**
 * Delete violations for a session
 * DELETE /api/proctoring/violations/:sessionId
 */
router.delete(
  '/violations/:sessionId',
  authMiddleware.authenticate.bind(authMiddleware),
  asyncHandler(async (req, res) => {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      Logger.info('Deleting violations', {
        userId,
        sessionId
      });

      // Verify session ownership
      const sessionCheck = await query(
        'SELECT id FROM interview_sessions WHERE id = $1 AND user_id = $2',
        [sessionId, userId]
      );

      if (sessionCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Session not found or you do not have permission to delete violations'
        });
      }

      // Delete violations
      const result = await query(
        'DELETE FROM proctoring_violations WHERE session_id = $1',
        [sessionId]
      );

      Logger.info('Violations deleted successfully', {
        userId,
        sessionId,
        deletedCount: result.rowCount
      });

      res.json({
        success: true,
        data: {
          sessionId,
          violationsDeleted: result.rowCount
        }
      });
    } catch (error) {
      Logger.error('Failed to delete violations', {
        error: error.message,
        userId: req.user?.id,
        sessionId: req.params?.sessionId
      });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  })
);

module.exports = router;

