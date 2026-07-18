// index.js (Updated for Multi-Language Support)

const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuid } = require('uuid');

const app = express();
const PORT = 3000;

app.use(express.json());

const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const problem = {
  title: "Two Sum",
  description: "Given a list of numbers and a target, find two numbers in the list that add up to the target. Return the two numbers.",
  testCases: [
    { input: "9\n2,7,11,15", expectedOutput: "2,7" },
    { input: "6\n3,2,4", expectedOutput: "2,4" },
    { input: "0\n-3,4,3,90", expectedOutput: "-3,3" },
    { input: "10\n5,5", expectedOutput: "5,5" }
  ]
};

// =================================================================
// NEW: Multi-language execution logic
// =================================================================
const runCodeInDocker = (code, language, stdin) => {
  return new Promise((resolve, reject) => {
    const uniqueId = uuid();
    let fileExtension, image, command;

    switch (language) {
      case 'python':
        fileExtension = 'py';
        image = 'python:3.9-slim';
        command = `python /app/main.py`;
        break;
      case 'javascript':
        fileExtension = 'js';
        image = 'node:18-slim';
        command = `node /app/main.js`;
        break;
      case 'c':
        fileExtension = 'c';
        image = 'gcc:latest';
        command = `gcc /app/main.c -o /app/a.out && /app/a.out`;
        break;
      case 'cpp':
        fileExtension = 'cpp';
        image = 'gcc:latest';
        command = `g++ /app/main.cpp -o /app/a.out && /app/a.out`;
        break;
      case 'java':
        // For Java, the main class MUST be named "Main"
        fileExtension = 'java';
        image = 'openjdk:11';
        command = `javac /app/Main.java && java -cp /app Main`;
        break;
      default:
        return reject({ error: 'Unsupported language' });
    }

    const fileName = language === 'java' ? 'Main.java' : `main.${fileExtension}`;
    const codeFilePath = path.join(tempDir, uniqueId + '.' + fileExtension);
    fs.writeFileSync(codeFilePath, code);

    const dockerCommand = `docker run --rm -i --memory="256m" --cpus="0.5" -v "${codeFilePath}:/app/${fileName}" ${image} /bin/sh -c "${command}"`;

    const child = exec(dockerCommand, { timeout: 5000 }, (error, stdout, stderr) => {
      fs.unlinkSync(codeFilePath);
      if (error) {
        // If stderr is empty, it might be a timeout error
        reject({ error: stderr || error.message });
      } else {
        resolve({ output: stdout.trim(), errors: stderr });
      }
    });

    child.stdin.write(stdin);
    child.stdin.end();
  });
};

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/problem', (req, res) => res.json({ title: problem.title, description: problem.description }));

app.post('/execute', async (req, res) => {
  // MODIFIED: Receive language from request
  const { code, language } = req.body;
  if (!code || !language) {
    return res.status(400).json({ error: 'Code and language are required.' });
  }

  try {
    for (let i = 0; i < problem.testCases.length; i++) {
      const testCase = problem.testCases[i];
      // MODIFIED: Pass language to the execution function
      const result = await runCodeInDocker(code, language, testCase.input);

      const normalizedOutput = result.output.split(',').map(n => n.trim()).filter(Boolean).map(Number).sort().join(',');
      const normalizedExpected = testCase.expectedOutput.split(',').map(n => n.trim()).map(Number).sort().join(',');

      if (normalizedOutput !== normalizedExpected) {
        return res.json({
          status: 'Wrong Answer',
          case: i + 1,
          input: testCase.input.replace("\n", " | "),
          output: result.output,
          expected: testCase.expectedOutput
        });
      }
    }
    res.json({ status: 'Accepted' });
  } catch (e) {
    res.status(500).json(e);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});