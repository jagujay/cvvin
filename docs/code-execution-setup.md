# Code Execution Integration Setup Guide

## ✅ Integration Complete

The Docker-based code execution system has been successfully integrated with the CodingChallenge page. The system executes code in isolated Docker containers for multiple programming languages.

## 📁 Files Created/Modified

### Backend Files Created:
- `backend/src/services/code-execution.service.js` - Docker-based code execution service
- `backend/src/routes/code-execution.routes.js` - Code execution API endpoints

### Backend Files Modified:
- `backend/src/app.js` - Added code execution routes

### Frontend Files Created:
- `frontend/src/utils/code-wrapper.ts` - Code wrapping utilities for stdin/stdout conversion

### Frontend Files Modified:
- `frontend/src/pages/technical/CodingChallenge.tsx` - Integrated real code execution
- `frontend/src/services/consolidatedAPI.ts` - Added code execution API methods
- `frontend/src/mock/coding.json` - Added more test cases for Two Sum problem

## 🚀 Setup Instructions

### 1. Install Docker

**Windows:**
- Download Docker Desktop from https://www.docker.com/products/docker-desktop
- Install and ensure Docker Desktop is running

**Mac:**
- Download Docker Desktop from https://www.docker.com/products/docker-desktop
- Install and start Docker Desktop

**Linux:**
```bash
sudo apt-get update
sudo apt-get install docker.io
sudo systemctl start docker
sudo systemctl enable docker
```

### 2. Pull Docker Images

The system uses these Docker images (automatically pulled on first use):
- `python:3.9-slim` - For Python execution
- `node:18-slim` - For JavaScript execution
- `openjdk:11` - For Java execution
- `gcc:latest` - For C/C++ execution

To pre-pull images:
```bash
docker pull python:3.9-slim
docker pull node:18-slim
docker pull openjdk:11
docker pull gcc:latest
```

### 3. Verify Docker is Running

```bash
docker ps
```

Should return without errors. If you see "Cannot connect to Docker daemon", ensure Docker Desktop is running.

### 4. Test the Integration

1. **Start Backend:**
   ```bash
   cd backend
   npm install  # If not already done
   npm run dev
   ```

2. **Start Frontend:**
   ```bash
   cd frontend
   npm install  # If not already done
   npm run dev
   ```

3. **Navigate to Coding Challenge:**
   - Log in to the application
   - Navigate to the coding challenge page
   - Write code for the Two Sum problem
   - Click "Run" to test against visible test cases
   - Click "Submit" to test against all test cases (including hidden ones)

## 🧪 Two Sum Problem

The problem is configured with the following test cases:

### Visible Test Cases:
1. `nums = [2, 7, 11, 15], target = 9` → Expected: `[0, 1]`
2. `nums = [3, 2, 4], target = 6` → Expected: `[1, 2]`
3. `nums = [3, 3], target = 6` → Expected: `[0, 1]`

### Hidden Test Cases:
4. `nums = [1, 2, 3, 4, 5], target = 9` → Expected: `[3, 4]`

## 📝 How It Works

### Code Execution Flow:

1. **User writes code** in LeetCode-style format (function-based)
2. **Frontend wraps code** using `code-wrapper.ts` to convert to stdin/stdout format
3. **Backend receives code** and test cases
4. **For each test case:**
   - Code is written to a temporary file
   - Docker container is created with appropriate language image
   - Code is executed with test case input via stdin
   - Output is captured and compared with expected output
5. **Results are returned** showing pass/fail for each test case

### Code Wrapping:

The system automatically converts LeetCode-style function code to executable scripts:

**JavaScript Example:**
```javascript
// User writes:
var twoSum = function(nums, target) {
    // solution
};

// System wraps to:
const readline = require('readline');
// ... setup code ...
const result = twoSum(nums, target);
console.log(result.join(','));
```

**Python Example:**
```python
# User writes:
class Solution:
    def twoSum(self, nums, target):
        # solution

# System wraps to:
import sys
# ... setup code ...
solution = Solution()
result = solution.twoSum(nums, target)
print(','.join(map(str, result)))
```

## 🔍 Troubleshooting

### Docker Not Running
**Error**: `Cannot connect to Docker daemon`

**Solution:**
- Start Docker Desktop
- Verify with: `docker ps`
- On Linux, ensure Docker service is running: `sudo systemctl start docker`

### Code Execution Timeout
**Error**: `Execution timeout: Code took too long to execute`

**Solutions:**
- Check for infinite loops in code
- Increase timeout in `code-execution.service.js` (default: 5 seconds)
- Review code for performance issues

### Wrong Output Format
**Error**: Test cases fail even with correct logic

**Solutions:**
- Ensure output format matches expected (comma-separated for arrays)
- Check code wrapper is handling output correctly
- Verify test case input format matches expected format

### Language Not Supported
**Error**: `Unsupported language`

**Solutions:**
- Check language is in supported list: `python`, `javascript`, `java`, `c`, `cpp`
- Ensure Docker image for language is available
- Verify language configuration in `code-execution.service.js`

### Permission Errors
**Error**: Permission denied when creating temp files

**Solutions:**
- Check `temp/code-execution` directory permissions
- Ensure backend has write permissions
- On Linux, check directory ownership

## 📊 API Endpoints

### POST /api/code/execute
Execute code against test cases.

**Request:**
```json
{
  "code": "var twoSum = function(nums, target) { ... };",
  "language": "javascript",
  "testCases": [
    {
      "input": { "nums": [2, 7, 11, 15], "target": 9 },
      "expectedOutput": [0, 1],
      "hidden": false
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "Accepted",
    "passed": 3,
    "total": 3,
    "allPassed": true,
    "cases": [
      {
        "caseNumber": 1,
        "input": "9 | 2,7,11,15",
        "expected": "[0,1]",
        "actual": "0,1",
        "passed": true,
        "error": null,
        "hidden": false
      }
    ]
  }
}
```

### POST /api/code/run
Run code with custom input (for debugging).

**Request:**
```json
{
  "code": "console.log('Hello');",
  "language": "javascript",
  "input": "custom input"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "output": "Hello",
    "errors": null
  }
}
```

## 🎯 Success Indicators

✅ Docker is running and accessible
✅ Backend starts without errors
✅ Frontend can call code execution API
✅ Code executes successfully in Docker
✅ Test cases pass/fail correctly
✅ Errors are displayed properly
✅ Hidden test cases work on submit

## 🔒 Security Considerations

1. **Resource Limits**: Docker containers are limited to 256MB memory and 0.5 CPU
2. **Timeout**: Code execution times out after 5 seconds
3. **Isolation**: Each execution runs in a separate container
4. **File Cleanup**: Temporary files are deleted after execution
5. **Authentication**: Code execution requires user authentication

## 📈 Next Steps

### Potential Enhancements:
1. **Code Editor**: Integrate Monaco Editor or CodeMirror for syntax highlighting
2. **Syntax Highlighting**: Add language-specific syntax highlighting
3. **Auto-completion**: Add code completion for common patterns
4. **Multiple Problems**: Support multiple coding problems
5. **Solution History**: Save and display user solution history
6. **Leaderboard**: Track fastest solutions
7. **Hints System**: Show hints when user is stuck
8. **Code Analysis**: Analyze code complexity and style

## 📞 Support

If you encounter issues:
1. Check Docker is running: `docker ps`
2. Check backend logs for detailed error messages
3. Verify Docker images are available: `docker images`
4. Test code execution manually using Docker commands
5. Check file permissions in `temp/code-execution` directory





















