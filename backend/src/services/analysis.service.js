const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const Logger = require('../utils/logger.utils');

/**
 * Analysis Service
 * Handles resume analysis by calling Python Ollama service
 */
class AnalysisService {
  constructor() {
    // Path to Python script
    this.pythonScriptPath = path.join(__dirname, 'resume-analyzer', 'resume_analyzer.py');
    // Timeout for analysis (60 seconds)
    this.analysisTimeout = 60000;
  }

  /**
   * Check if Python script exists
   */
  async checkPythonScript() {
    try {
      await fs.access(this.pythonScriptPath);
      return true;
    } catch (error) {
      Logger.error('Python script not found', { path: this.pythonScriptPath });
      return false;
    }
  }

  /**
   * Call Python analyzer script
   * @param {string} pdfPath - Path to PDF file
   * @param {string} jobDescription - Job description text
   * @returns {Promise<Object>} Analysis result from Ollama
   */
  async callPythonAnalyzer(pdfPath, jobDescription) {
    return new Promise((resolve, reject) => {
      // Check if Python script exists
      if (!this.checkPythonScript()) {
        reject(new Error('Python analyzer script not found'));
        return;
      }

      // Resolve absolute path to PDF
      let absolutePdfPath;
      if (path.isAbsolute(pdfPath)) {
        absolutePdfPath = pdfPath;
      } else {
        // Relative path from project root
        absolutePdfPath = path.join(process.cwd(), pdfPath.replace(/^\//, ''));
      }

      // Check if PDF exists
      fs.access(absolutePdfPath)
        .then(() => {
          // Spawn Python process
          const python = spawn('python', [
            this.pythonScriptPath,
            absolutePdfPath,
            jobDescription
          ], {
            cwd: path.dirname(this.pythonScriptPath)
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
                Logger.error('Failed to parse Python output', {
                  error: parseError.message,
                  stdout: stdout.substring(0, 500),
                  stderr: stderr
                });
                reject(new Error('Failed to parse analysis result'));
              }
            } else {
              Logger.error('Python script failed', {
                code,
                stderr: stderr,
                stdout: stdout.substring(0, 500)
              });
              reject(new Error(`Analysis failed: ${stderr || 'Unknown error'}`));
            }
          });

          // Handle process errors
          python.on('error', (error) => {
            Logger.error('Failed to spawn Python process', { error: error.message });
            reject(new Error(`Failed to start analysis: ${error.message}. Make sure Python is installed.`));
          });

          // Set timeout
          const timeout = setTimeout(() => {
            python.kill();
            reject(new Error('Analysis timeout: Process took too long'));
          }, this.analysisTimeout);

          python.on('close', () => {
            clearTimeout(timeout);
          });
        })
        .catch((error) => {
          reject(new Error(`PDF file not found: ${absolutePdfPath}`));
        });
    });
  }

  /**
   * Transform Ollama response to frontend format
   * @param {Object} ollamaResult - Result from Ollama
   * @param {string} jobDescription - Original job description
   * @param {number} processingTime - Processing time in seconds
   * @returns {Object} Transformed result for frontend
   */
  transformAnalysisResult(ollamaResult, jobDescription, processingTime) {
    try {
      // Extract job description info (simple parsing)
      const jdLines = jobDescription.split('\n').filter(line => line.trim());
      const titleMatch = jobDescription.match(/(?:Senior|Junior|Lead|Principal)?\s*(\w+\s+\w+)/i);
      const title = titleMatch ? titleMatch[0] : 'Job Position';
      
      // Transform skill analysis
      const matchedSkills = (ollamaResult.skillAnalysis?.matchedSkills || []).map(skill => ({
        skill: typeof skill === 'string' ? skill : skill.name || skill,
        resumeMatch: true,
        jdMatch: true,
        proficiency: skill.proficiency || 'Intermediate',
        yearsExperience: skill.yearsExperience || 0,
        strength: skill.strength || 'medium'
      }));

      const missingSkills = (ollamaResult.skillAnalysis?.missingSkills || []).map(skill => ({
        skill: typeof skill === 'string' ? skill : skill.name || skill,
        importance: skill.importance || 'medium',
        recommendation: skill.recommendation || `Consider learning ${typeof skill === 'string' ? skill : skill.name || skill}`
      }));

      // Transform strengths
      const strengths = (ollamaResult.strengths || []).map(strength => ({
        category: strength.category || 'General',
        description: strength.evidence || strength.strength || strength,
        impact: strength.impact || 'medium'
      }));

      // Transform recommendations
      const recommendations = (ollamaResult.suggestions || []).map((suggestion, index) => ({
        type: 'skill_development',
        title: typeof suggestion === 'string' ? `Recommendation ${index + 1}` : suggestion.title || 'Improvement',
        description: typeof suggestion === 'string' ? suggestion : suggestion.description || suggestion,
        priority: suggestion.priority || 'medium',
        timeEstimate: suggestion.timeEstimate || '2-4 weeks'
      }));

      // Calculate match percentage (use overallScore or estimate)
      const matchPercentage = ollamaResult.overallScore || 75;

      // Transform ATS compliance
      const atsCompatibility = {
        score: ollamaResult.atsCompliance?.score || 75,
        issues: ollamaResult.atsCompliance?.issues || [],
        improvements: ollamaResult.atsCompliance?.suggestions || []
      };

      return {
        overallScore: ollamaResult.overallScore || 75,
        matchPercentage: matchPercentage,
        processingTime: processingTime,
        summary: ollamaResult.summary || 'Analysis completed',
        analysisDate: new Date().toISOString(),
        jobDescription: {
          title: title,
          company: 'Not specified',
          location: 'Not specified',
          extractedSkills: ollamaResult.skillAnalysis?.requiredSkills || [],
          experienceRequired: ollamaResult.experienceAnalysis?.requiredYears || 'Not specified',
          educationRequired: 'Not specified'
        },
        matchedSkills: matchedSkills,
        missingSkills: missingSkills,
        strengths: strengths,
        improvements: recommendations.map(rec => ({
          category: 'Skills Enhancement',
          priority: rec.priority,
          suggestions: [rec.description]
        })),
        recommendations: recommendations,
        atsCompatibility: atsCompatibility
      };
    } catch (error) {
      Logger.error('Failed to transform analysis result', { error: error.message });
      throw new Error('Failed to transform analysis result');
    }
  }

  /**
   * Analyze resume against job description
   * @param {string} pdfPath - Path to PDF file
   * @param {string} jobDescription - Job description text
   * @returns {Promise<Object>} Transformed analysis result
   */
  async analyzeResume(pdfPath, jobDescription) {
    const startTime = Date.now();
    
    try {
      // Check if Python script exists
      const scriptExists = await this.checkPythonScript();
      if (!scriptExists) {
        throw new Error('Python analyzer script not found. Please ensure resume-analyzer service is set up.');
      }

      // Call Python analyzer
      const ollamaResult = await this.callPythonAnalyzer(pdfPath, jobDescription);
      
      // Calculate processing time
      const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
      
      // Transform result
      const transformedResult = this.transformAnalysisResult(
        ollamaResult,
        jobDescription,
        parseFloat(processingTime)
      );
      
      Logger.info('Resume analysis completed', {
        processingTime: processingTime,
        overallScore: transformedResult.overallScore
      });
      
      return transformedResult;
    } catch (error) {
      Logger.error('Resume analysis failed', { error: error.message });
      throw error;
    }
  }
}

module.exports = AnalysisService;

