# Resume Analyzer Integration - Setup Guide

## ✅ Integration Complete

The resume analyzer has been successfully integrated with the ResumeAnalysis page. The integration connects the Ollama-based Python analyzer with the Node.js backend and React frontend.

## 📁 Files Created/Modified

### Backend Files Created:
- `backend/src/services/resume-analyzer/resume_analyzer.py` - Python service for PDF extraction and Ollama analysis
- `backend/src/services/resume-analyzer/requirements.txt` - Python dependencies
- `backend/src/services/resume-analyzer/README.md` - Service documentation
- `backend/src/services/analysis.service.js` - Node.js service bridging Python subprocess
- `backend/src/routes/analysis.routes.js` - Analysis API endpoint

### Backend Files Modified:
- `backend/src/app.js` - Added analysis route registration

### Frontend Files Modified:
- `frontend/src/services/consolidatedAPI.ts` - Updated to call real analysis endpoint
- `frontend/src/pages/ResumeAnalysis.tsx` - Updated to use real API and load resume file info

## 🚀 Setup Instructions

### 1. Install Python Dependencies

```bash
cd backend/src/services/resume-analyzer
pip install -r requirements.txt
```

Or install manually:
```bash
pip install PyMuPDF>=1.23.0 ollama>=0.1.0
```

### 2. Setup Ollama

#### Install Ollama (if not already installed):
- **Windows**: Download from https://ollama.ai
- **Mac/Linux**: `curl -fsSL https://ollama.ai/install.sh | sh`

#### Start Ollama Service:
```bash
ollama serve
```

#### Create the Resume Analyzer Model:
```bash
cd Trial
ollama create resume-analyzer -f ./Modelfile
```

Verify the model was created:
```bash
ollama list
```

You should see `resume-analyzer` in the list.

### 3. Test the Python Service

Test the Python script directly:
```bash
cd backend/src/services/resume-analyzer
python resume_analyzer.py path/to/resume.pdf "Job description text here"
```

Expected output: JSON analysis result printed to stdout.

### 4. Start the Backend

```bash
cd backend
npm install  # If not already done
npm run dev  # or npm start
```

### 5. Start the Frontend

```bash
cd frontend
npm install  # If not already done
npm run dev
```

## 🧪 Testing the Integration

1. **Upload a Resume PDF**:
   - Navigate to `/resume-analysis` page
   - Upload a PDF resume file
   - Wait for upload confirmation

2. **Paste Job Description**:
   - Paste a job description in the text area

3. **Run Analysis**:
   - Click "Analyze Resume Match" button
   - Wait for analysis to complete (may take 30-60 seconds)
   - Review the results displayed

## 🔍 Troubleshooting

### Python Script Not Found
**Error**: `Python analyzer script not found`

**Solution**: 
- Ensure `backend/src/services/resume-analyzer/resume_analyzer.py` exists
- Check file permissions (should be executable)

### Python Not Installed
**Error**: `Failed to start analysis: spawn python ENOENT`

**Solution**:
- Install Python 3.8+ from https://www.python.org
- Verify with: `python --version`
- On some systems, use `python3` instead of `python`

### Ollama Not Running
**Error**: `Error communicating with Ollama: Connection refused`

**Solution**:
- Start Ollama: `ollama serve`
- Verify Ollama is running: `curl http://localhost:11434/api/tags`
- Check if model exists: `ollama list`

### Model Not Found
**Error**: `model 'resume-analyzer' not found`

**Solution**:
```bash
cd Trial
ollama create resume-analyzer -f ./Modelfile
```

### PDF Extraction Failed
**Error**: `Failed to extract text from PDF`

**Solutions**:
- Ensure PDF is not password-protected
- Check if PDF is corrupted
- Verify PyMuPDF is installed: `pip show PyMuPDF`

### Analysis Timeout
**Error**: `Analysis timeout: Process took too long`

**Solutions**:
- Check if Ollama is running and responsive
- Try with a smaller/simpler job description
- Increase timeout in `analysis.service.js` (default: 60 seconds)

### Invalid JSON Response
**Error**: `Failed to parse analysis result`

**Solutions**:
- Check Ollama model output format
- Verify Modelfile is correct
- Check Python script error output (stderr)

## 📊 How It Works

1. **Frontend**: User uploads PDF and pastes job description
2. **Backend Route**: Receives request with `fileId` and `jobDescription`
3. **File Service**: Retrieves PDF file path from database
4. **Analysis Service**: Calls Python subprocess with PDF path and job description
5. **Python Script**: 
   - Extracts text from PDF using PyMuPDF
   - Calls Ollama API with custom model
   - Returns JSON analysis result
6. **Response Transformation**: Converts Ollama JSON to frontend format
7. **Frontend**: Displays analysis results

## 🔧 Configuration

### Adjust Timeout
In `backend/src/services/analysis.service.js`:
```javascript
this.analysisTimeout = 60000; // 60 seconds (milliseconds)
```

### Change Python Command
If your system uses `python3` instead of `python`:
```javascript
const python = spawn('python3', [ // Change here
  this.pythonScriptPath,
  absolutePdfPath,
  jobDescription
]);
```

### Ollama Configuration
Default Ollama endpoint: `http://localhost:11434`
To change, modify `resume_analyzer.py`:
```python
client = ollama.Client(host='http://your-ollama-host:11434')
```

## 📝 Next Steps

### Production Considerations:
1. **Error Handling**: Add retry logic for transient failures
2. **Caching**: Cache analysis results to avoid re-analyzing same resume+JD
3. **Queue System**: For high-volume, use job queue (Redis, Bull)
4. **Monitoring**: Add logging and metrics for analysis performance
5. **Microservice**: Extract Python service to separate API for better scalability

### Enhancements:
1. Support for DOCX files (convert to PDF first)
2. OCR for scanned PDFs
3. Batch analysis for multiple resumes
4. Analysis history and comparison
5. Export analysis as PDF report

## 🎯 Success Indicators

✅ Python dependencies installed
✅ Ollama service running
✅ Resume analyzer model created
✅ Backend starts without errors
✅ Frontend can upload resume
✅ Analysis completes successfully
✅ Results display correctly in UI

## 📞 Support

If you encounter issues:
1. Check backend logs for detailed error messages
2. Test Python script directly to isolate issues
3. Verify Ollama is running and model exists
4. Check file permissions and paths

















