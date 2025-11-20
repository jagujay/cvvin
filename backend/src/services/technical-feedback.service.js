const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const Logger = require('../utils/logger.utils');

/**
 * Technical Feedback Service
 * Handles MCQ and Coding analysis by calling Python Ollama services
 */
class TechnicalFeedbackService {
  constructor() {
    // Paths to Python scripts
    this.mcqScriptPath = path.join(__dirname, 'technical-feedback', 'mcq_analyzer.py');
    this.codingScriptPath = path.join(__dirname, 'technical-feedback', 'coding_analyzer.py');
    // Timeout for analysis (300 seconds = 5 minutes - increased for small models that need more time)
    this.analysisTimeout = 300000;
  }

  /**
   * Check if Python script exists
   */
  async checkPythonScript(scriptPath) {
    try {
      await fs.access(scriptPath);
      return true;
    } catch (error) {
      Logger.error('Python script not found', { path: scriptPath });
      return false;
    }
  }

  /**
   * Call Python MCQ analyzer script
   * @param {Array} questions - Array of question objects
   * @param {Object} answers - Object mapping questionId to answer index
   * @param {Object} timeTaken - Object mapping questionId to time in seconds
   * @returns {Promise<Object>} Analysis result from Ollama
   */
  async analyzeMCQ(questions, answers, timeTaken) {
    return new Promise((resolve, reject) => {
      // Check if Python script exists
      this.checkPythonScript(this.mcqScriptPath).then(exists => {
        if (!exists) {
          reject(new Error('MCQ analyzer script not found'));
          return;
        }

        // Prepare input data
        const inputData = JSON.stringify({
          questions: questions,
          answers: answers,
          timeTaken: timeTaken
        });

        // Spawn Python process
        const python = spawn('python', [this.mcqScriptPath, inputData], {
          cwd: path.dirname(this.mcqScriptPath)
        });

        let stdout = '';
        let stderr = '';

        // Collect stdout
        python.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        // Collect stderr
        python.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        // Handle process completion
        python.on('close', (code) => {
          if (code === 0) {
            try {
              const result = JSON.parse(stdout);
              resolve(result);
            } catch (parseError) {
              Logger.error('Failed to parse MCQ analysis output', {
                error: parseError.message,
                stdout: stdout.substring(0, 500),
                stderr: stderr
              });
              reject(new Error('Failed to parse MCQ analysis result'));
            }
          } else {
            Logger.error('MCQ Python script failed', {
              code,
              stderr: stderr,
              stdout: stdout.substring(0, 500)
            });
            reject(new Error(`MCQ analysis failed: ${stderr || 'Unknown error'}`));
          }
        });

        // Handle process errors
        python.on('error', (error) => {
          Logger.error('Failed to spawn Python process for MCQ analysis', { error: error.message });
          reject(new Error(`Failed to start MCQ analysis: ${error.message}. Make sure Python is installed.`));
        });

        // Set timeout
        const timeout = setTimeout(() => {
          python.kill();
          reject(new Error('MCQ analysis timeout: Process took too long'));
        }, this.analysisTimeout);

        python.on('close', () => {
          clearTimeout(timeout);
        });
      });
    });
  }

  /**
   * Call Python Coding analyzer script
   * @param {Object} problem - Problem object with id, title, description, difficulty, etc.
   * @param {Object} solution - Solution object with code, language, timeTaken
   * @param {Object} testResults - Test results with passed, total, cases
   * @returns {Promise<Object>} Analysis result from Ollama
   */
  async analyzeCoding(problem, solution, testResults) {
    return new Promise((resolve, reject) => {
      // Check if Python script exists
      this.checkPythonScript(this.codingScriptPath).then(exists => {
        if (!exists) {
          reject(new Error('Coding analyzer script not found'));
          return;
        }

        // Prepare input data
        const inputData = JSON.stringify({
          problem: problem,
          solution: solution,
          testResults: testResults
        });

        // Spawn Python process
        const python = spawn('python', [this.codingScriptPath, inputData], {
          cwd: path.dirname(this.codingScriptPath)
        });

        let stdout = '';
        let stderr = '';

        // Collect stdout
        python.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        // Collect stderr
        python.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        // Handle process completion
        python.on('close', (code) => {
          if (code === 0) {
            try {
              const result = JSON.parse(stdout);
              resolve(result);
            } catch (parseError) {
              Logger.error('Failed to parse Coding analysis output', {
                error: parseError.message,
                stdout: stdout.substring(0, 500),
                stderr: stderr
              });
              reject(new Error('Failed to parse Coding analysis result'));
            }
          } else {
            Logger.error('Coding Python script failed', {
              code,
              stderr: stderr,
              stdout: stdout.substring(0, 500)
            });
            reject(new Error(`Coding analysis failed: ${stderr || 'Unknown error'}`));
          }
        });

        // Handle process errors
        python.on('error', (error) => {
          Logger.error('Failed to spawn Python process for Coding analysis', { error: error.message });
          reject(new Error(`Failed to start Coding analysis: ${error.message}. Make sure Python is installed.`));
        });

        // Set timeout
        const timeout = setTimeout(() => {
          python.kill();
          reject(new Error('Coding analysis timeout: Process took too long'));
        }, this.analysisTimeout);

        python.on('close', () => {
          clearTimeout(timeout);
        });
      });
    });
  }

  /**
   * Generate combined technical round analysis
   * @param {Object} mcqAnalysis - MCQ analysis result
   * @param {Object} codingAnalysis - Coding analysis result
   * @returns {Object} Combined analysis with overall score and summary
   */
  generateCombinedAnalysis(mcqAnalysis, codingAnalysis, violationStats = {}) {
    try {
      // Handle null/undefined analyses - use fallback scores
      const mcqScore = mcqAnalysis?.overallScore || 0;
      const codingScore = codingAnalysis?.overallScore || 0;
      
      // Calculate weighted overall score (MCQ: 40%, Coding: 60%)
      // If one is missing, use 100% weight for the available one
      let overallScore;
      if (mcqAnalysis && codingAnalysis) {
        overallScore = Math.round((mcqScore * 0.4) + (codingScore * 0.6));
      } else if (mcqAnalysis) {
        overallScore = mcqScore;
      } else if (codingAnalysis) {
        overallScore = codingScore;
      } else {
        overallScore = 0;
      }
      
      // Generate proctoring feedback from violation stats
      const proctoringFeedback = this.generateProctoringFeedback(violationStats);

      // Combine strengths and weaknesses
      const strengths = [
        ...(mcqAnalysis?.conceptAnalysis?.strongConcepts || []).map(c => `Strong in ${c} (MCQ)`),
        ...(codingAnalysis?.strengths || [])
      ];

      const weaknesses = [
        ...(mcqAnalysis?.conceptAnalysis?.weakConcepts || []).map(c => `Needs improvement in ${c} (MCQ)`),
        ...(codingAnalysis?.weaknesses || [])
      ];

      // Combine suggestions - handle both string arrays and object arrays
      const suggestions = [];
      
      // Add MCQ suggestions
      if (mcqAnalysis?.suggestions && Array.isArray(mcqAnalysis.suggestions)) {
        mcqAnalysis.suggestions.forEach(s => {
          if (typeof s === 'string') {
            suggestions.push({ suggestion: s, source: 'MCQ', priority: 'medium', category: 'MCQ Performance' });
          } else {
            suggestions.push({ ...s, source: 'MCQ', category: s.category || 'MCQ Performance' });
          }
        });
      }
      
      // Add Coding suggestions
      const codingSuggestions = codingAnalysis?.suggestions || codingAnalysis?.improvementSuggestions || [];
      if (Array.isArray(codingSuggestions)) {
        codingSuggestions.forEach(s => {
          if (typeof s === 'string') {
            suggestions.push({ suggestion: s, source: 'Coding', priority: 'medium', category: 'Coding Performance' });
          } else {
            suggestions.push({ ...s, source: 'Coding', category: s.category || 'Coding Performance' });
          }
        });
      }

      // Combine error analysis from both rounds
      const combinedErrorAnalysis = {
        mcqErrors: mcqAnalysis?.errorAnalysis || null,
        codingErrors: codingAnalysis?.errorAnalysis || null,
        commonMistakes: [
          ...(mcqAnalysis?.errorAnalysis?.commonMistakes || []).map(m => ({ mistake: m, source: 'MCQ' })),
          ...(codingAnalysis?.errorAnalysis?.commonMistakes || []).map(m => ({ mistake: m, source: 'Coding' }))
        ],
        errorPatterns: {
          mcq: mcqAnalysis?.errorAnalysis?.errorPatterns || null,
          coding: codingAnalysis?.errorAnalysis?.errorPatterns || null,
          overall: this.identifyOverallErrorPatterns(mcqAnalysis?.errorAnalysis, codingAnalysis?.errorAnalysis)
        }
      };

      // Combine recommendations
      const combinedRecommendations = {
        howToImprove: [
          ...(mcqAnalysis?.recommendations?.howToImprove || []).map(r => ({ ...r, source: 'MCQ' })),
          ...(codingAnalysis?.recommendations?.howToImprove || []).map(r => ({ ...r, source: 'Coding' }))
        ],
        whatNotToDo: [
          ...(mcqAnalysis?.recommendations?.whatNotToDo || []).map(r => ({ ...r, source: 'MCQ' })),
          ...(codingAnalysis?.recommendations?.whatNotToDo || []).map(r => ({ ...r, source: 'Coding' }))
        ],
        whatToDoFromErrors: [
          ...(mcqAnalysis?.recommendations?.whatToDoFromErrors || []).map(r => ({ ...r, source: 'MCQ' })),
          ...(codingAnalysis?.recommendations?.whatToDoFromErrors || []).map(r => ({ ...r, source: 'Coding' }))
        ]
      };

      // Generate detailed analysis breakdown
      const detailedAnalysis = {
        mcq: mcqAnalysis ? {
          performance: {
            score: mcqScore,
            correctAnswers: mcqAnalysis.correctAnswers || 0,
            totalQuestions: mcqAnalysis.totalQuestions || 0,
            averageTime: mcqAnalysis.averageTimePerQuestion || 0
          },
          conceptAnalysis: mcqAnalysis.conceptAnalysis || {},
          timeAnalysis: mcqAnalysis.timeAnalysis || {},
          reviewTable: mcqAnalysis.reviewTable || [],
          performanceByCategory: mcqAnalysis.performanceByCategory || {},
          performanceByDifficulty: mcqAnalysis.performanceByDifficulty || {},
          errorAnalysis: mcqAnalysis.errorAnalysis || null
        } : null,
        coding: codingAnalysis ? {
          performance: {
            score: codingScore,
            testCasesPassed: codingAnalysis.solutionStatus?.testCasesPassed || 0,
            testCasesTotal: codingAnalysis.solutionStatus?.testCasesTotal || 0,
            solutionStatus: codingAnalysis.solutionStatus?.status || 'Unknown',
            timeTaken: codingAnalysis.timeAnalysis?.timeTaken || 0
          },
          problemAnalysis: codingAnalysis.problemAnalysis || {},
          codeQuality: codingAnalysis.codeQuality || {},
          timeAnalysis: codingAnalysis.timeAnalysis || {},
          testCaseBreakdown: codingAnalysis.testCaseBreakdown || [],
          errorAnalysis: codingAnalysis.errorAnalysis || null,
          reviewComponent: codingAnalysis.reviewComponent || null
        } : null
      };

      return {
        overallScore: overallScore,
        mcqScore: mcqScore,
        codingScore: codingScore,
        strengths: strengths,
        weaknesses: weaknesses,
        suggestions: suggestions, // Simple suggestions array
        detailedAnalysis: detailedAnalysis,
        errorAnalysis: combinedErrorAnalysis,
        recommendations: combinedRecommendations, // Detailed recommendations with what to do/not do
        mcqAnalysis: mcqAnalysis || null,
        codingAnalysis: codingAnalysis || null,
        proctoringFeedback: proctoringFeedback,
        summary: this.generateSummary(mcqAnalysis, codingAnalysis, overallScore, proctoringFeedback)
      };
    } catch (error) {
      Logger.error('Failed to generate combined analysis', { error: error.message });
      throw new Error('Failed to generate combined analysis');
    }
  }

  /**
   * Generate proctoring feedback from violation statistics
   */
  generateProctoringFeedback(violationStats) {
    const totalViolations = Object.values(violationStats || {}).reduce((sum, count) => sum + (count || 0), 0);
    
    if (totalViolations === 0) {
      return {
        status: 'clean',
        message: 'No proctoring violations detected. Excellent adherence to exam guidelines.',
        violations: {},
        totalCount: 0,
        severity: 'none'
      };
    }

    // Categorize violations
    const criticalViolations = [];
    const highViolations = [];
    const mediumViolations = [];
    const lowViolations = [];

    Object.entries(violationStats || {}).forEach(([type, count]) => {
      if (count > 0) {
        // Categorize by severity
        if (['UNAUTHORIZED_PERSON', 'MULTIPLE_PEOPLE_DETECTED'].includes(type)) {
          criticalViolations.push({ type, count });
        } else if (['TAB_SWITCH', 'WINDOW_BLUR', 'FULLSCREEN_EXIT', 'MULTIPLE_FACES_DETECTED', 'PROHIBITED_OBJECT'].includes(type)) {
          highViolations.push({ type, count });
        } else if (['NO_FACE_DETECTED', 'LOOKING_AWAY_FROM_SCREEN', 'GAZE_OFF_SCREEN', 'HEAD_POSE_VIOLATION', 'LOOKING_DOWN', 'LOOKING_SIDEWAYS'].includes(type)) {
          mediumViolations.push({ type, count });
        } else {
          lowViolations.push({ type, count });
        }
      }
    });

    // Determine overall severity
    let severity = 'low';
    if (criticalViolations.length > 0 || highViolations.length > 3) {
      severity = 'critical';
    } else if (highViolations.length > 0 || mediumViolations.length > 5) {
      severity = 'high';
    } else if (mediumViolations.length > 0 || totalViolations > 10) {
      severity = 'medium';
    }

    // Generate message
    let message = `Detected ${totalViolations} proctoring violation(s) during the interview. `;
    if (criticalViolations.length > 0) {
      message += 'Critical violations detected including unauthorized persons or multiple people. ';
    }
    if (highViolations.length > 0) {
      message += `High-severity violations: ${highViolations.map(v => `${v.type} (${v.count}x)`).join(', ')}. `;
    }
    message += 'Please review the detailed violation breakdown below.';

    return {
      status: severity === 'none' ? 'clean' : 'violations_detected',
      message,
      violations: violationStats,
      totalCount: totalViolations,
      severity,
      breakdown: {
        critical: criticalViolations,
        high: highViolations,
        medium: mediumViolations,
        low: lowViolations
      }
    };
  }

  /**
   * Identify overall error patterns across both rounds
   */
  identifyOverallErrorPatterns(mcqErrorAnalysis, codingErrorAnalysis) {
    const patterns = [];
    
    if (mcqErrorAnalysis?.errorPatterns) {
      patterns.push(`MCQ: ${mcqErrorAnalysis.errorPatterns}`);
    }
    
    if (codingErrorAnalysis?.errorPatterns) {
      patterns.push(`Coding: ${codingErrorAnalysis.errorPatterns}`);
    }
    
    // Identify cross-cutting patterns
    const mcqMistakes = mcqErrorAnalysis?.commonMistakes || [];
    const codingMistakes = codingErrorAnalysis?.commonMistakes || [];
    
    // Find common themes
    const allMistakes = [...mcqMistakes, ...codingMistakes];
    if (allMistakes.length > 0) {
      patterns.push(`Common issues across rounds: ${allMistakes.slice(0, 3).join(', ')}`);
    }
    
    return patterns.length > 0 ? patterns.join(' | ') : 'No clear patterns identified';
  }

  /**
   * Generate summary text for combined analysis
   */
  generateSummary(mcqAnalysis, codingAnalysis, overallScore, proctoringFeedback = null) {
    const mcqScore = mcqAnalysis?.overallScore || 0;
    const codingScore = codingAnalysis?.overallScore || 0;

    let summary = `Overall Technical Round Score: ${overallScore}/100\n\n`;
    
    if (mcqAnalysis) {
      summary += `MCQ Performance: ${mcqScore}/100\n`;
      summary += `- Correct Answers: ${mcqAnalysis.correctAnswers || 0}/${mcqAnalysis.totalQuestions || 0}\n`;
      summary += `- Average Time: ${Math.round(mcqAnalysis.averageTimePerQuestion || 0)}s per question\n`;
      if (mcqAnalysis.conceptAnalysis?.strongConcepts?.length > 0) {
        summary += `- Strong Areas: ${mcqAnalysis.conceptAnalysis.strongConcepts.slice(0, 3).join(', ')}\n`;
      }
      summary += `\n`;
    }

    if (codingAnalysis) {
      summary += `Coding Performance: ${codingScore}/100\n`;
      summary += `- Problem Difficulty: ${codingAnalysis.problemAnalysis?.difficulty || 'Unknown'}\n`;
      summary += `- Test Cases: ${codingAnalysis.solutionStatus?.testCasesPassed || 0}/${codingAnalysis.solutionStatus?.testCasesTotal || 0} passed\n`;
      summary += `- Solution Status: ${codingAnalysis.solutionStatus?.status || 'Unknown'}\n`;
      if (codingAnalysis.codeQuality?.overallQuality) {
        summary += `- Code Quality: ${codingAnalysis.codeQuality.overallQuality}\n`;
      }
      summary += `\n`;
    }

    if (overallScore >= 80) {
      summary += `Excellent performance! You demonstrated strong technical knowledge and problem-solving skills.`;
    } else if (overallScore >= 60) {
      summary += `Good performance with room for improvement. Focus on the identified weak areas.`;
    } else {
      summary += `Performance needs improvement. Review the suggestions and practice the identified concepts.`;
    }

    // Add proctoring feedback to summary
    if (proctoringFeedback && proctoringFeedback.totalCount > 0) {
      summary += `\n\nProctoring Assessment:\n`;
      summary += `${proctoringFeedback.message}\n`;
      summary += `Total Violations: ${proctoringFeedback.totalCount}\n`;
      summary += `Severity: ${proctoringFeedback.severity.toUpperCase()}`;
    } else if (proctoringFeedback) {
      summary += `\n\nProctoring Assessment: ${proctoringFeedback.message}`;
    }

    return summary;
  }
}

module.exports = TechnicalFeedbackService;


