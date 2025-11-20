const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const Logger = require('../utils/logger.utils');

/**
 * HR Feedback Service
 * Handles HR round analysis by calling Python Ollama services
 */
class HRFeedbackService {
  constructor() {
    // Paths to Python scripts
    this.textAnalyzerPath = path.join(__dirname, 'hr-feedback', 'hr_text_analyzer.py');
    this.reportGeneratorPath = path.join(__dirname, 'hr-feedback', 'hr_report_generator.py');
    // Timeout for analysis (120 seconds)
    this.analysisTimeout = 120000;
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
   * Analyze transcribed text for a single response
   * @param {string} transcription - Transcribed text
   * @param {string} questionText - The question that was asked
   * @param {Array} wordTimestamps - Optional word-level timestamps
   * @returns {Promise<Object>} Text analysis result
   */
  async analyzeText(transcription, questionText, wordTimestamps = []) {
    return new Promise((resolve, reject) => {
      this.checkPythonScript(this.textAnalyzerPath).then(exists => {
        if (!exists) {
          reject(new Error('Text analyzer script not found'));
          return;
        }

        // Prepare input data
        const inputData = JSON.stringify({
          transcription: transcription,
          question: questionText,
          wordTimestamps: wordTimestamps
        });

        // Spawn Python process
        const python = spawn('python', [this.textAnalyzerPath, inputData], {
          cwd: path.dirname(this.textAnalyzerPath)
        });

        let stdout = '';
        let stderr = '';

        python.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        python.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        python.on('close', (code) => {
          if (code === 0) {
            try {
              const result = JSON.parse(stdout);
              resolve(result);
            } catch (parseError) {
              Logger.error('Failed to parse text analysis output', {
                error: parseError.message,
                stdout: stdout.substring(0, 500),
                stderr: stderr
              });
              reject(new Error('Failed to parse text analysis result'));
            }
          } else {
            Logger.error('Text analyzer Python script failed', {
              code,
              stderr: stderr,
              stdout: stdout.substring(0, 500)
            });
            reject(new Error(`Text analysis failed: ${stderr || 'Unknown error'}`));
          }
        });

        python.on('error', (error) => {
          Logger.error('Failed to spawn Python process for text analysis', { error: error.message });
          reject(new Error(`Failed to start text analysis: ${error.message}. Make sure Python is installed.`));
        });

        const timeout = setTimeout(() => {
          python.kill();
          reject(new Error('Text analysis timeout: Process took too long'));
        }, this.analysisTimeout);

        python.on('close', () => {
          clearTimeout(timeout);
        });
      });
    });
  }

  /**
   * Generate final comprehensive HR report
   * @param {Array} questions - Array of questions asked
   * @param {Object} responses - Object mapping questionId to transcription
   * @param {Object} textAnalyses - Object mapping questionId to text analysis results
   * @param {Object} rubricScores - Optional rubric scores per question
   * @param {Object} violationStats - Optional violation statistics for proctoring feedback
   * @returns {Promise<Object>} Final comprehensive report
   */
  async generateFinalReport(questions, responses, textAnalyses, rubricScores = {}, violationStats = {}) {
    return new Promise((resolve, reject) => {
      this.checkPythonScript(this.reportGeneratorPath).then(exists => {
        if (!exists) {
          reject(new Error('Report generator script not found'));
          return;
        }

        // Generate proctoring feedback from violation stats
        const proctoringFeedback = this.generateProctoringFeedback(violationStats);

        // Prepare input data
        const inputData = JSON.stringify({
          questions: questions,
          responses: responses,
          textAnalyses: textAnalyses,
          rubricScores: rubricScores,
          proctoringFeedback: proctoringFeedback
        });

        // Spawn Python process
        const python = spawn('python', [this.reportGeneratorPath, inputData], {
          cwd: path.dirname(this.reportGeneratorPath)
        });

        let stdout = '';
        let stderr = '';

        python.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        python.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        python.on('close', (code) => {
          if (code === 0) {
            try {
              const result = JSON.parse(stdout);
              // Add proctoring feedback to the result
              result.proctoringFeedback = proctoringFeedback;
              resolve(result);
            } catch (parseError) {
              Logger.error('Failed to parse report generator output', {
                error: parseError.message,
                stdout: stdout.substring(0, 500),
                stderr: stderr
              });
              reject(new Error('Failed to parse report generator result'));
            }
          } else {
            Logger.error('Report generator Python script failed', {
              code,
              stderr: stderr,
              stdout: stdout.substring(0, 500)
            });
            reject(new Error(`Report generation failed: ${stderr || 'Unknown error'}`));
          }
        });

        python.on('error', (error) => {
          Logger.error('Failed to spawn Python process for report generation', { error: error.message });
          reject(new Error(`Failed to start report generation: ${error.message}. Make sure Python is installed.`));
        });

        const timeout = setTimeout(() => {
          python.kill();
          reject(new Error('Report generation timeout: Process took too long'));
        }, this.analysisTimeout);

        python.on('close', () => {
          clearTimeout(timeout);
        });
      });
    });
  }

  /**
   * Generate proctoring feedback from violation statistics
   * @param {Object} violationStats - Violation statistics object
   * @returns {Object} Proctoring feedback
   */
  generateProctoringFeedback(violationStats) {
    const totalViolations = Object.values(violationStats || {}).reduce((sum, count) => sum + (count || 0), 0);
    
    if (totalViolations === 0) {
      return {
        status: 'clean',
        message: 'No proctoring violations detected. Excellent adherence to interview guidelines.',
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
    let message = `Detected ${totalViolations} proctoring violation(s) during the HR interview. `;
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
   * Calculate basic rubric scores from text analysis
   * @param {Object} textAnalysis - Text analysis result
   * @returns {Object} Rubric scores
   */
  calculateRubricScores(textAnalysis) {
    const fluency = textAnalysis.fluency?.score || 0;
    const content = textAnalysis.content?.score || 0;
    const language = textAnalysis.language?.score || 0;

    // Map to rubric criteria
    return {
      clarity: Math.round((language + fluency) / 2),
      relevance: Math.round(content),
      confidence: Math.round(fluency),
      professionalism: Math.round(language)
    };
  }
}

module.exports = HRFeedbackService;





