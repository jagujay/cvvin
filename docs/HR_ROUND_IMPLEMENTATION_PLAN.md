# HR Round Implementation Plan

## 📋 Overview

This document provides a detailed, step-by-step implementation plan for the HR Round interview system, broken down by task.

---

## 🎯 Task 2.1: Extract HR Questions & Question Selection Logic

### **Objective**
Extract questions from the PDF and create a structured dataset with intelligent question selection.

### **Steps**

#### **Step 1: Extract Questions from PDF**
- **Tool**: Python script using `PyMuPDF` (fitz) or `pdfplumber`
- **Location**: `backend/src/scripts/extract_hr_questions.py`
- **Output**: `backend/src/data/hr-questions.json`

**Script Structure:**
```python
import fitz  # PyMuPDF
import json
import re

def extract_questions_from_pdf(pdf_path):
    # Extract text from PDF
    # Parse questions (look for numbered questions, Q:, etc.)
    # Extract question text, categories, tips
    # Return structured JSON
```

**Expected JSON Format:**
```json
{
  "questions": [
    {
      "id": "hr_001",
      "question": "Tell me about yourself.",
      "category": "Introduction",
      "difficulty": "easy",
      "tags": ["self-introduction", "opening"],
      "estimatedTime": 120,
      "rubric": {
        "clarity": 25,
        "relevance": 30,
        "confidence": 20,
        "professionalism": 25
      }
    }
  ],
  "categories": ["Introduction", "Experience", "Behavioral", "Motivation", "Weakness"],
  "metadata": {
    "totalQuestions": 64,
    "source": "How To Answer the 64 Toughest Interview Questions.pdf"
  }
}
```

#### **Step 2: Create Question Selection Service**
- **File**: `backend/src/services/hr-question.service.js`
- **Logic**:
  - **Fixed Mode**: Select N random questions from dataset
  - **Dynamic Mode**: Use LLM to generate questions based on:
    - Resume analysis results
    - Technical round feedback
    - Previous questions asked
    - Target role/job description

**Selection Algorithm:**
```javascript
class HRQuestionService {
  // Fixed selection (HR-only interview)
  selectFixedQuestions(count = 5) {
    // Random selection with category distribution
    // Ensure variety: 1 intro, 2-3 behavioral, 1-2 closing
  }
  
  // Dynamic selection (Full mock interview)
  async selectDynamicQuestions(context) {
    // Use Modelfile 3 (hr-question-generator)
    // Pass: resume analysis, technical feedback, job description
    // Return: Generated questions
  }
}
```

#### **Step 3: API Endpoint**
- **Route**: `POST /api/hr/select-questions`
- **Request**:
  ```json
  {
    "sessionId": "uuid",
    "mode": "fixed" | "dynamic",
    "count": 5,
    "context": {
      "resumeAnalysis": {...},
      "technicalFeedback": {...},
      "jobDescription": "..."
    }
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "questions": [...],
    "sessionId": "uuid"
  }
  ```

---

## 🎯 Task 2.2: Audio Recording & Transcription

### **Objective**
Implement audio playback for questions, voice recording for answers, and speech-to-text transcription.

### **Steps**

#### **Step 1: Audio Recording Component**
- **File**: `frontend/src/components/hr/AudioRecorder.tsx`
- **Features**:
  - Start/stop recording
  - Visual feedback (waveform, recording indicator)
  - Time limit enforcement
  - Audio playback before submission

**Implementation:**
```typescript
const AudioRecorder = ({ onRecordingComplete, timeLimit }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    
    mediaRecorder.ondataavailable = (e) => {
      chunksRef.current.push(e.data);
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      setAudioBlob(blob);
      onRecordingComplete(blob);
    };
    
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };
  
  // ... rest of component
};
```

#### **Step 2: Question Audio Playback**
- **File**: `frontend/src/components/hr/QuestionPlayer.tsx`
- **Options**:
  - **Option A**: Text-to-Speech (Web Speech API)
  - **Option B**: Pre-recorded audio files
  - **Option C**: Both (TTS for dynamic questions, pre-recorded for fixed)

**TTS Implementation:**
```typescript
const QuestionPlayer = ({ question }) => {
  const speakQuestion = () => {
    const utterance = new SpeechSynthesisUtterance(question);
    utterance.rate = 0.9; // Slightly slower
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };
  
  // ... component
};
```

#### **Step 3: Speech-to-Text Integration**

**Local Whisper Model (Recommended)**
- **File**: `backend/src/services/transcription.service.js`
- **Python Script**: `backend/src/services/transcription/whisper_transcriber.py`
- **Pros**: 
  - ✅ No API keys required
  - ✅ High accuracy (same as OpenAI's API)
  - ✅ Free and unlimited
  - ✅ Privacy (audio never leaves server)
  - ✅ Handles audio files, multiple languages
- **Cons**: Requires model download (~74MB for base), processing time

**Setup:**
```bash
# Install faster-whisper
pip install faster-whisper

# Model downloads automatically on first use
```

**Implementation:**
```javascript
// backend/src/services/transcription.service.js
const { spawn } = require('child_process');
const path = require('path');

class TranscriptionService {
  async transcribeAudio(audioFilePath, language = null) {
    return new Promise((resolve, reject) => {
      const python = spawn('python', [
        path.join(__dirname, 'transcription', 'whisper_transcriber.py'),
        audioFilePath,
        'base', // model size
        language || ''
      ]);

      let stdout = '';
      python.stdout.on('data', (data) => stdout += data.toString());
      
      python.on('close', (code) => {
        if (code === 0) {
          const result = JSON.parse(stdout);
          resolve({
            text: result.text,
            segments: result.segments,
            words: result.words,
            language: result.language
          });
        } else {
          reject(new Error('Transcription failed'));
        }
      });
    });
  }
}
```

See `docs/WHISPER_LOCAL_SETUP.md` for complete implementation details.

#### **Step 4: Audio Upload Endpoint**
- **Route**: `POST /api/hr/upload-audio`
- **Middleware**: `multer` for file upload
- **Process**:
  1. Save audio file temporarily
  2. Transcribe using Whisper API
  3. Return transcription
  4. Store transcription in session (temporary)

```javascript
router.post('/upload-audio',
  authMiddleware.authenticate,
  upload.single('audio'),
  async (req, res) => {
    const { questionId, sessionId } = req.body;
    const audioFile = req.file;
    
    // Transcribe
    const transcription = await transcriptionService.transcribeAudio(audioFile.path);
    
    // Store temporarily in session
    await storeTranscription(sessionId, questionId, transcription);
    
    // Clean up audio file
    fs.unlinkSync(audioFile.path);
    
    res.json({ success: true, transcription });
  }
);
```

---

## 🎯 Task 2.3: HR Round Modelfiles

### **Objective**
Create three Ollama Modelfiles for HR round analysis.

### **Steps**

#### **Modelfile 3: Dynamic Question Generation**
- **File**: `Trial/Modelfile-HR-Question-Generator`
- **Purpose**: Generate next HR question based on context
- **Input**:
  - Resume analysis (strengths, gaps)
  - Technical round feedback (weak areas)
  - Previous HR questions asked
  - User's responses so far
  - Job description

**System Prompt Structure:**
```
You are an expert HR interviewer. Generate the next interview question based on:
1. Resume analysis showing strengths and gaps
2. Technical round performance
3. Previous questions and responses
4. Job requirements

Generate a question that:
- Probes areas of concern from technical round
- Explores gaps identified in resume
- Follows up on previous responses
- Assesses cultural fit and soft skills

Return ONLY valid JSON:
{
  "question": "...",
  "category": "...",
  "rationale": "Why this question is relevant",
  "expectedTopics": ["topic1", "topic2"]
}
```

#### **Modelfile 4: Text Processing & Fluency Analysis**
- **File**: `Trial/Modelfile-HR-Text-Analyzer`
- **Purpose**: Analyze transcribed text for fluency, pacing, content quality

**System Prompt Structure:**
```
You are an expert communication analyst. Analyze the transcribed interview response for:

1. Fluency Metrics:
   - Filler words count (um, uh, like, you know)
   - Pause frequency and duration
   - Speaking rate (words per minute)
   - Silence percentage

2. Content Quality:
   - Relevance to question
   - Structure and organization
   - Completeness of answer
   - Use of examples/STAR method

3. Language Quality:
   - Grammar and clarity
   - Vocabulary sophistication
   - Professional tone

Return ONLY valid JSON:
{
  "fluency": {
    "score": 0-100,
    "fillerWords": ["um", "uh"],
    "fillerWordCount": 5,
    "speakingRate": 150,
    "pauseCount": 3,
    "silencePercentage": 15
  },
  "content": {
    "score": 0-100,
    "relevance": 0-100,
    "structure": "excellent" | "good" | "moderate" | "poor",
    "completeness": 0-100,
    "usesExamples": true
  },
  "language": {
    "score": 0-100,
    "grammar": "excellent" | "good" | "moderate" | "poor",
    "clarity": 0-100,
    "vocabulary": 0-100
  },
  "summary": "..."
}
```

#### **Modelfile 5: Final Comprehensive HR Report**
- **File**: `Trial/Modelfile-HR-Report-Generator`
- **Purpose**: Generate final comprehensive HR assessment

**System Prompt Structure:**
```
You are an expert HR interviewer. Generate a comprehensive assessment report based on:

1. All question responses and transcriptions
2. Text analysis results (fluency, content, language)
3. Rubric scores for each question
4. Overall performance patterns

Provide:
- Overall HR score (0-100)
- Strengths and weaknesses
- Communication skills assessment
- Cultural fit assessment
- Recommendations for improvement

Return ONLY valid JSON:
{
  "overallScore": 0-100,
  "summary": "...",
  "strengths": [...],
  "weaknesses": [...],
  "communicationSkills": {
    "fluency": 0-100,
    "clarity": 0-100,
    "confidence": 0-100
  },
  "rubricScores": {
    "clarity": 0-100,
    "relevance": 0-100,
    "confidence": 0-100,
    "professionalism": 0-100
  },
  "recommendations": [...],
  "suitability": "strong" | "good" | "fair" | "needs_improvement"
}
```

#### **Python Scripts**
Create three Python scripts similar to technical feedback:

1. `hr_question_generator.py` - Calls Modelfile 3
2. `hr_text_analyzer.py` - Calls Modelfile 4
3. `hr_report_generator.py` - Calls Modelfile 5

---

## 🎯 Task 2.4: Storage & Display

### **Objective**
Store HR analysis in PostgreSQL and create frontend display.

### **Steps**

#### **Step 1: Backend API Endpoints**

**Start HR Session:**
```javascript
POST /api/hr/start-session
{
  "sessionType": "hr" | "full_mock",
  "sessionId": "uuid" // If continuing full mock
}
```

**Submit Answer:**
```javascript
POST /api/hr/submit-answer
{
  "sessionId": "uuid",
  "questionId": "hr_001",
  "audioFile": File,
  "transcription": "..." // Optional, if done client-side
}
```

**Complete HR Round:**
```javascript
POST /api/hr/complete-session
{
  "sessionId": "uuid"
}
// Triggers: Text analysis → Final report generation → Storage
```

**Get HR Results:**
```javascript
GET /api/hr/session/:sessionId
// Returns complete HR analysis
```

#### **Step 2: Database Storage**

**Update `session_components` table:**
```sql
-- HR component data structure
{
  "component_type": "hr",
  "component_data": {
    "questions": [...],
    "responses": {
      "hr_001": {
        "transcription": "...",
        "audioUrl": "...", // Temporary, delete after analysis
        "timestamp": "...",
        "duration": 120
      }
    },
    "totalDuration": 1800,
    "questionCount": 5
  },
  "feedback": {
    "overallScore": 75,
    "textAnalysis": {...},
    "rubricScores": {...},
    "recommendations": [...],
    "detailedAnalysis": {...}
  }
}
```

#### **Step 3: Frontend Results Page**
- **File**: `frontend/src/pages/hr/HRResults.tsx`
- **Display**:
  - Overall HR score
  - Question-by-question breakdown
  - Fluency metrics
  - Content quality analysis
  - Recommendations
  - Rubric scores visualization

---

## 📅 Implementation Timeline

### **Week 1: Foundation**
- ✅ Task 2.1: Extract questions, create selection logic
- ✅ Task 2.2: Basic audio recording component

### **Week 2: Core Features**
- ✅ Task 2.2: Complete audio recording, transcription integration
- ✅ Task 2.3: Create Modelfiles and Python scripts

### **Week 3: Analysis & Storage**
- ✅ Task 2.3: Test and refine LLM analysis
- ✅ Task 2.4: Implement storage and API endpoints

### **Week 4: Polish & Testing**
- ✅ Task 2.4: Frontend results display
- ✅ End-to-end testing
- ✅ Bug fixes and optimizations

---

## 🧪 Testing Checklist

- [ ] Question extraction from PDF works correctly
- [ ] Question selection (fixed and dynamic) works
- [ ] Audio recording captures audio properly
- [ ] Transcription is accurate (test with different accents)
- [ ] LLM analysis generates meaningful insights
- [ ] Data is stored correctly in database
- [ ] Results page displays all information
- [ ] Error handling for edge cases
- [ ] Performance with multiple concurrent sessions

---

## 📝 Notes

- Start with MVP (Web Speech API) for transcription
- Upgrade to Whisper API for production
- Consider adding video analysis later (MediaPipe)
- Implement audio file cleanup (delete after 24 hours)
- Add rate limiting for API endpoints
- Consider caching for question selection






## 📋 Overview

This document provides a detailed, step-by-step implementation plan for the HR Round interview system, broken down by task.

---

## 🎯 Task 2.1: Extract HR Questions & Question Selection Logic

### **Objective**
Extract questions from the PDF and create a structured dataset with intelligent question selection.

### **Steps**

#### **Step 1: Extract Questions from PDF**
- **Tool**: Python script using `PyMuPDF` (fitz) or `pdfplumber`
- **Location**: `backend/src/scripts/extract_hr_questions.py`
- **Output**: `backend/src/data/hr-questions.json`

**Script Structure:**
```python
import fitz  # PyMuPDF
import json
import re

def extract_questions_from_pdf(pdf_path):
    # Extract text from PDF
    # Parse questions (look for numbered questions, Q:, etc.)
    # Extract question text, categories, tips
    # Return structured JSON
```

**Expected JSON Format:**
```json
{
  "questions": [
    {
      "id": "hr_001",
      "question": "Tell me about yourself.",
      "category": "Introduction",
      "difficulty": "easy",
      "tags": ["self-introduction", "opening"],
      "estimatedTime": 120,
      "rubric": {
        "clarity": 25,
        "relevance": 30,
        "confidence": 20,
        "professionalism": 25
      }
    }
  ],
  "categories": ["Introduction", "Experience", "Behavioral", "Motivation", "Weakness"],
  "metadata": {
    "totalQuestions": 64,
    "source": "How To Answer the 64 Toughest Interview Questions.pdf"
  }
}
```

#### **Step 2: Create Question Selection Service**
- **File**: `backend/src/services/hr-question.service.js`
- **Logic**:
  - **Fixed Mode**: Select N random questions from dataset
  - **Dynamic Mode**: Use LLM to generate questions based on:
    - Resume analysis results
    - Technical round feedback
    - Previous questions asked
    - Target role/job description

**Selection Algorithm:**
```javascript
class HRQuestionService {
  // Fixed selection (HR-only interview)
  selectFixedQuestions(count = 5) {
    // Random selection with category distribution
    // Ensure variety: 1 intro, 2-3 behavioral, 1-2 closing
  }
  
  // Dynamic selection (Full mock interview)
  async selectDynamicQuestions(context) {
    // Use Modelfile 3 (hr-question-generator)
    // Pass: resume analysis, technical feedback, job description
    // Return: Generated questions
  }
}
```

#### **Step 3: API Endpoint**
- **Route**: `POST /api/hr/select-questions`
- **Request**:
  ```json
  {
    "sessionId": "uuid",
    "mode": "fixed" | "dynamic",
    "count": 5,
    "context": {
      "resumeAnalysis": {...},
      "technicalFeedback": {...},
      "jobDescription": "..."
    }
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "questions": [...],
    "sessionId": "uuid"
  }
  ```

---

## 🎯 Task 2.2: Audio Recording & Transcription

### **Objective**
Implement audio playback for questions, voice recording for answers, and speech-to-text transcription.

### **Steps**

#### **Step 1: Audio Recording Component**
- **File**: `frontend/src/components/hr/AudioRecorder.tsx`
- **Features**:
  - Start/stop recording
  - Visual feedback (waveform, recording indicator)
  - Time limit enforcement
  - Audio playback before submission

**Implementation:**
```typescript
const AudioRecorder = ({ onRecordingComplete, timeLimit }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    
    mediaRecorder.ondataavailable = (e) => {
      chunksRef.current.push(e.data);
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      setAudioBlob(blob);
      onRecordingComplete(blob);
    };
    
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };
  
  // ... rest of component
};
```

#### **Step 2: Question Audio Playback**
- **File**: `frontend/src/components/hr/QuestionPlayer.tsx`
- **Options**:
  - **Option A**: Text-to-Speech (Web Speech API)
  - **Option B**: Pre-recorded audio files
  - **Option C**: Both (TTS for dynamic questions, pre-recorded for fixed)

**TTS Implementation:**
```typescript
const QuestionPlayer = ({ question }) => {
  const speakQuestion = () => {
    const utterance = new SpeechSynthesisUtterance(question);
    utterance.rate = 0.9; // Slightly slower
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };
  
  // ... component
};
```

#### **Step 3: Speech-to-Text Integration**

**Local Whisper Model (Recommended)**
- **File**: `backend/src/services/transcription.service.js`
- **Python Script**: `backend/src/services/transcription/whisper_transcriber.py`
- **Pros**: 
  - ✅ No API keys required
  - ✅ High accuracy (same as OpenAI's API)
  - ✅ Free and unlimited
  - ✅ Privacy (audio never leaves server)
  - ✅ Handles audio files, multiple languages
- **Cons**: Requires model download (~74MB for base), processing time

**Setup:**
```bash
# Install faster-whisper
pip install faster-whisper

# Model downloads automatically on first use
```

**Implementation:**
```javascript
// backend/src/services/transcription.service.js
const { spawn } = require('child_process');
const path = require('path');

class TranscriptionService {
  async transcribeAudio(audioFilePath, language = null) {
    return new Promise((resolve, reject) => {
      const python = spawn('python', [
        path.join(__dirname, 'transcription', 'whisper_transcriber.py'),
        audioFilePath,
        'base', // model size
        language || ''
      ]);

      let stdout = '';
      python.stdout.on('data', (data) => stdout += data.toString());
      
      python.on('close', (code) => {
        if (code === 0) {
          const result = JSON.parse(stdout);
          resolve({
            text: result.text,
            segments: result.segments,
            words: result.words,
            language: result.language
          });
        } else {
          reject(new Error('Transcription failed'));
        }
      });
    });
  }
}
```

See `docs/WHISPER_LOCAL_SETUP.md` for complete implementation details.

#### **Step 4: Audio Upload Endpoint**
- **Route**: `POST /api/hr/upload-audio`
- **Middleware**: `multer` for file upload
- **Process**:
  1. Save audio file temporarily
  2. Transcribe using Whisper API
  3. Return transcription
  4. Store transcription in session (temporary)

```javascript
router.post('/upload-audio',
  authMiddleware.authenticate,
  upload.single('audio'),
  async (req, res) => {
    const { questionId, sessionId } = req.body;
    const audioFile = req.file;
    
    // Transcribe
    const transcription = await transcriptionService.transcribeAudio(audioFile.path);
    
    // Store temporarily in session
    await storeTranscription(sessionId, questionId, transcription);
    
    // Clean up audio file
    fs.unlinkSync(audioFile.path);
    
    res.json({ success: true, transcription });
  }
);
```

---

## 🎯 Task 2.3: HR Round Modelfiles

### **Objective**
Create three Ollama Modelfiles for HR round analysis.

### **Steps**

#### **Modelfile 3: Dynamic Question Generation**
- **File**: `Trial/Modelfile-HR-Question-Generator`
- **Purpose**: Generate next HR question based on context
- **Input**:
  - Resume analysis (strengths, gaps)
  - Technical round feedback (weak areas)
  - Previous HR questions asked
  - User's responses so far
  - Job description

**System Prompt Structure:**
```
You are an expert HR interviewer. Generate the next interview question based on:
1. Resume analysis showing strengths and gaps
2. Technical round performance
3. Previous questions and responses
4. Job requirements

Generate a question that:
- Probes areas of concern from technical round
- Explores gaps identified in resume
- Follows up on previous responses
- Assesses cultural fit and soft skills

Return ONLY valid JSON:
{
  "question": "...",
  "category": "...",
  "rationale": "Why this question is relevant",
  "expectedTopics": ["topic1", "topic2"]
}
```

#### **Modelfile 4: Text Processing & Fluency Analysis**
- **File**: `Trial/Modelfile-HR-Text-Analyzer`
- **Purpose**: Analyze transcribed text for fluency, pacing, content quality

**System Prompt Structure:**
```
You are an expert communication analyst. Analyze the transcribed interview response for:

1. Fluency Metrics:
   - Filler words count (um, uh, like, you know)
   - Pause frequency and duration
   - Speaking rate (words per minute)
   - Silence percentage

2. Content Quality:
   - Relevance to question
   - Structure and organization
   - Completeness of answer
   - Use of examples/STAR method

3. Language Quality:
   - Grammar and clarity
   - Vocabulary sophistication
   - Professional tone

Return ONLY valid JSON:
{
  "fluency": {
    "score": 0-100,
    "fillerWords": ["um", "uh"],
    "fillerWordCount": 5,
    "speakingRate": 150,
    "pauseCount": 3,
    "silencePercentage": 15
  },
  "content": {
    "score": 0-100,
    "relevance": 0-100,
    "structure": "excellent" | "good" | "moderate" | "poor",
    "completeness": 0-100,
    "usesExamples": true
  },
  "language": {
    "score": 0-100,
    "grammar": "excellent" | "good" | "moderate" | "poor",
    "clarity": 0-100,
    "vocabulary": 0-100
  },
  "summary": "..."
}
```

#### **Modelfile 5: Final Comprehensive HR Report**
- **File**: `Trial/Modelfile-HR-Report-Generator`
- **Purpose**: Generate final comprehensive HR assessment

**System Prompt Structure:**
```
You are an expert HR interviewer. Generate a comprehensive assessment report based on:

1. All question responses and transcriptions
2. Text analysis results (fluency, content, language)
3. Rubric scores for each question
4. Overall performance patterns

Provide:
- Overall HR score (0-100)
- Strengths and weaknesses
- Communication skills assessment
- Cultural fit assessment
- Recommendations for improvement

Return ONLY valid JSON:
{
  "overallScore": 0-100,
  "summary": "...",
  "strengths": [...],
  "weaknesses": [...],
  "communicationSkills": {
    "fluency": 0-100,
    "clarity": 0-100,
    "confidence": 0-100
  },
  "rubricScores": {
    "clarity": 0-100,
    "relevance": 0-100,
    "confidence": 0-100,
    "professionalism": 0-100
  },
  "recommendations": [...],
  "suitability": "strong" | "good" | "fair" | "needs_improvement"
}
```

#### **Python Scripts**
Create three Python scripts similar to technical feedback:

1. `hr_question_generator.py` - Calls Modelfile 3
2. `hr_text_analyzer.py` - Calls Modelfile 4
3. `hr_report_generator.py` - Calls Modelfile 5

---

## 🎯 Task 2.4: Storage & Display

### **Objective**
Store HR analysis in PostgreSQL and create frontend display.

### **Steps**

#### **Step 1: Backend API Endpoints**

**Start HR Session:**
```javascript
POST /api/hr/start-session
{
  "sessionType": "hr" | "full_mock",
  "sessionId": "uuid" // If continuing full mock
}
```

**Submit Answer:**
```javascript
POST /api/hr/submit-answer
{
  "sessionId": "uuid",
  "questionId": "hr_001",
  "audioFile": File,
  "transcription": "..." // Optional, if done client-side
}
```

**Complete HR Round:**
```javascript
POST /api/hr/complete-session
{
  "sessionId": "uuid"
}
// Triggers: Text analysis → Final report generation → Storage
```

**Get HR Results:**
```javascript
GET /api/hr/session/:sessionId
// Returns complete HR analysis
```

#### **Step 2: Database Storage**

**Update `session_components` table:**
```sql
-- HR component data structure
{
  "component_type": "hr",
  "component_data": {
    "questions": [...],
    "responses": {
      "hr_001": {
        "transcription": "...",
        "audioUrl": "...", // Temporary, delete after analysis
        "timestamp": "...",
        "duration": 120
      }
    },
    "totalDuration": 1800,
    "questionCount": 5
  },
  "feedback": {
    "overallScore": 75,
    "textAnalysis": {...},
    "rubricScores": {...},
    "recommendations": [...],
    "detailedAnalysis": {...}
  }
}
```

#### **Step 3: Frontend Results Page**
- **File**: `frontend/src/pages/hr/HRResults.tsx`
- **Display**:
  - Overall HR score
  - Question-by-question breakdown
  - Fluency metrics
  - Content quality analysis
  - Recommendations
  - Rubric scores visualization

---

## 📅 Implementation Timeline

### **Week 1: Foundation**
- ✅ Task 2.1: Extract questions, create selection logic
- ✅ Task 2.2: Basic audio recording component

### **Week 2: Core Features**
- ✅ Task 2.2: Complete audio recording, transcription integration
- ✅ Task 2.3: Create Modelfiles and Python scripts

### **Week 3: Analysis & Storage**
- ✅ Task 2.3: Test and refine LLM analysis
- ✅ Task 2.4: Implement storage and API endpoints

### **Week 4: Polish & Testing**
- ✅ Task 2.4: Frontend results display
- ✅ End-to-end testing
- ✅ Bug fixes and optimizations

---

## 🧪 Testing Checklist

- [ ] Question extraction from PDF works correctly
- [ ] Question selection (fixed and dynamic) works
- [ ] Audio recording captures audio properly
- [ ] Transcription is accurate (test with different accents)
- [ ] LLM analysis generates meaningful insights
- [ ] Data is stored correctly in database
- [ ] Results page displays all information
- [ ] Error handling for edge cases
- [ ] Performance with multiple concurrent sessions

---

## 📝 Notes

- Start with MVP (Web Speech API) for transcription
- Upgrade to Whisper API for production
- Consider adding video analysis later (MediaPipe)
- Implement audio file cleanup (delete after 24 hours)
- Add rate limiting for API endpoints
- Consider caching for question selection





