# Resume Analyzer Integration Plan

## Overview
This document outlines the plan to integrate the Ollama-based resume analyzer from the `Trial` folder with the existing ResumeAnalysis page in the platform.

## Current State Analysis

### Trial Folder Contents
- **`ollama_main.py`**: 
  - PDF text extraction using PyMuPDF (fitz)
  - Resume analysis using custom Ollama model
  - Function: `analyse_resume_ollama(resume_content, job_description)`
  
- **`Modelfile`**: 
  - Custom Ollama model configuration (`resume-analyzer`)
  - Based on `llama3.2` with temperature 0.2
  - Outputs structured JSON with:
    - Overall score, summary, skill analysis, experience analysis
    - Strengths & gaps with evidence
    - Actionable suggestions
    - ATS compliance metrics

### Current Platform State
- **Frontend**: `ResumeAnalysis.tsx` page ready with UI, currently using mock data
- **Backend**: Node.js/Express API, file upload working, no analysis endpoint yet
- **File Handling**: PDF uploads stored in `backend/uploads/users/{userId}/`
- **API Service**: `consolidatedAPI.analyzeResume()` exists but returns mock data

## Integration Architecture

### Recommended Approach: Hybrid Python-Node.js Bridge

Since the Ollama integration is already in Python, we'll create a bridge service that:
1. **Node.js Backend** handles HTTP requests and file management
2. **Python Service** (via subprocess or HTTP) handles PDF extraction and Ollama analysis
3. **Response Transformation** converts Ollama JSON to frontend format

## Implementation Steps

### Phase 1: Python Service Setup

#### 1.1 Create Python Service Module
**Location**: `backend/src/services/resume-analyzer/`

**Files to create:**
- `resume_analyzer.py` - Main service class
- `requirements.txt` - Python dependencies
- `README.md` - Setup instructions

**Key Functions:**
```python
def extract_text_from_pdf(pdf_path: str) -> str
def analyze_resume(resume_content: str, job_description: str) -> dict
```

#### 1.2 Install Python Dependencies
```bash
pip install PyMuPDF ollama
```

#### 1.3 Ensure Ollama Model is Created
```bash
cd Trial
ollama create resume-analyzer -f ./Modelfile
```

### Phase 2: Node.js Integration

#### 2.1 Create Analysis Service
**Location**: `backend/src/services/analysis.service.js`

**Responsibilities:**
- Call Python script via subprocess or HTTP
- Handle PDF file path resolution
- Transform Ollama response to frontend format
- Error handling and timeout management

#### 2.2 Create Analysis Route
**Location**: `backend/src/routes/analysis.routes.js`

**Endpoint**: `POST /api/analysis/resume`

**Request Body:**
```json
{
  "fileId": "uuid",
  "jobDescription": "string"
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "overallScore": 88,
    "matchPercentage": 82,
    "processingTime": 2.3,
    "summary": "...",
    "jobDescription": {...},
    "matchedSkills": [...],
    "missingSkills": [...],
    "strengths": [...],
    "recommendations": [...],
    "atsCompatibility": {...}
  }
}
```

#### 2.3 Register Route
Update `backend/src/app.js`:
```javascript
const analysisRoutes = require('./routes/analysis.routes');
app.use('/api/analysis', analysisRoutes);
```

### Phase 3: Python-Node.js Bridge Options

#### Option A: Subprocess (Recommended for MVP)
**Pros**: Simple, no additional service
**Cons**: Requires Python on server, synchronous blocking

**Implementation:**
```javascript
const { spawn } = require('child_process');
const path = require('path');

async function callPythonAnalyzer(pdfPath, jobDescription) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '../services/resume-analyzer/resume_analyzer.py');
    const python = spawn('python', [pythonScript, pdfPath, jobDescription]);
    
    let output = '';
    python.stdout.on('data', (data) => output += data);
    python.stderr.on('data', (data) => console.error(data.toString()));
    
    python.on('close', (code) => {
      if (code === 0) {
        resolve(JSON.parse(output));
      } else {
        reject(new Error(`Python script exited with code ${code}`));
      }
    });
  });
}
```

#### Option B: HTTP Microservice (Recommended for Production)
**Pros**: Scalable, language-agnostic, can scale independently
**Cons**: Additional service to maintain

**Implementation:**
- Create FastAPI/Flask service in Python
- Expose `/analyze` endpoint
- Node.js calls via HTTP

#### Option C: Direct Ollama HTTP API (Node.js Only)
**Pros**: No Python dependency
**Cons**: Need to implement PDF extraction in Node.js

**Implementation:**
- Use `pdf-parse` or `pdfjs-dist` for PDF extraction
- Call Ollama HTTP API directly: `http://localhost:11434/api/generate`

### Phase 4: Response Transformation

#### 4.1 Map Ollama JSON to Frontend Format

**Ollama Output** (from Modelfile):
```json
{
  "overallScore": 85,
  "summary": "...",
  "skillAnalysis": {...},
  "experienceAnalysis": {...},
  "strengths": [...],
  "gaps": [...],
  "suggestions": [...],
  "atsCompliance": {...}
}
```

**Frontend Expected** (from `resumeAnalysis.json`):
```json
{
  "overallScore": 88,
  "matchPercentage": 82,
  "processingTime": 2.3,
  "jobDescription": {...},
  "matchedSkills": [...],
  "missingSkills": [...],
  "strengths": [...],
  "recommendations": [...],
  "atsCompatibility": {...}
}
```

**Transformation Logic:**
- Map `skillAnalysis.matchedSkills` → `matchedSkills`
- Map `skillAnalysis.missingSkills` → `missingSkills`
- Map `suggestions` → `recommendations`
- Extract `matchPercentage` from `overallScore` or calculate
- Add `processingTime` from actual execution time
- Transform `jobDescription` from text to structured format

### Phase 5: Frontend Integration

#### 5.1 Update API Service
**Location**: `frontend/src/services/consolidatedAPI.ts`

Replace mock implementation:
```typescript
async analyzeResume(user: User, fileId: string, jobDescription: string): Promise<AnalysisResult> {
  const headers = await this.getAuthHeaders(user);
  const response = await fetch(`${BACKEND_BASE_URL}/api/analysis/resume`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileId, jobDescription }),
  });
  const result = await this.handleResponse<{ success: boolean; data: any }>(response);
  return this.transformAnalysisResult(result.data);
}
```

#### 5.2 Update ResumeAnalysis Component
**Location**: `frontend/src/pages/ResumeAnalysis.tsx`

Replace mock data call (line 196):
```typescript
const result = await consolidatedAPI.analyzeResume(
  currentUser, 
  uploadedFile?.fileId || resumeData?.fileId, 
  jobDescription
);
setAnalysisResult(result);
```

### Phase 6: Error Handling & Edge Cases

#### 6.1 Handle Missing Dependencies
- Check if Python is installed
- Check if Ollama is running
- Check if `resume-analyzer` model exists

#### 6.2 Handle PDF Extraction Failures
- Invalid PDF files
- Password-protected PDFs
- Scanned PDFs (OCR fallback)

#### 6.3 Handle Ollama Errors
- Model not found
- Connection timeout
- Invalid JSON response

#### 6.4 Timeout Management
- Set reasonable timeout (30-60 seconds)
- Show progress indicator
- Graceful degradation

## File Structure

```
backend/
├── src/
│   ├── services/
│   │   ├── analysis.service.js          # NEW: Analysis service
│   │   └── resume-analyzer/             # NEW: Python service
│   │       ├── resume_analyzer.py
│   │       ├── requirements.txt
│   │       └── README.md
│   └── routes/
│       └── analysis.routes.js           # NEW: Analysis routes
├── Trial/                                # EXISTING: Reference implementation
│   ├── ollama_main.py
│   └── Modelfile
```

## Dependencies

### Python (for resume-analyzer service)
```txt
PyMuPDF>=1.23.0
ollama>=0.1.0
```

### Node.js (additional)
```json
{
  "child_process": "built-in",
  "util": "built-in"
}
```

## Testing Plan

### Unit Tests
1. Test PDF text extraction
2. Test Ollama API calls
3. Test response transformation
4. Test error handling

### Integration Tests
1. End-to-end: Upload → Analyze → Display
2. Test with various PDF formats
3. Test with different job descriptions
4. Test timeout scenarios

### Manual Testing
1. Verify Ollama model is working: `ollama run resume-analyzer`
2. Test with sample resume and job description
3. Verify frontend displays results correctly

## Deployment Considerations

### Development
- Ensure Ollama is running locally: `ollama serve`
- Python environment with dependencies installed
- Model created: `ollama create resume-analyzer -f Trial/Modelfile`

### Production
- **Option A**: Install Python on production server
- **Option B**: Deploy Python service as separate container/service
- **Option C**: Use Node.js PDF extraction + direct Ollama HTTP API

## Migration Path

### Step 1: MVP (Subprocess)
- Quickest to implement
- Use Python subprocess from Node.js
- Test with local Ollama instance

### Step 2: Production (Microservice)
- Extract Python service to separate API
- Better scalability and reliability
- Easier to monitor and debug

## Success Criteria

✅ Resume PDF uploads successfully
✅ PDF text extraction works correctly
✅ Ollama analysis returns structured JSON
✅ Response transformed to frontend format
✅ Frontend displays analysis results
✅ Error handling works gracefully
✅ Timeout handling prevents hanging requests

## Next Steps

1. **Choose bridge approach** (Subprocess vs HTTP vs Direct API)
2. **Create Python service module** from Trial code
3. **Implement Node.js analysis service**
4. **Create analysis route**
5. **Update frontend API service**
6. **Test end-to-end flow**
7. **Handle edge cases and errors**
8. **Deploy and monitor**

---

## Quick Start (Subprocess Approach)

1. **Setup Python environment:**
   ```bash
   cd backend/src/services/resume-analyzer
   pip install -r requirements.txt
   ```

2. **Create Ollama model:**
   ```bash
   cd ../../../../Trial
   ollama create resume-analyzer -f ./Modelfile
   ```

3. **Start Ollama:**
   ```bash
   ollama serve
   ```

4. **Test Python script:**
   ```bash
   python backend/src/services/resume-analyzer/resume_analyzer.py
   ```

5. **Implement Node.js service** (see Phase 2)

6. **Update frontend** (see Phase 5)

7. **Test end-to-end** (see Testing Plan)





