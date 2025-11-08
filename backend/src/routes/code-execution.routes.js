const express = require('express');
const router = express.Router();

// Import services and middleware
const CodeExecutionService = require('../services/code-execution.service');
const authMiddleware = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const Logger = require('../utils/logger.utils');

// Initialize services
const codeExecutionService = new CodeExecutionService();

/**
 * POST /api/code/execute
 * Execute code against test cases
 */
router.post('/execute',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireActiveUser.bind(authMiddleware),
  asyncHandler(async (req, res) => {
    try {
      const { code, language, testCases } = req.body;

      // Validate input
      if (!code || !code.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Missing code',
          message: 'Please provide code to execute'
        });
      }

      if (!language) {
        return res.status(400).json({
          success: false,
          error: 'Missing language',
          message: 'Please specify a programming language'
        });
      }

      if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing test cases',
          message: 'Please provide test cases to run'
        });
      }

      Logger.info('Code execution request', {
        userId: req.user.id,
        language: language,
        testCasesCount: testCases.length
      });

      // Execute test cases
      const results = await codeExecutionService.executeTestCases(
        code,
        language,
        testCases
      );

      Logger.info('Code execution completed', {
        userId: req.user.id,
        passed: results.passed,
        total: results.total
      });

      res.json({
        success: true,
        data: {
          status: results.allPassed ? 'Accepted' : 'Wrong Answer',
          passed: results.passed,
          total: results.total,
          cases: results.cases,
          allPassed: results.allPassed
        }
      });

    } catch (error) {
      Logger.error('Code execution failed', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Execution failed',
        message: error.message || 'Failed to execute code. Please check your code and try again.'
      });
    }
  })
);

/**
 * POST /api/code/run
 * Run code with custom input (for testing/debugging)
 */
router.post('/run',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireActiveUser.bind(authMiddleware),
  asyncHandler(async (req, res) => {
    try {
      const { code, language, input = '' } = req.body;

      if (!code || !code.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Missing code',
          message: 'Please provide code to execute'
        });
      }

      if (!language) {
        return res.status(400).json({
          success: false,
          error: 'Missing language',
          message: 'Please specify a programming language'
        });
      }

      Logger.info('Code run request', {
        userId: req.user.id,
        language: language
      });

      // Execute code
      const result = await codeExecutionService.runCodeInDocker(code, language, input);

      res.json({
        success: true,
        data: {
          output: result.output,
          errors: result.errors
        }
      });

    } catch (error) {
      Logger.error('Code run failed', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Execution failed',
        message: error.message || 'Failed to run code'
      });
    }
  })
);

module.exports = router;





