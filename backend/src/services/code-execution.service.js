const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Logger = require('../utils/logger.utils');

/**
 * Code Execution Service
 * Executes code in Docker containers for multiple languages
 */
class CodeExecutionService {
  constructor() {
    // Create temp directory for code files
    this.tempDir = path.join(process.cwd(), 'temp', 'code-execution');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    
    // Execution timeout (5 seconds)
    this.executionTimeout = 5000;
    
    // Language configurations
    this.languageConfig = {
      python: {
        extension: 'py',
        image: 'python:3.9-slim',
        command: 'python /app/main.py'
      },
      javascript: {
        extension: 'js',
        image: 'node:18-slim',
        command: 'node /app/main.js'
      },
      java: {
        extension: 'java',
        image: 'openjdk:11',
        command: 'javac /app/Main.java && java -cp /app Main',
        fileName: 'Main.java'
      },
      c: {
        extension: 'c',
        image: 'gcc:latest',
        command: 'gcc /app/main.c -o /app/a.out && /app/a.out'
      },
      cpp: {
        extension: 'cpp',
        image: 'gcc:latest',
        command: 'g++ /app/main.cpp -o /app/a.out && /app/a.out'
      }
    };
  }

  /**
   * Run code in Docker container
   * @param {string} code - Source code to execute
   * @param {string} language - Programming language
   * @param {string} stdin - Input for the program
   * @returns {Promise<Object>} Execution result
   */
  async runCodeInDocker(code, language, stdin = '') {
    return new Promise((resolve, reject) => {
      const config = this.languageConfig[language];
      if (!config) {
        return reject(new Error(`Unsupported language: ${language}`));
      }

      const uniqueId = uuidv4();
      const fileName = config.fileName || `main.${config.extension}`;
      const codeFilePath = path.join(this.tempDir, `${uniqueId}.${config.extension}`);

      try {
        // Write code to file
        fs.writeFileSync(codeFilePath, code);

        // Build Docker command
        const dockerCommand = `docker run --rm -i --memory="256m" --cpus="0.5" -v "${codeFilePath}:/app/${fileName}" ${config.image} /bin/sh -c "${config.command}"`;

        const child = exec(dockerCommand, { timeout: this.executionTimeout }, (error, stdout, stderr) => {
          // Clean up file
          try {
            if (fs.existsSync(codeFilePath)) {
              fs.unlinkSync(codeFilePath);
            }
          } catch (cleanupError) {
            Logger.error('Failed to cleanup code file', { error: cleanupError.message });
          }

          if (error) {
            // Handle timeout or execution errors
            if (error.signal === 'SIGTERM' || error.code === 'TIMEOUT') {
              reject(new Error('Execution timeout: Code took too long to execute'));
            } else {
              reject(new Error(stderr || error.message || 'Execution failed'));
            }
          } else {
            resolve({
              output: stdout.trim(),
              errors: stderr ? stderr.trim() : null
            });
          }
        });

        // Write stdin to process
        if (stdin) {
          child.stdin.write(stdin);
        }
        child.stdin.end();

      } catch (error) {
        // Clean up file on error
        try {
          if (fs.existsSync(codeFilePath)) {
            fs.unlinkSync(codeFilePath);
          }
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
        reject(new Error(`Failed to execute code: ${error.message}`));
      }
    });
  }

  /**
   * Normalize output for comparison (handles different formats)
   * @param {string} output - Program output
   * @returns {string} Normalized output
   */
  normalizeOutput(output) {
    if (!output) return '';
    
    // Remove extra whitespace and newlines
    return output
      .trim()
      .split(/\s+/)
      .map(n => n.trim())
      .filter(Boolean)
      .join(' ');
  }

  /**
   * Normalize array output (for Two Sum problem)
   * @param {string} output - Program output
   * @returns {string} Normalized array output
   */
  normalizeArrayOutput(output) {
    if (!output) return '';
    
    try {
      // Try to parse as JSON array
      const parsed = JSON.parse(output);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => a - b).join(',');
      }
    } catch (e) {
      // Not JSON, try to extract numbers
    }
    
    // Extract numbers and sort
    const numbers = output
      .split(/[,\s\[\]]+/)
      .map(n => n.trim())
      .filter(n => n !== '' && !isNaN(n))
      .map(Number)
      .sort((a, b) => a - b);
    
    return numbers.join(',');
  }

  /**
   * Compare outputs (flexible comparison for arrays/numbers)
   * @param {string} actual - Actual output
   * @param {string} expected - Expected output
   * @param {boolean} isArray - Whether output is an array
   * @returns {boolean} True if outputs match
   */
  compareOutputs(actual, expected, isArray = false) {
    if (isArray) {
      const normalizedActual = this.normalizeArrayOutput(actual);
      const normalizedExpected = this.normalizeArrayOutput(expected);
      return normalizedActual === normalizedExpected;
    }
    
    const normalizedActual = this.normalizeOutput(actual);
    const normalizedExpected = this.normalizeOutput(expected);
    return normalizedActual === normalizedExpected;
  }

  /**
   * Execute code against test cases
   * @param {string} code - Source code
   * @param {string} language - Programming language
   * @param {Array} testCases - Array of test cases
   * @returns {Promise<Object>} Test results
   */
  async executeTestCases(code, language, testCases) {
    const results = {
      passed: 0,
      total: testCases.length,
      cases: [],
      allPassed: false
    };

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      
      try {
        // Format input based on problem type
        // For Two Sum: target on first line, comma-separated numbers on second line
        let stdin = '';
        if (testCase.input && typeof testCase.input === 'object') {
          // Handle object format from coding.json
          if (testCase.input.target !== undefined && testCase.input.nums && Array.isArray(testCase.input.nums)) {
            stdin = `${testCase.input.target}\n${testCase.input.nums.join(',')}`;
          } else {
            stdin = JSON.stringify(testCase.input);
          }
        } else {
          stdin = String(testCase.input || '');
        }

        // Execute code
        const executionResult = await this.runCodeInDocker(code, language, stdin);
        
        // Get expected output
        let expectedOutput = testCase.expectedOutput;
        if (Array.isArray(expectedOutput)) {
          expectedOutput = JSON.stringify(expectedOutput);
        }
        
        // Compare outputs
        const isArray = Array.isArray(testCase.expectedOutput);
        const passed = this.compareOutputs(executionResult.output, String(expectedOutput), isArray);
        
        if (passed) {
          results.passed++;
        }
        
        results.cases.push({
          caseNumber: i + 1,
          input: stdin.replace(/\n/g, ' | '),
          expected: String(expectedOutput),
          actual: executionResult.output || '(no output)',
          passed: passed,
          error: executionResult.errors || null,
          hidden: testCase.hidden || false
        });

      } catch (error) {
        results.cases.push({
          caseNumber: i + 1,
          input: testCase.input ? JSON.stringify(testCase.input) : '',
          expected: Array.isArray(testCase.expectedOutput) 
            ? JSON.stringify(testCase.expectedOutput) 
            : String(testCase.expectedOutput),
          actual: '(error)',
          passed: false,
          error: error.message,
          hidden: testCase.hidden || false
        });
      }
    }

    results.allPassed = results.passed === results.total;
    return results;
  }
}

module.exports = CodeExecutionService;

