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

  /**
   * Generate comprehensive HR feedback for a session
   * @param {string} sessionId - Session ID
   * @param {Array} qaPairs - Array of question-answer pairs
   * @param {Object} violationStats - Violation statistics
   * @param {Object} gestureData - Gesture analysis data
   * @returns {Promise<Object>} Comprehensive feedback
   */
  async generateHRFeedback(sessionId, qaPairs = [], violationStats = {}, gestureData = null) {
    try {
      const questions = qaPairs.map(qa => ({ id: qa.questionId, question: qa.question }));
      const responses = {};
      const textAnalyses = {};
      const rubricScores = {};

      // Analyze each response
      for (const qa of qaPairs) {
        const transcription = typeof qa.transcription === 'string' 
          ? qa.transcription 
          : qa.transcription?.text || '';
        
        responses[qa.questionId] = transcription;
        
        if (transcription) {
          try {
            const analysis = await this.analyzeText(transcription, qa.question, qa.wordTimestamps || []);
            textAnalyses[qa.questionId] = analysis;
            rubricScores[qa.questionId] = this.calculateRubricScores(analysis);
          } catch (error) {
            Logger.error('Failed to analyze response', { questionId: qa.questionId, error: error.message });
            // Continue with other responses - set default scores if analysis fails
            rubricScores[qa.questionId] = {
              clarity: 50,
              relevance: 50,
              confidence: 50,
              professionalism: 50
            };
          }
        } else {
          // No transcription - set default scores
          rubricScores[qa.questionId] = {
            clarity: 0,
            relevance: 0,
            confidence: 0,
            professionalism: 0
          };
        }
      }

      // Generate gesture analysis feedback
      const gestureFeedback = this.generateGestureFeedback(gestureData);
      
      Logger.info('Gesture feedback generated', {
        hasGestureFeedback: !!gestureFeedback,
        gestureFeedbackKeys: gestureFeedback ? Object.keys(gestureFeedback) : []
      });

      // Generate final report - with fallback if Python script fails
      let report;
      try {
        report = await this.generateFinalReport(
          questions,
          responses,
          textAnalyses,
          rubricScores,
          violationStats
        );
      } catch (error) {
        Logger.error('Failed to generate final report with Python script', { error: error.message });
        // Fallback: Create basic report structure
        report = this.generateFallbackReport(questions, responses, rubricScores, violationStats);
      }

      // Add gesture feedback to report
      if (gestureFeedback) {
        report.gestureAnalysis = gestureFeedback;
        Logger.info('Added gestureAnalysis to report', {
          reportKeys: Object.keys(report),
          hasGestureAnalysis: !!report.gestureAnalysis
        });
      } else {
        Logger.warn('No gesture feedback to add to report');
      }

      // Calculate overall score
      const questionScores = Object.values(rubricScores);
      const avgScore = questionScores.length > 0
        ? questionScores.reduce((sum, scores) => {
            const questionAvg = (scores.clarity + scores.relevance + scores.confidence + scores.professionalism) / 4;
            return sum + questionAvg;
          }, 0) / questionScores.length
        : 0;

      report.overallScore = Math.round(avgScore);

      return report;
    } catch (error) {
      Logger.error('Failed to generate HR feedback', { error: error.message, stack: error.stack });
      // Return minimal feedback structure to prevent complete failure
      return this.generateMinimalFeedback(qaPairs, violationStats, gestureData);
    }
  }

  /**
   * Generate fallback report when Python script fails
   */
  generateFallbackReport(questions, responses, rubricScores, violationStats) {
    const proctoringFeedback = this.generateProctoringFeedback(violationStats);
    
    return {
      summary: 'HR Interview Analysis',
      overallScore: 0,
      questions: questions.map(q => ({
        id: q.id,
        question: q.question,
        response: responses[q.id] || '',
        scores: rubricScores[q.id] || {
          clarity: 0,
          relevance: 0,
          confidence: 0,
          professionalism: 0
        },
        feedback: 'Analysis completed with basic scoring.'
      })),
      strengths: [],
      areasForImprovement: ['Complete detailed analysis pending'],
      recommendations: ['Review your responses and practice more'],
      proctoringFeedback: proctoringFeedback
    };
  }

  /**
   * Generate minimal feedback when everything fails
   */
  generateMinimalFeedback(qaPairs = [], violationStats = {}, gestureData = null) {
    const proctoringFeedback = this.generateProctoringFeedback(violationStats);
    const gestureFeedback = this.generateGestureFeedback(gestureData);
    
    return {
      summary: 'HR Interview Session Completed',
      overallScore: 0,
      questions: qaPairs.map(qa => ({
        id: qa.questionId,
        question: qa.question,
        response: typeof qa.transcription === 'string' ? qa.transcription : qa.transcription?.text || '',
        scores: {
          clarity: 0,
          relevance: 0,
          confidence: 0,
          professionalism: 0
        },
        feedback: 'Response recorded. Detailed analysis pending.'
      })),
      strengths: [],
      areasForImprovement: [],
      recommendations: [],
      proctoringFeedback: proctoringFeedback,
      gestureAnalysis: gestureFeedback
    };
  }

  /**
   * Generate feedback from gesture analysis data
   * @param {Object} gestureData - Gesture analysis data
   * @returns {Object|null} Gesture feedback
   */
  generateGestureFeedback(gestureData) {
    if (!gestureData) {
      Logger.warn('No gesture data provided to generateGestureFeedback');
      return null;
    }

    Logger.info('Generating gesture feedback', {
      hasEyeContact: !!gestureData.eyeContact,
      hasExpressions: !!gestureData.expressions,
      hasHandMovements: !!gestureData.handMovements,
      hasHeadPose: !!gestureData.headPose,
      eyeContactPercentage: gestureData.eyeContact?.percentage,
      expressionKeys: gestureData.expressions ? Object.keys(gestureData.expressions) : [],
      handMovementKeys: gestureData.handMovements ? Object.keys(gestureData.handMovements) : [],
      headPoseKeys: gestureData.headPose ? Object.keys(gestureData.headPose) : []
    });

    const feedback = {
      eyeContact: {
        percentage: gestureData.eyeContact?.percentage || 0,
        rating: this.getEyeContactRating(gestureData.eyeContact?.percentage || 0),
        feedback: this.getEyeContactFeedback(gestureData.eyeContact?.percentage || 0)
      },
      expressions: {
        summary: this.getExpressionSummary(gestureData.expressions || {}),
        dominant: this.getDominantExpression(gestureData.expressions || {}),
        feedback: this.getExpressionFeedback(gestureData.expressions || {})
      },
      handMovements: {
        summary: this.getHandMovementSummary(gestureData.handMovements || {}),
        feedback: this.getHandMovementFeedback(gestureData.handMovements || {})
      },
      headPose: {
        summary: this.getHeadPoseSummary(gestureData.headPose || {}),
        feedback: this.getHeadPoseFeedback(gestureData.headPose || {})
      }
    };

    Logger.info('Generated gesture feedback structure', {
      hasEyeContact: !!feedback.eyeContact,
      hasExpressions: !!feedback.expressions,
      hasHandMovements: !!feedback.handMovements,
      hasHeadPose: !!feedback.headPose
    });

    return feedback;
  }

  getEyeContactRating(percentage) {
    if (percentage >= 70) return 'Excellent';
    if (percentage >= 50) return 'Good';
    if (percentage >= 30) return 'Fair';
    return 'Needs Improvement';
  }

  getEyeContactFeedback(percentage) {
    if (percentage >= 70) {
      return 'Excellent eye contact maintained throughout the interview. This demonstrates confidence and engagement.';
    } else if (percentage >= 50) {
      return 'Good eye contact overall. Consider maintaining more consistent eye contact with the camera.';
    } else if (percentage >= 30) {
      return 'Eye contact could be improved. Try to look at the camera more frequently to show engagement.';
    } else {
      return 'Low eye contact detected. Practice maintaining eye contact with the camera to show confidence and engagement.';
    }
  }

  getExpressionSummary(expressions) {
    const total = Object.values(expressions).reduce((sum, time) => sum + (time || 0), 0);
    if (total === 0) return 'No expression data available';
    
    const percentages = {};
    Object.entries(expressions).forEach(([expr, time]) => {
      percentages[expr] = ((time / total) * 100).toFixed(1);
    });
    
    return percentages;
  }

  getDominantExpression(expressions) {
    let maxTime = 0;
    let dominant = 'neutral';
    
    Object.entries(expressions).forEach(([expr, time]) => {
      if (time > maxTime) {
        maxTime = time;
        dominant = expr;
      }
    });
    
    return dominant;
  }

  getExpressionFeedback(expressions) {
    const dominant = this.getDominantExpression(expressions);
    const happyTime = expressions.happy || 0;
    const neutralTime = expressions.neutral || 0;
    const total = Object.values(expressions).reduce((sum, time) => sum + (time || 0), 0);
    
    if (total === 0) return 'No expression data available for analysis.';
    
    const happyPercentage = (happyTime / total) * 100;
    
    if (dominant === 'happy' && happyPercentage > 40) {
      return 'Positive and enthusiastic expressions throughout. Great energy!';
    } else if (dominant === 'neutral') {
      return 'Maintained a neutral expression. Consider adding more expressiveness to show enthusiasm.';
    } else {
      return `Predominantly ${dominant} expressions detected. Consider maintaining a more positive and engaged demeanor.`;
    }
  }

  getHandMovementSummary(handMovements) {
    const total = Object.values(handMovements).reduce((sum, count) => sum + (count || 0), 0);
    if (total === 0) return 'No hand movement data available';
    
    return {
      totalGestures: total,
      breakdown: handMovements
    };
  }

  getHandMovementFeedback(handMovements) {
    const fidgeting = handMovements.fidgeting || 0;
    const pointing = handMovements.pointing || 0;
    const total = Object.values(handMovements).reduce((sum, count) => sum + (count || 0), 0);
    
    if (total === 0) return 'No hand movement data available for analysis.';
    
    if (fidgeting > total * 0.3) {
      return 'Excessive fidgeting detected. Try to keep hand movements controlled and purposeful.';
    } else if (pointing > 0) {
      return 'Good use of hand gestures for emphasis. Maintain natural and controlled movements.';
    } else {
      return 'Hand movements were minimal. Natural gestures can help emphasize key points.';
    }
  }

  getHeadPoseSummary(headPose) {
    const total = Object.values(headPose).reduce((sum, count) => sum + (count || 0), 0);
    if (total === 0) return 'No head pose data available';
    
    return {
      totalChanges: total,
      breakdown: headPose
    };
  }

  getHeadPoseFeedback(headPose) {
    const forward = headPose.forward || 0;
    const away = (headPose.left || 0) + (headPose.right || 0) + (headPose.down || 0) + (headPose.up || 0);
    const total = Object.values(headPose).reduce((sum, count) => sum + (count || 0), 0);
    
    if (total === 0) return 'No head pose data available for analysis.';
    
    const forwardPercentage = (forward / total) * 100;
    
    if (forwardPercentage >= 70) {
      return 'Excellent head posture maintained. You kept your head forward and engaged throughout.';
    } else if (forwardPercentage >= 50) {
      return 'Good head posture overall. Try to maintain a forward-facing position more consistently.';
    } else {
      return 'Head posture could be improved. Avoid looking away from the camera frequently.';
    }
  }
}

module.exports = new HRFeedbackService();





