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
    // Timeout for analysis (180 seconds / 3 minutes - Ollama can be slow)
    this.analysisTimeout = 180000;
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
   * Extract text from PDF file
   * @param {string} pdfPath - Path to PDF file
   * @returns {Promise<string>} Extracted text
   */
  async extractResumeText(pdfPath) {
    return new Promise((resolve, reject) => {
      // Use Python to extract text (reusing the extraction logic)
      const extractScript = `
import sys
import fitz  # PyMuPDF

def extract_text_from_pdf(pdf_path):
    try:
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return None

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("ERROR: Usage: python <script> <pdf_path>", file=sys.stderr)
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    text = extract_text_from_pdf(pdf_path)
    if text:
        print(text)
    else:
        sys.exit(1)
`;

      // Resolve absolute path to PDF
      let absolutePdfPath;
      if (path.isAbsolute(pdfPath)) {
        absolutePdfPath = pdfPath;
      } else {
        absolutePdfPath = path.join(process.cwd(), pdfPath.replace(/^\//, ''));
      }

      // Create a temporary Python script
      const tempScriptPath = path.join(__dirname, 'resume-analyzer', 'extract_text_temp.py');
      
      fs.writeFile(tempScriptPath, extractScript)
        .then(() => {
          // Spawn Python process
          const python = spawn('python', [tempScriptPath, absolutePdfPath], {
            cwd: path.dirname(this.pythonScriptPath)
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
            // Clean up temp script
            fs.unlink(tempScriptPath).catch(() => {});
            
            if (code === 0) {
              resolve(stdout.trim());
            } else {
              Logger.warn('Failed to extract text from PDF', { stderr });
              resolve(''); // Return empty string instead of failing
            }
          });

          python.on('error', (error) => {
            fs.unlink(tempScriptPath).catch(() => {});
            Logger.warn('Failed to spawn Python process for text extraction', { error: error.message });
            resolve(''); // Return empty string instead of failing
          });
        })
        .catch((error) => {
          Logger.warn('Failed to create temp extraction script', { error: error.message });
          resolve(''); // Return empty string instead of failing
        });
    });
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
        strength: skill.strength || 'medium',
        evidence: skill.evidence || ''
      }));

      const missingSkills = (ollamaResult.skillAnalysis?.missingSkills || []).map(skill => ({
        skill: typeof skill === 'string' ? skill : skill.name || skill,
        importance: skill.importance || 'medium',
        recommendation: skill.recommendation || `Consider learning ${typeof skill === 'string' ? skill : skill.name || skill}`
      }));

      const extraSkills = (ollamaResult.skillAnalysis?.extraSkills || []).map(skill => ({
        skill: typeof skill === 'string' ? skill : skill.name || skill,
        value: skill.value || 'Additional skill that may be valuable',
        relevance: skill.relevance || 'medium'
      }));

      // Transform strengths
      const strengths = (ollamaResult.strengths || []).map(strength => ({
        category: strength.category || 'General',
        description: strength.evidence || strength.strength || strength,
        impact: strength.impact || 'medium'
      }));

      // Transform recommendations (beginner-friendly)
      const recommendations = (ollamaResult.suggestions || []).map((suggestion, index) => ({
        type: 'skill_development',
        title: typeof suggestion === 'string' ? `Recommendation ${index + 1}` : suggestion.title || 'Improvement',
        description: typeof suggestion === 'string' ? suggestion : suggestion.description || suggestion,
        priority: suggestion.priority || 'medium',
        timeEstimate: suggestion.timeEstimate || '2-4 weeks',
        difficulty: suggestion.difficulty || 'beginner'
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
        extraSkills: extraSkills,
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
   * Generate mock analysis result (for development/testing)
   * @param {string} jobDescription - Job description text
   * @returns {Object} Mock analysis result
   */
  generateMockAnalysis(jobDescription) {
    return {
      overallScore: 78,
      matchPercentage: 78,
      processingTime: 2.5,
      summary: "Strong match with relevant experience and skills. Some areas for improvement identified.",
      analysisDate: new Date().toISOString(),
      jobDescription: {
        title: "Software Engineer",
        company: "Tech Company",
        location: "Remote",
        extractedSkills: ["JavaScript", "React", "Node.js", "Python", "SQL"],
        experienceRequired: "3-5 years",
        educationRequired: "Bachelor's in Computer Science or related field"
      },
      matchedSkills: [
        { skill: "JavaScript", resumeMatch: true, jdMatch: true, proficiency: "Advanced", yearsExperience: 4, strength: "high", evidence: "4 years of professional experience" },
        { skill: "React", resumeMatch: true, jdMatch: true, proficiency: "Advanced", yearsExperience: 3, strength: "high", evidence: "Built multiple production applications" },
        { skill: "Node.js", resumeMatch: true, jdMatch: true, proficiency: "Intermediate", yearsExperience: 2, strength: "medium", evidence: "Backend development experience" }
      ],
      missingSkills: [
        { skill: "Python", importance: "medium", recommendation: "Consider taking an online Python course to strengthen backend skills" },
        { skill: "Docker", importance: "medium", recommendation: "Learn containerization basics through Docker tutorials" }
      ],
      extraSkills: [
        { skill: "TypeScript", value: "Adds type safety to JavaScript projects", relevance: "high" },
        { skill: "Git", value: "Essential for version control", relevance: "high" }
      ],
      strengths: [
        { category: "Technical Skills", description: "Strong frontend development experience with modern frameworks", impact: "high" },
        { category: "Experience", description: "Relevant work experience in similar roles", impact: "high" }
      ],
      improvements: [
        { category: "Skills Enhancement", description: "Learn Python for backend development", priority: "medium", timeEstimate: "2-4 weeks", difficulty: "beginner" },
        { category: "Skills Enhancement", description: "Get familiar with containerization using Docker", priority: "medium", timeEstimate: "1-2 weeks", difficulty: "beginner" }
      ],
      recommendations: [
        { type: "skill_development", title: "Backend Skills", description: "Expand your backend knowledge by learning Python", priority: "medium", timeEstimate: "2-4 weeks", difficulty: "beginner" },
        { type: "skill_development", title: "DevOps Basics", description: "Learn Docker and containerization fundamentals", priority: "medium", timeEstimate: "1-2 weeks", difficulty: "beginner" }
      ],
      atsCompatibility: {
        score: 82,
        issues: ["Consider adding more keywords from the job description", "Format could be more ATS-friendly"],
        improvements: ["Add a skills section with bullet points", "Use standard section headings", "Include relevant keywords naturally"]
      }
    };
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
      // Check for mock mode (for development/testing when Ollama is slow)
      if (process.env.USE_MOCK_RESUME_ANALYSIS === 'true') {
        Logger.info('Using mock resume analysis (development mode)');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing
        return this.generateMockAnalysis(jobDescription);
      }

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
