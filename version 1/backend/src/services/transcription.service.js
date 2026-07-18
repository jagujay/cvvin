const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;
const Logger = require('../utils/logger.utils');

const execAsync = promisify(exec);

/**
 * Transcription Service - Rewritten with better Python detection
 * Handles audio transcription using local Whisper model
 */
class TranscriptionService {
  constructor() {
    // Use the new wrapper script
    this.whisperScriptPath = path.join(
      __dirname,
      'transcription',
      'transcribe_wrapper.py'
    );
    // Model size (base, small, medium, large-v2)
    this.modelSize = process.env.WHISPER_MODEL_SIZE || 'base';
    // Device (cpu or cuda)
    this.device = process.env.WHISPER_DEVICE || 'cpu';
    // Transcription timeout (5 minutes for long audio)
    this.transcriptionTimeout = 300000;
    // Cache for Python executable path
    this.pythonPath = null;
  }

  /**
   * Find Python executable that has faster-whisper installed
   * @returns {Promise<string>} Path to Python executable
   */
  async findPythonWithWhisper() {
    // If PYTHON env var is set, verify it has faster-whisper and use it
    if (process.env.PYTHON) {
      Logger.info('PYTHON environment variable set', { python: process.env.PYTHON });
      try {
        // Verify it has faster-whisper
        const testCommand = process.platform === 'win32'
          ? `"${process.env.PYTHON}" -c "import faster_whisper; print(\\"OK\\")" 2>&1`
          : `"${process.env.PYTHON}" -c "import faster_whisper; print('OK')" 2>&1`;
        const { stdout, stderr } = await execAsync(testCommand, {
          timeout: 5000,
          shell: true
        });
        
        if (stdout.includes('OK') && !stderr.includes('ImportError') && !stderr.includes('ModuleNotFoundError')) {
          Logger.info('PYTHON env var has faster-whisper', { python: process.env.PYTHON });
          return process.env.PYTHON;
        } else {
          Logger.warn('PYTHON env var set but faster-whisper not found, will try other Pythons', { 
            python: process.env.PYTHON,
            stdout: stdout.substring(0, 100),
            stderr: stderr.substring(0, 100)
          });
        }
      } catch (error) {
        Logger.warn('PYTHON env var set but verification failed, will try other Pythons', { 
          python: process.env.PYTHON,
          error: error.message
        });
      }
    }

    // Try common Python commands - don't cache, always check fresh
    const pythonCommands = process.platform === 'win32' 
      ? ['python', 'py', 'python3']
      : ['python3', 'python'];

    for (const cmd of pythonCommands) {
      try {
        // First, get the full path to this Python executable
        let pythonPath = cmd;
        try {
          const { stdout } = await execAsync(`"${cmd}" -c "import sys; print(sys.executable)"`, {
            timeout: 3000,
            shell: true
          });
          pythonPath = stdout.trim();
          Logger.info(`Found Python executable for '${cmd}': ${pythonPath}`);
        } catch (e) {
          // If we can't get the path, just use the command
          Logger.warn(`Could not get full path for '${cmd}', using command as-is`, { error: e.message });
          pythonPath = cmd;
        }

        // Test if this Python has faster-whisper
        const testCommand = process.platform === 'win32'
          ? `"${pythonPath}" -c "import faster_whisper; print(\\"OK\\")" 2>&1`
          : `"${pythonPath}" -c "import faster_whisper; print('OK')" 2>&1`;
        
        Logger.info(`Testing faster-whisper in: ${pythonPath}`);
        const { stdout, stderr } = await execAsync(testCommand, {
          timeout: 5000,
          shell: true
        });
        
        Logger.info(`Test result for ${pythonPath}`, {
          stdout: stdout.substring(0, 50),
          stderr: stderr.substring(0, 200)
        });
        
        if (stdout.includes('OK') && !stderr.includes('ImportError') && !stderr.includes('ModuleNotFoundError')) {
          Logger.info('Found Python with faster-whisper', { command: cmd, fullPath: pythonPath });
          // Cache the full path
          this.pythonPath = pythonPath;
          return pythonPath;
        }
      } catch (error) {
        Logger.warn(`Python '${cmd}' failed faster-whisper test`, { error: error.message.substring(0, 100) });
        // This Python doesn't have faster-whisper or doesn't exist, try next
        continue;
      }
    }

    // Fallback to default - but try to get full path
    const defaultPython = process.platform === 'win32' ? 'python' : 'python3';
    try {
      const { stdout } = await execAsync(`"${defaultPython}" -c "import sys; print(sys.executable)"`, {
        timeout: 3000,
        shell: true
      });
      const fullPath = stdout.trim();
      Logger.warn('Could not verify faster-whisper, using default Python', { command: defaultPython, fullPath });
      this.pythonPath = fullPath;
      return fullPath;
    } catch (e) {
      Logger.error('Could not find any working Python', { error: e.message });
      throw new Error(
        `Could not find a Python installation with faster-whisper installed. ` +
        `Please install faster-whisper: pip install faster-whisper ` +
        `Or set the PYTHON environment variable to point to a Python that has faster-whisper.`
      );
    }
  }

  /**
   * Transcribe audio file using local Whisper model
   * @param {string} audioFilePath - Path to audio file
   * @param {string} language - Optional language code (e.g., 'en')
   * @returns {Promise<Object>} Transcription result with text, segments, words
   */
  async transcribeAudio(audioFilePath, language = null) {
    try {
      // Check if Python script exists
      await fs.access(this.whisperScriptPath);
    } catch (err) {
      Logger.error('Whisper script not found', {
        path: this.whisperScriptPath,
        error: err.message
      });
      throw new Error(`Whisper transcription script not found at ${this.whisperScriptPath}. Please ensure the script exists.`);
    }

    try {
      // Check if audio file exists
      await fs.access(audioFilePath);
    } catch (err) {
      Logger.error('Audio file not found', {
        path: audioFilePath,
        error: err.message
      });
      throw new Error(`Audio file not found: ${audioFilePath}`);
    }

    // Find Python with faster-whisper
    const pythonCommand = await this.findPythonWithWhisper();
    
    // Prepare command - use absolute paths
    const absoluteAudioPath = path.resolve(audioFilePath);
    const absoluteScriptPath = path.resolve(this.whisperScriptPath);
    
    // Build command - Windows needs double quotes, not single quotes
    // Escape internal double quotes by doubling them
    const escapeForWindows = (p) => {
      // Replace " with "" for Windows CMD escaping
      return p.replace(/"/g, '""');
    };

    // Always quote Python command if it contains spaces or is a full path
    const shouldQuotePython = pythonCommand.includes(' ') || pythonCommand.includes('\\') || pythonCommand.includes('/');
    const quotedPython = shouldQuotePython ? `"${pythonCommand}"` : pythonCommand;

    let fullCommand;
    if (process.platform === 'win32') {
      // Windows: use double quotes and escape internal quotes by doubling them
      const escapedScript = escapeForWindows(absoluteScriptPath);
      const escapedAudio = escapeForWindows(absoluteAudioPath);
      fullCommand = `${quotedPython} "${escapedScript}" "${escapedAudio}" ${this.modelSize}${language ? ` ${language}` : ''}`;
    } else {
      // Unix: use double quotes and escape internal quotes
      const escapedScript = absoluteScriptPath.replace(/"/g, '\\"');
      const escapedAudio = absoluteAudioPath.replace(/"/g, '\\"');
      fullCommand = `${quotedPython} "${escapedScript}" "${escapedAudio}" ${this.modelSize}${language ? ` ${language}` : ''}`;
    }

    Logger.info('Starting Whisper transcription', {
      audioFile: path.basename(audioFilePath),
      filePath: absoluteAudioPath,
      modelSize: this.modelSize,
      language: language || 'auto-detect',
      pythonCommand: pythonCommand,
      scriptPath: absoluteScriptPath,
      fullCommand: fullCommand.substring(0, 300) // Log the actual command
    });

    try {
      // Execute Python script with timeout
      // Use shell: true and proper command construction for Windows
      Logger.info('Executing transcription command', {
        command: fullCommand.substring(0, 300),
        python: pythonCommand,
        script: path.basename(absoluteScriptPath),
        audio: path.basename(absoluteAudioPath)
      });

      const { stdout, stderr } = await execAsync(fullCommand, {
        timeout: this.transcriptionTimeout,
        shell: true,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
        cwd: path.dirname(this.whisperScriptPath),
        env: {
          ...process.env,
          PYTHONPATH: process.env.PYTHONPATH || '',
          PATH: process.env.PATH || '',
          PYTHONIOENCODING: 'utf-8', // Ensure UTF-8 encoding
          PYTHONWARNINGS: 'ignore' // Suppress Python warnings
        },
        windowsVerbatimArguments: false // Let shell handle arguments
      });

      // Filter out warnings from stderr - warnings go to stderr but are not errors
      const stderrLines = stderr ? stderr.split('\n') : [];
      const actualErrors = stderrLines.filter(line => {
        const trimmed = line.trim();
        // Ignore deprecation warnings and empty lines
        if (!trimmed || 
            trimmed.includes('UserWarning') || 
            trimmed.includes('pkg_resources') || 
            trimmed.includes('deprecated') ||
            trimmed.includes('See https://')) {
          return false;
        }
        // Keep lines that look like JSON errors
        return trimmed.startsWith('{') || trimmed.toLowerCase().includes('error');
      }).join('\n');

      // Parse JSON output from stdout
      let result;
      try {
        // stdout should contain the JSON result
        // Find JSON in stdout (might have warnings before it)
        const stdoutLines = stdout.split('\n');
        let jsonLine = '';
        
        // Look for the last line that starts with { (the JSON result)
        for (let i = stdoutLines.length - 1; i >= 0; i--) {
          const line = stdoutLines[i].trim();
          if (line.startsWith('{') && line.endsWith('}')) {
            jsonLine = line;
            break;
          }
        }
        
        if (jsonLine) {
          result = JSON.parse(jsonLine);
        } else {
          // Try parsing entire stdout (might be just JSON)
          const cleaned = stdout.trim();
          result = JSON.parse(cleaned);
        }
      } catch (parseError) {
        // If stdout parsing failed, check if stderr has a JSON error
        if (actualErrors) {
          try {
            // Try to find JSON in actualErrors
            const errorMatch = actualErrors.match(/\{[\s\S]*\}/);
            if (errorMatch) {
              const errorJson = JSON.parse(errorMatch[0]);
              if (errorJson.error) {
                throw new Error(errorJson.error);
              }
            }
          } catch (e) {
            // Not JSON error
          }
        }
        
        // Log the actual output for debugging
        Logger.error('Failed to parse transcription output', {
          stdout: stdout.substring(0, 1000),
          stderr: stderr.substring(0, 1000),
          parseError: parseError.message
        });
        
        throw new Error(
          `Failed to parse transcription output. ` +
          `This might indicate faster-whisper is not installed correctly. ` +
          `stdout: ${stdout.substring(0, 300)}, stderr: ${stderr.substring(0, 300)}`
        );
      }

      // Check for errors in result
      if (result.error) {
        Logger.error('Transcription error from Python script', {
          error: result.error,
          python_executable: result.python_executable,
          suggestion: result.suggestion
        });

        // Provide helpful error message
        if (result.error.includes('faster-whisper not installed')) {
          const installCmd = result.suggestion || `${pythonCommand} -m pip install faster-whisper`;
          throw new Error(
            `faster-whisper is not installed in the Python environment being used.\n` +
            `Python executable: ${result.python_executable || pythonCommand}\n` +
            `Python version: ${result.python_version || 'unknown'}\n` +
            `To fix this, run: ${installCmd}\n` +
            `Or set the PYTHON environment variable to point to a Python that has faster-whisper installed.`
          );
        }
        
        throw new Error(result.error);
      }

      // Validate result
      if (!result.text) {
        throw new Error('Transcription returned empty result. Please check if faster-whisper is installed correctly.');
      }

      Logger.info('Transcription completed', {
        textLength: result.text?.length || 0,
        language: result.language,
        segments: result.segments?.length || 0
      });

      return result;

    } catch (error) {
      Logger.error('Transcription execution failed', {
        error: error.message,
        command: fullCommand,
        code: error.code,
        signal: error.signal,
        stdout: error.stdout?.substring(0, 500),
        stderr: error.stderr?.substring(0, 500)
      });

      // Handle timeout
      if (error.code === 'ETIMEDOUT' || error.signal === 'SIGTERM') {
        throw new Error('Transcription timeout: Process took too long. The audio file might be too large.');
      }

      // Handle command not found
      if (error.code === 'ENOENT' || error.message.includes('not found')) {
        throw new Error(
          `Python not found or command failed. ` +
          `Make sure Python is installed and in your PATH. ` +
          `You can set the PYTHON environment variable to point to your Python executable.`
        );
      }

      // Extract stdout and stderr from error object (execAsync puts them there)
      const errorStdout = error.stdout || '';
      const errorStderr = error.stderr || '';
      
      // Try to extract error from stdout first (Python script outputs JSON to stdout)
      let extractedError = null;
      
      // Check stdout for JSON error
      if (errorStdout) {
        try {
          // Find JSON in stdout (might have warnings before it)
          const stdoutLines = errorStdout.split('\n');
          for (let i = stdoutLines.length - 1; i >= 0; i--) {
            const line = stdoutLines[i].trim();
            if (line.startsWith('{') && line.includes('error')) {
              try {
                const errorObj = JSON.parse(line);
                if (errorObj.error) {
                  extractedError = errorObj;
                  break;
                }
              } catch (e) {
                // Not valid JSON, continue
              }
            }
          }
          
          // If no JSON found, try parsing entire stdout
          if (!extractedError) {
            const cleaned = errorStdout.trim();
            if (cleaned.startsWith('{')) {
              const errorObj = JSON.parse(cleaned);
              if (errorObj.error) {
                extractedError = errorObj;
              }
            }
          }
        } catch (parseError) {
          // Not JSON in stdout
        }
      }

      // If no error in stdout, check stderr
      if (!extractedError && errorStderr) {
        try {
          // Filter out warnings and find JSON
          const stderrLines = errorStderr.split('\n');
          for (const line of stderrLines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('{') && trimmed.includes('error')) {
              try {
                const errorObj = JSON.parse(trimmed);
                if (errorObj.error) {
                  extractedError = errorObj;
                  break;
                }
              } catch (e) {
                // Not valid JSON
              }
            }
          }
        } catch (parseError) {
          // Check if stderr mentions faster-whisper
          if (errorStderr.includes('faster-whisper') || 
              errorStderr.includes('ImportError') || 
              errorStderr.includes('ModuleNotFoundError') ||
              errorStderr.includes('No module named')) {
            extractedError = {
              error: 'faster-whisper not installed or not accessible',
              python_executable: pythonCommand,
              suggestion: `${pythonCommand} -m pip install faster-whisper`
            };
          }
        }
      }

      // If we found an error, format it nicely
      if (extractedError) {
        if (extractedError.error && extractedError.error.includes('faster-whisper')) {
          const installCmd = extractedError.suggestion || `${pythonCommand} -m pip install faster-whisper`;
          throw new Error(
            `faster-whisper is not installed or not accessible in the Python being used.\n` +
            `Python executable: ${extractedError.python_executable || pythonCommand}\n` +
            `To fix, run: ${installCmd}\n` +
            `Or set PYTHON environment variable to a Python that has faster-whisper installed.`
          );
        }
        throw new Error(extractedError.error || 'Transcription failed');
      }

      // If no extracted error, provide detailed error message
      const stdoutInfo = errorStdout ? `\nPython stdout: ${errorStdout.substring(0, 500)}` : '';
      const stderrInfo = errorStderr ? `\nPython stderr: ${errorStderr.substring(0, 500)}` : '';
      
      throw new Error(
        `Transcription failed: ${error.message}${stdoutInfo}${stderrInfo}\n` +
        `Command: ${fullCommand.substring(0, 200)}`
      );
    }
  }

  /**
   * Check if transcription service is available
   * @returns {Promise<boolean>} True if service is available
   */
  async isAvailable() {
    try {
      await fs.access(this.whisperScriptPath);
      // Also check if we can find Python with faster-whisper
      await this.findPythonWithWhisper();
      return true;
    } catch (error) {
      Logger.warn('Transcription service not available', {
        scriptPath: this.whisperScriptPath,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Transcribe audio buffer (for direct uploads)
   * @param {Buffer} audioBuffer - Audio file buffer
   * @param {string} extension - File extension (e.g., 'webm', 'mp3')
   * @param {string} language - Optional language code
   * @returns {Promise<Object>} Transcription result
   */
  async transcribeBuffer(audioBuffer, extension = 'webm', language = null) {
    const fs = require('fs');
    const path = require('path');
    const { v4: uuidv4 } = require('uuid');
    
    // Create temp file
    const tempDir = path.join(process.cwd(), 'temp', 'audio');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempFilePath = path.join(tempDir, `${uuidv4()}.${extension}`);
    
    try {
      // Write buffer to temp file
      await fs.promises.writeFile(tempFilePath, audioBuffer);
      
      // Transcribe
      const result = await this.transcribeAudio(tempFilePath, language);
      
      // Clean up temp file
      await fs.promises.unlink(tempFilePath);
      
      return result;
    } catch (error) {
      // Clean up temp file on error
      try {
        await fs.promises.unlink(tempFilePath);
      } catch (unlinkError) {
        // Ignore cleanup errors
      }
      throw error;
    }
  }
}

module.exports = new TranscriptionService();
