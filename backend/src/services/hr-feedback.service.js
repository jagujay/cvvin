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

      // Calculate comprehensive overall score with weighted components
      const scoreBreakdown = this.calculateComprehensiveScore(
        rubricScores,
        gestureFeedback,
        violationStats,
        qaPairs
      );
      
      report.overallScore = scoreBreakdown.overallScore;
      report.scoreBreakdown = scoreBreakdown.breakdown;
      
      // Generate comprehensive performance summary combining all aspects
      const proctoringFeedback = this.generateProctoringFeedback(violationStats);
      report.overallPerformanceSummary = this.generateComprehensivePerformanceSummary(
        qaPairs,
        textAnalyses,
        rubricScores,
        gestureFeedback,
        proctoringFeedback,
        scoreBreakdown.overallScore  // Use the comprehensive score
      );

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
    
    // Calculate average scores for recommendations
    const allScores = Object.values(rubricScores);
    const avgClarity = allScores.reduce((sum, s) => sum + (s.clarity || 0), 0) / Math.max(allScores.length, 1);
    const avgRelevance = allScores.reduce((sum, s) => sum + (s.relevance || 0), 0) / Math.max(allScores.length, 1);
    const avgConfidence = allScores.reduce((sum, s) => sum + (s.confidence || 0), 0) / Math.max(allScores.length, 1);
    const avgProfessionalism = allScores.reduce((sum, s) => sum + (s.professionalism || 0), 0) / Math.max(allScores.length, 1);
    
    // Generate recommendations based on scores
    const recommendations = [];
    
    if (avgClarity < 60) {
      recommendations.push({
        category: 'Communication Clarity',
        recommendation: 'Focus on articulating your thoughts more clearly. Practice explaining complex ideas in simple terms.',
        priority: 'high',
        reason: 'Clear communication is essential for effective interviews and workplace collaboration.'
      });
    }
    
    if (avgRelevance < 60) {
      recommendations.push({
        category: 'Answer Relevance',
        recommendation: 'Ensure your answers directly address the question asked. Use the STAR method (Situation, Task, Action, Result) to structure your responses.',
        priority: 'high',
        reason: 'Relevant answers demonstrate understanding and help interviewers assess your fit for the role.'
      });
    }
    
    if (avgConfidence < 60) {
      recommendations.push({
        category: 'Confidence',
        recommendation: 'Practice your responses to common interview questions. Record yourself to identify areas for improvement.',
        priority: 'medium',
        reason: 'Confidence in delivery makes your answers more convincing and memorable.'
      });
    }
    
    if (avgProfessionalism < 60) {
      recommendations.push({
        category: 'Professionalism',
        recommendation: 'Use professional language and avoid filler words. Maintain a formal yet conversational tone.',
        priority: 'medium',
        reason: 'Professional communication reflects your readiness for the workplace.'
      });
    }
    
    // Add general recommendations
    if (recommendations.length === 0) {
      recommendations.push({
        category: 'Overall Performance',
        recommendation: 'Continue practicing interview skills. Review common interview questions and prepare thoughtful responses.',
        priority: 'medium',
        reason: 'Consistent practice helps maintain and improve interview performance.'
      });
    }
    
    // Add proctoring-based recommendations
    if (proctoringFeedback && proctoringFeedback.totalCount > 5) {
      recommendations.push({
        category: 'Interview Environment',
        recommendation: 'Ensure a quiet, distraction-free environment for interviews. Test your setup beforehand.',
        priority: 'high',
        reason: 'A professional environment demonstrates preparedness and respect for the interview process.'
      });
    }
    
    return {
      summary: 'HR Interview Analysis - Your interview has been recorded and analyzed. Review the detailed feedback below to identify areas for improvement.',
      overallScore: Math.round((avgClarity + avgRelevance + avgConfidence + avgProfessionalism) / 4),
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
      strengths: this.generateStrengthsFromScores(rubricScores),
      areasForImprovement: this.generateAreasForImprovement(rubricScores),
      recommendations: recommendations,
      proctoringFeedback: proctoringFeedback
    };
  }
  
  generateStrengthsFromScores(rubricScores) {
    const strengths = [];
    const allScores = Object.values(rubricScores);
    
    const avgClarity = allScores.reduce((sum, s) => sum + (s.clarity || 0), 0) / Math.max(allScores.length, 1);
    const avgRelevance = allScores.reduce((sum, s) => sum + (s.relevance || 0), 0) / Math.max(allScores.length, 1);
    const avgConfidence = allScores.reduce((sum, s) => sum + (s.confidence || 0), 0) / Math.max(allScores.length, 1);
    const avgProfessionalism = allScores.reduce((sum, s) => sum + (s.professionalism || 0), 0) / Math.max(allScores.length, 1);
    
    if (avgClarity >= 70) strengths.push({ strength: 'Clear Communication', evidence: 'Your responses were well-articulated and easy to understand.' });
    if (avgRelevance >= 70) strengths.push({ strength: 'Relevant Answers', evidence: 'You consistently provided answers that directly addressed the questions.' });
    if (avgConfidence >= 70) strengths.push({ strength: 'Confident Delivery', evidence: 'You demonstrated confidence in your responses.' });
    if (avgProfessionalism >= 70) strengths.push({ strength: 'Professional Demeanor', evidence: 'You maintained a professional tone throughout the interview.' });
    
    if (strengths.length === 0) {
      strengths.push({ strength: 'Completion', evidence: 'You completed the interview and provided responses to all questions.' });
    }
    
    return strengths;
  }
  
  generateAreasForImprovement(rubricScores) {
    const areas = [];
    const allScores = Object.values(rubricScores);
    
    const avgClarity = allScores.reduce((sum, s) => sum + (s.clarity || 0), 0) / Math.max(allScores.length, 1);
    const avgRelevance = allScores.reduce((sum, s) => sum + (s.relevance || 0), 0) / Math.max(allScores.length, 1);
    const avgConfidence = allScores.reduce((sum, s) => sum + (s.confidence || 0), 0) / Math.max(allScores.length, 1);
    const avgProfessionalism = allScores.reduce((sum, s) => sum + (s.professionalism || 0), 0) / Math.max(allScores.length, 1);
    
    if (avgClarity < 60) areas.push({ area: 'Communication Clarity', impact: 'Unclear communication can make it difficult for interviewers to understand your qualifications.' });
    if (avgRelevance < 60) areas.push({ area: 'Answer Relevance', impact: 'Off-topic answers may suggest lack of focus or understanding of the question.' });
    if (avgConfidence < 60) areas.push({ area: 'Confidence', impact: 'Low confidence can undermine even strong qualifications.' });
    if (avgProfessionalism < 60) areas.push({ area: 'Professional Language', impact: 'Informal language may create doubts about workplace readiness.' });
    
    return areas;
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
    // Lenient thresholds for realistic interview scenarios
    if (percentage >= 70) return 'Excellent';
    if (percentage >= 50) return 'Good';
    if (percentage >= 30) return 'Fair';
    return 'Needs Improvement';
  }

  getEyeContactFeedback(percentage) {
    if (percentage >= 70) {
      return 'Excellent eye contact maintained throughout the interview. Your eyes were consistently focused on the camera, demonstrating strong confidence and engagement.';
    } else if (percentage >= 50) {
      return 'Good eye contact overall. You maintained focus on the camera most of the time. Try to minimize looking away to further improve engagement.';
    } else if (percentage >= 30) {
      return 'Fair eye contact. You looked at the camera occasionally, but there were frequent moments of looking away. Practice keeping your eyes focused on the camera lens to show better engagement.';
    } else {
      return 'Eye contact needs improvement. Try to maintain more consistent focus on the camera to show better engagement and confidence.';
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
    const sadTime = expressions.sad || 0;
    const angryTime = expressions.angry || 0;
    const fearfulTime = expressions.fearful || 0;
    const surprisedTime = expressions.surprised || 0;
    const total = Object.values(expressions).reduce((sum, time) => sum + (time || 0), 0);
    
    if (total === 0) return 'No expression data available for analysis.';
    
    // Calculate percentages
    const happyPercentage = (happyTime / total) * 100;
    const neutralPercentage = (neutralTime / total) * 100;
    const negativeTime = sadTime + angryTime + fearfulTime;
    const negativePercentage = (negativeTime / total) * 100;
    
    // CONTEXT-AWARE FEEDBACK FOR INTERVIEWS
    // In interviews, neutral/calm is GOOD, not bad!
    
    // Ideal: Mix of neutral (40-60%) and positive (20-40%)
    if (neutralPercentage >= 40 && neutralPercentage <= 70 && happyPercentage >= 15 && happyPercentage <= 40) {
      return 'Excellent balance of professional composure and positive engagement. Your expressions showed confidence and appropriate enthusiasm without being overly animated.';
    }
    
    // Too much happy (>70%) - may seem inauthentic
    else if (happyPercentage > 70) {
      return 'Very positive expressions throughout. While enthusiasm is good, excessive smiling (>70%) may appear less authentic. A balance of calm professionalism and genuine smiles is ideal for interviews.';
    }
    
    // Good neutral dominance (professional)
    else if (neutralPercentage > 60 && negativePercentage < 10) {
      return 'Maintained a calm and professional demeanor throughout. This shows composure and confidence. Consider adding occasional smiles when discussing achievements or positive topics to show more engagement.';
    }
    
    // Moderate happy with some neutral (good balance)
    else if (happyPercentage >= 30 && happyPercentage <= 60 && neutralPercentage >= 25) {
      return 'Good balance of positive expressions and professional composure. Your facial expressions showed appropriate engagement and confidence.';
    }
    
    // Too much negative emotion
    else if (negativePercentage > 20) {
      return `Detected ${negativePercentage.toFixed(0)}% negative expressions (sad, angry, or fearful). Try to maintain a more positive and confident demeanor. Practice relaxation techniques before interviews to reduce visible stress.`;
    }
    
    // Frozen expression (one emotion >80%)
    else if (neutralPercentage > 80 || happyPercentage > 80) {
      return 'Expression remained relatively unchanged throughout. While consistency is good, natural variation in expressions (responding to questions with appropriate emotion) can make you appear more engaged and authentic.';
    }
    
    // Default feedback
    else {
      return `Predominantly ${dominant} expressions detected. For interviews, aim for a balance of calm professionalism (40-60% neutral) with appropriate positive expressions (20-40% happy) when discussing achievements or interests.`;
    }
  }

  getHandMovementSummary(handMovements) {
    const total = Object.values(handMovements).reduce((sum, count) => sum + (count || 0), 0);
    
    // Always return an object structure for consistency
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
    
    // Always return an object structure for consistency
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

  /**
   * Calculate comprehensive overall score with weighted components
   * @param {Object} rubricScores - Rubric scores for each question
   * @param {Object} gestureFeedback - Gesture analysis feedback
   * @param {Object} violationStats - Proctoring violation statistics
   * @param {Array} qaPairs - Question-answer pairs
   * @returns {Object} Score breakdown and overall score
   */
  calculateComprehensiveScore(rubricScores, gestureFeedback, violationStats, qaPairs) {
    const breakdown = {};
    
    // 1. ANSWER QUALITY SCORE (40% weight) - Most important
    const questionScores = Object.values(rubricScores);
    let answerQualityScore = 0;
    
    if (questionScores.length > 0) {
      const avgClarity = questionScores.reduce((sum, s) => sum + (s.clarity || 0), 0) / questionScores.length;
      const avgRelevance = questionScores.reduce((sum, s) => sum + (s.relevance || 0), 0) / questionScores.length;
      const avgConfidence = questionScores.reduce((sum, s) => sum + (s.confidence || 0), 0) / questionScores.length;
      const avgProfessionalism = questionScores.reduce((sum, s) => sum + (s.professionalism || 0), 0) / questionScores.length;
      
      answerQualityScore = (avgClarity + avgRelevance + avgConfidence + avgProfessionalism) / 4;
    }
    
    breakdown.answerQuality = {
      score: Math.round(answerQualityScore),
      weight: 40,
      description: 'Clarity, relevance, confidence, and professionalism of answers'
    };
    
    // 2. COMMUNICATION FLUENCY SCORE (20% weight)
    let communicationScore = 70; // Default baseline
    let hasFluentData = false;
    
    // Check if we have fluency data from any Q&A pair
    if (qaPairs && qaPairs.length > 0) {
      let totalFillerRate = 0;
      let totalWPM = 0;
      let totalPauseRate = 0;
      let dataCount = 0;
      
      qaPairs.forEach(qa => {
        const transcription = qa.transcription;
        if (transcription && transcription.fluency_metrics) {
          hasFluentData = true;
          const metrics = transcription.fluency_metrics;
          
          // Filler word scoring (0-100, lower filler % = higher score)
          const fillerRate = metrics.filler_percentage || 0;
          let fillerScore = 100;
          if (fillerRate > 10) fillerScore = 50;
          else if (fillerRate > 7) fillerScore = 60;
          else if (fillerRate > 5) fillerScore = 70;
          else if (fillerRate > 3) fillerScore = 80;
          else if (fillerRate > 1) fillerScore = 90;
          
          // Speaking pace scoring (optimal 120-150 WPM)
          const wpm = metrics.words_per_minute || 120;
          let paceScore = 100;
          if (wpm < 80 || wpm > 180) paceScore = 60;
          else if (wpm < 100 || wpm > 160) paceScore = 75;
          else if (wpm < 110 || wpm > 150) paceScore = 85;
          else paceScore = 95;
          
          // Pause scoring (moderate pauses are good)
          const totalWords = metrics.total_words || 1;
          const pauseCount = metrics.pause_count || 0;
          const pauseRate = (pauseCount / totalWords) * 100;
          let pauseScore = 100;
          if (pauseRate > 40) pauseScore = 60;
          else if (pauseRate > 30) pauseScore = 70;
          else if (pauseRate > 20) pauseScore = 80;
          else if (pauseRate > 10) pauseScore = 90;
          
          totalFillerRate += fillerScore;
          totalWPM += paceScore;
          totalPauseRate += pauseScore;
          dataCount++;
        }
      });
      
      if (dataCount > 0) {
        communicationScore = (
          (totalFillerRate / dataCount) * 0.4 +  // 40% weight to fillers
          (totalWPM / dataCount) * 0.35 +        // 35% weight to pace
          (totalPauseRate / dataCount) * 0.25    // 25% weight to pauses
        );
      }
    }
    
    breakdown.communication = {
      score: Math.round(communicationScore),
      weight: 20,
      description: 'Speaking pace, filler words, and pause patterns',
      hasData: hasFluentData
    };
    
    // 3. NON-VERBAL COMMUNICATION SCORE (25% weight)
    let nonVerbalScore = 70; // Default baseline
    let hasGestureData = false;
    
    if (gestureFeedback) {
      hasGestureData = true;
      let eyeContactScore = 70;
      let expressionScore = 70;
      let gestureScore = 70;
      let postureScore = 70;
      
      // Eye contact scoring
      if (gestureFeedback.eyeContact) {
        const eyePct = gestureFeedback.eyeContact.percentage || 0;
        if (eyePct >= 80) eyeContactScore = 95;
        else if (eyePct >= 70) eyeContactScore = 90;
        else if (eyePct >= 60) eyeContactScore = 85;
        else if (eyePct >= 50) eyeContactScore = 75;
        else if (eyePct >= 40) eyeContactScore = 65;
        else if (eyePct >= 30) eyeContactScore = 55;
        else eyeContactScore = 40;
      }
      
      // Facial expression scoring
      if (gestureFeedback.expressions && gestureFeedback.expressions.summary) {
        const expressions = gestureFeedback.expressions.summary;
        const neutralPct = parseFloat(expressions.neutral) || 0;
        const happyPct = parseFloat(expressions.happy) || 0;
        const negativeTotal = (parseFloat(expressions.sad) || 0) + 
                             (parseFloat(expressions.angry) || 0) + 
                             (parseFloat(expressions.fearful) || 0);
        
        // Ideal: 40-70% neutral, 15-40% happy, <10% negative
        if (neutralPct >= 40 && neutralPct <= 70 && happyPct >= 15 && happyPct <= 40 && negativeTotal < 10) {
          expressionScore = 95;
        } else if (neutralPct >= 30 && neutralPct <= 80 && happyPct >= 10 && negativeTotal < 20) {
          expressionScore = 85;
        } else if (neutralPct >= 20 && negativeTotal < 30) {
          expressionScore = 75;
        } else if (negativeTotal > 40) {
          expressionScore = 50;
        } else {
          expressionScore = 70;
        }
      }
      
      // Hand gesture scoring
      if (gestureFeedback.handMovements && gestureFeedback.handMovements.summary) {
        const handSummary = gestureFeedback.handMovements.summary;
        const totalGestures = handSummary.totalGestures || 0;
        const breakdown = handSummary.breakdown || {};
        const fidgeting = breakdown.fidgeting || 0;
        
        if (totalGestures > 0) {
          const fidgetRate = (fidgeting / totalGestures) * 100;
          if (fidgetRate < 20 && totalGestures >= 10) gestureScore = 90;
          else if (fidgetRate < 30 && totalGestures >= 5) gestureScore = 80;
          else if (fidgetRate < 50) gestureScore = 70;
          else gestureScore = 60;
        }
      }
      
      // Head posture scoring
      if (gestureFeedback.headPose && gestureFeedback.headPose.summary) {
        const poseSummary = gestureFeedback.headPose.summary;
        const totalChanges = poseSummary.totalChanges || 0;
        const breakdown = poseSummary.breakdown || {};
        const forward = breakdown.forward || 0;
        
        if (totalChanges > 0) {
          const forwardPct = (forward / totalChanges) * 100;
          if (forwardPct >= 80) postureScore = 95;
          else if (forwardPct >= 70) postureScore = 85;
          else if (forwardPct >= 60) postureScore = 75;
          else if (forwardPct >= 50) postureScore = 65;
          else postureScore = 55;
        }
      }
      
      // Weighted average of non-verbal components
      nonVerbalScore = (
        eyeContactScore * 0.35 +    // 35% eye contact
        expressionScore * 0.30 +    // 30% expressions
        gestureScore * 0.20 +       // 20% hand gestures
        postureScore * 0.15         // 15% head posture
      );
    }
    
    breakdown.nonVerbal = {
      score: Math.round(nonVerbalScore),
      weight: 25,
      description: 'Eye contact, facial expressions, gestures, and posture',
      hasData: hasGestureData
    };
    
    // 4. PROFESSIONALISM & ENVIRONMENT SCORE (15% weight)
    let professionalismScore = 100; // Start at perfect
    
    if (violationStats && violationStats.totalCount) {
      const violations = violationStats.totalCount || 0;
      
      // Deduct points based on violations
      if (violations === 0) {
        professionalismScore = 100;
      } else if (violations <= 2) {
        professionalismScore = 90;
      } else if (violations <= 5) {
        professionalismScore = 75;
      } else if (violations <= 10) {
        professionalismScore = 60;
      } else if (violations <= 15) {
        professionalismScore = 45;
      } else {
        professionalismScore = 30;
      }
    }
    
    breakdown.professionalism = {
      score: professionalismScore,
      weight: 15,
      description: 'Professional environment and conduct',
      violations: violationStats?.totalCount || 0
    };
    
    // CALCULATE WEIGHTED OVERALL SCORE
    const overallScore = Math.round(
      (breakdown.answerQuality.score * breakdown.answerQuality.weight / 100) +
      (breakdown.communication.score * breakdown.communication.weight / 100) +
      (breakdown.nonVerbal.score * breakdown.nonVerbal.weight / 100) +
      (breakdown.professionalism.score * breakdown.professionalism.weight / 100)
    );
    
    return {
      overallScore: Math.max(0, Math.min(100, overallScore)), // Clamp between 0-100
      breakdown: breakdown
    };
  }

  /**
   * Generate comprehensive performance summary combining all aspects of the interview
   * @param {Array} qaPairs - Question-answer pairs
   * @param {Object} textAnalyses - Text analysis results
   * @param {Object} rubricScores - Rubric scores
   * @param {Object} gestureFeedback - Gesture analysis feedback
   * @param {Object} proctoringFeedback - Proctoring feedback
   * @param {number} avgScore - Average overall score
   * @returns {string} Comprehensive summary
   */
  generateComprehensivePerformanceSummary(qaPairs, textAnalyses, rubricScores, gestureFeedback, proctoringFeedback, avgScore) {
    const summaryParts = [];
    
    // 1. OVERALL PERFORMANCE ASSESSMENT
    let performanceLevel = 'satisfactory';
    if (avgScore >= 80) performanceLevel = 'excellent';
    else if (avgScore >= 70) performanceLevel = 'very good';
    else if (avgScore >= 60) performanceLevel = 'good';
    else if (avgScore < 50) performanceLevel = 'needs improvement';
    
    summaryParts.push(`Your overall HR interview performance was ${performanceLevel} with a score of ${Math.round(avgScore)}%.`);
    
    // 2. ANSWER QUALITY ANALYSIS
    const answerQualityInsights = this.analyzeAnswerQuality(qaPairs, textAnalyses, rubricScores);
    if (answerQualityInsights) {
      summaryParts.push(answerQualityInsights);
    }
    
    // 3. COMMUNICATION STYLE (Fillers & Pauses)
    const communicationInsights = this.analyzeCommunicationStyle(textAnalyses);
    if (communicationInsights) {
      summaryParts.push(communicationInsights);
    }
    
    // 4. NON-VERBAL COMMUNICATION (Gestures & Expressions)
    const nonVerbalInsights = this.analyzeNonVerbalCommunication(gestureFeedback);
    if (nonVerbalInsights) {
      summaryParts.push(nonVerbalInsights);
    }
    
    // 5. PROFESSIONALISM & CONDUCT (Proctoring)
    const professionalismInsights = this.analyzeProfessionalism(proctoringFeedback);
    if (professionalismInsights) {
      summaryParts.push(professionalismInsights);
    }
    
    // 6. KEY STRENGTHS (Top 2-3)
    const strengths = this.identifyKeyStrengths(rubricScores, gestureFeedback, proctoringFeedback);
    if (strengths.length > 0) {
      summaryParts.push(`Key strengths: ${strengths.join(', ')}.`);
    }
    
    // 7. PRIORITY IMPROVEMENTS (Top 2-3)
    const improvements = this.identifyPriorityImprovements(rubricScores, gestureFeedback, proctoringFeedback);
    if (improvements.length > 0) {
      summaryParts.push(`Areas to focus on: ${improvements.join(', ')}.`);
    }
    
    return summaryParts.join(' ');
  }

  /**
   * Analyze answer quality (length, structure, relevance, word choice)
   */
  analyzeAnswerQuality(qaPairs, textAnalyses, rubricScores) {
    const insights = [];
    
    // Calculate averages
    const allScores = Object.values(rubricScores);
    if (allScores.length === 0) return null;
    
    const avgClarity = allScores.reduce((sum, s) => sum + (s.clarity || 0), 0) / allScores.length;
    const avgRelevance = allScores.reduce((sum, s) => sum + (s.relevance || 0), 0) / allScores.length;
    
    // Analyze answer lengths
    const answerLengths = qaPairs.map(qa => {
      const text = typeof qa.transcription === 'string' ? qa.transcription : qa.transcription?.text || '';
      return text.split(/\s+/).length;
    });
    const avgLength = answerLengths.reduce((sum, len) => sum + len, 0) / Math.max(answerLengths.length, 1);
    
    // Length assessment
    if (avgLength < 30) {
      insights.push('Your answers were quite brief (averaging ' + Math.round(avgLength) + ' words)');
    } else if (avgLength > 150) {
      insights.push('Your answers were detailed and comprehensive (averaging ' + Math.round(avgLength) + ' words)');
    } else {
      insights.push('Your answers were well-structured with appropriate length (averaging ' + Math.round(avgLength) + ' words)');
    }
    
    // Relevance assessment
    if (avgRelevance >= 70) {
      insights.push('and directly addressed the questions asked');
    } else if (avgRelevance >= 50) {
      insights.push('though some answers could be more focused on the specific questions');
    } else {
      insights.push('but many answers lacked direct relevance to the questions - consider using the STAR method for structured responses');
    }
    
    // Clarity assessment
    if (avgClarity >= 70) {
      insights.push('with clear articulation and professional language');
    } else if (avgClarity >= 50) {
      insights.push('with generally clear communication, though some responses could be more articulate');
    } else {
      insights.push('however, clarity of expression needs improvement - practice explaining your thoughts more concisely');
    }
    
    return insights.join(' ') + '.';
  }

  /**
   * Analyze communication style (fillers, pauses, speaking speed)
   */
  analyzeCommunicationStyle(textAnalyses) {
    const insights = [];
    
    // Aggregate fluency data
    let totalFillers = 0;
    let totalPauses = 0;
    let totalWords = 0;
    let totalDuration = 0;
    let hasData = false;
    
    Object.values(textAnalyses).forEach(analysis => {
      if (analysis.fluency_metrics || analysis.fluency?.metrics) {
        hasData = true;
        const metrics = analysis.fluency_metrics || analysis.fluency?.metrics || {};
        totalFillers += metrics.filler_count || 0;
        totalPauses += metrics.pause_count || 0;
        totalWords += metrics.total_words || 0;
        totalDuration += metrics.duration || 0;
      }
    });
    
    if (!hasData || totalWords === 0) return null;
    
    // Calculate rates
    const fillerRate = (totalFillers / totalWords) * 100;
    const wordsPerMinute = totalDuration > 0 ? (totalWords / (totalDuration / 60)) : 0;
    
    // Speaking pace assessment
    if (wordsPerMinute > 0) {
      if (wordsPerMinute < 100) {
        insights.push('Your speaking pace was slow and measured');
      } else if (wordsPerMinute > 160) {
        insights.push('Your speaking pace was quite fast');
      } else {
        insights.push('Your speaking pace was well-balanced');
      }
    }
    
    // Filler words assessment
    if (fillerRate < 2) {
      insights.push('with minimal filler words, demonstrating confidence');
    } else if (fillerRate < 5) {
      insights.push('with occasional filler words, which is natural in conversation');
    } else {
      insights.push('though you used frequent filler words (' + totalFillers + ' instances) - practice pausing instead of using "um," "uh," etc.');
    }
    
    // Pauses assessment
    if (totalPauses > totalWords * 0.3) {
      insights.push('You took many pauses, which may indicate hesitation - consider preparing key points in advance.');
    } else if (totalPauses > totalWords * 0.15) {
      insights.push('Your pauses were well-placed for emphasis and clarity.');
    }
    
    return insights.length > 0 ? insights.join(' ') + '.' : null;
  }

  /**
   * Analyze non-verbal communication (gestures, expressions, eye contact)
   */
  analyzeNonVerbalCommunication(gestureFeedback) {
    if (!gestureFeedback) return null;
    
    const insights = [];
    
    // Eye contact
    const eyeContactPct = gestureFeedback.eyeContact?.percentage || 0;
    if (eyeContactPct >= 70) {
      insights.push('You maintained excellent eye contact with the camera');
    } else if (eyeContactPct >= 50) {
      insights.push('You maintained good eye contact');
    } else if (eyeContactPct >= 30) {
      insights.push('Your eye contact was fair but could be improved');
    } else {
      insights.push('Eye contact needs significant improvement - practice looking directly at the camera');
    }
    
    // Facial expressions
    const expressions = gestureFeedback.expressions?.summary || {};
    const dominant = gestureFeedback.expressions?.dominant || 'neutral';
    
    if (typeof expressions === 'object' && Object.keys(expressions).length > 0) {
      const neutralPct = parseFloat(expressions.neutral) || 0;
      const happyPct = parseFloat(expressions.happy) || 0;
      
      if (neutralPct >= 50 && happyPct >= 15 && happyPct <= 40) {
        insights.push('showing a professional balance of calm composure and positive engagement');
      } else if (neutralPct > 70) {
        insights.push('with a very calm and composed demeanor - consider showing more varied expressions to demonstrate engagement');
      } else if (happyPct > 60) {
        insights.push('with enthusiastic expressions - ensure they appear natural and context-appropriate');
      } else {
        insights.push('with ' + dominant + ' expressions predominantly');
      }
    }
    
    // Hand gestures
    const handMovements = gestureFeedback.handMovements?.summary;
    if (handMovements && typeof handMovements === 'object') {
      const totalGestures = handMovements.totalGestures || 0;
      const breakdown = handMovements.breakdown || {};
      const fidgeting = breakdown.fidgeting || 0;
      
      if (totalGestures > 0) {
        if (fidgeting > totalGestures * 0.5) {
          insights.push('though excessive fidgeting was detected - try to keep hand movements purposeful');
        } else if (totalGestures > 20) {
          insights.push('with natural hand gestures that emphasized your points');
        }
      }
    }
    
    // Head posture
    const headPose = gestureFeedback.headPose?.summary;
    if (headPose && typeof headPose === 'object') {
      const breakdown = headPose.breakdown || {};
      const forward = breakdown.forward || 0;
      const totalChanges = headPose.totalChanges || 0;
      
      if (totalChanges > 0) {
        const forwardPct = (forward / totalChanges) * 100;
        if (forwardPct >= 70) {
          insights.push('and maintained good head posture throughout');
        } else if (forwardPct < 50) {
          insights.push('though head posture could be improved - try to face the camera more consistently');
        }
      }
    }
    
    return insights.length > 0 ? insights.join(', ') + '.' : null;
  }

  /**
   * Analyze professionalism based on proctoring data
   */
  analyzeProfessionalism(proctoringFeedback) {
    if (!proctoringFeedback || !proctoringFeedback.totalCount) return null;
    
    const totalViolations = proctoringFeedback.totalCount || 0;
    const severity = proctoringFeedback.severity || 'none';
    
    if (totalViolations === 0 || severity === 'none') {
      return 'You maintained a professional environment throughout the interview with no distractions or violations.';
    } else if (severity === 'low') {
      return 'You maintained a mostly professional environment with only minor distractions (' + totalViolations + ' minor issues detected).';
    } else if (severity === 'medium') {
      return 'There were some environmental distractions during the interview (' + totalViolations + ' issues) - ensure a quiet, private space for future interviews.';
    } else {
      return 'Multiple significant violations were detected (' + totalViolations + ' issues) - it\'s crucial to maintain a professional, distraction-free environment for interviews.';
    }
  }

  /**
   * Identify key strengths from all data
   */
  identifyKeyStrengths(rubricScores, gestureFeedback, proctoringFeedback) {
    const strengths = [];
    
    // Calculate averages
    const allScores = Object.values(rubricScores);
    if (allScores.length > 0) {
      const avgClarity = allScores.reduce((sum, s) => sum + (s.clarity || 0), 0) / allScores.length;
      const avgRelevance = allScores.reduce((sum, s) => sum + (s.relevance || 0), 0) / allScores.length;
      const avgConfidence = allScores.reduce((sum, s) => sum + (s.confidence || 0), 0) / allScores.length;
      const avgProfessionalism = allScores.reduce((sum, s) => sum + (s.professionalism || 0), 0) / allScores.length;
      
      // Top scoring areas
      const scores = [
        { name: 'clear communication', value: avgClarity },
        { name: 'relevant answers', value: avgRelevance },
        { name: 'confident delivery', value: avgConfidence },
        { name: 'professional language', value: avgProfessionalism }
      ];
      
      scores.sort((a, b) => b.value - a.value);
      
      // Add top 2 if they're good (>70)
      if (scores[0].value >= 70) strengths.push(scores[0].name);
      if (scores[1].value >= 70) strengths.push(scores[1].name);
    }
    
    // Eye contact strength
    if (gestureFeedback?.eyeContact?.percentage >= 70) {
      strengths.push('strong eye contact');
    }
    
    // Professional environment
    if (!proctoringFeedback?.totalCount || proctoringFeedback.totalCount === 0) {
      strengths.push('professional interview environment');
    }
    
    return strengths.slice(0, 3); // Top 3 strengths
  }

  /**
   * Identify priority improvements from all data
   */
  identifyPriorityImprovements(rubricScores, gestureFeedback, proctoringFeedback) {
    const improvements = [];
    
    // Calculate averages
    const allScores = Object.values(rubricScores);
    if (allScores.length > 0) {
      const avgClarity = allScores.reduce((sum, s) => sum + (s.clarity || 0), 0) / allScores.length;
      const avgRelevance = allScores.reduce((sum, s) => sum + (s.relevance || 0), 0) / allScores.length;
      const avgConfidence = allScores.reduce((sum, s) => sum + (s.confidence || 0), 0) / allScores.length;
      const avgProfessionalism = allScores.reduce((sum, s) => sum + (s.professionalism || 0), 0) / allScores.length;
      
      // Areas needing improvement (<60)
      const areas = [
        { name: 'communication clarity', value: avgClarity },
        { name: 'answer relevance', value: avgRelevance },
        { name: 'confidence', value: avgConfidence },
        { name: 'professional language', value: avgProfessionalism }
      ];
      
      areas.sort((a, b) => a.value - b.value);
      
      // Add bottom 2 if they need work (<60)
      if (areas[0].value < 60) improvements.push(areas[0].name);
      if (areas[1].value < 60 && improvements.length < 3) improvements.push(areas[1].name);
    }
    
    // Eye contact improvement
    if (gestureFeedback?.eyeContact?.percentage < 50) {
      improvements.push('eye contact');
    }
    
    // Environment improvement
    if (proctoringFeedback?.totalCount > 5) {
      improvements.push('interview environment setup');
    }
    
    return improvements.slice(0, 3); // Top 3 priorities
  }
}

module.exports = new HRFeedbackService();





