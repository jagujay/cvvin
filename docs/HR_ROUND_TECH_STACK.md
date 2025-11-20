# HR Round Implementation - Tech Stack & Architecture Plan

## 📋 Overview

This document outlines the complete technical stack, architecture, and implementation plan for the HR Round interview system. The HR Round will include audio/video recording, speech-to-text transcription, dynamic question generation, and comprehensive analysis.

## 🎯 Requirements Summary

1. **Task 2.1**: Extract HR questions from PDF and implement question selection logic
2. **Task 2.2**: Implement HR Round with audio playback, voice recording, and transcription
3. **Task 2.3**: Create HR Round Modelfiles (Question Generation, Text Analysis, Final Report)
4. **Task 2.4**: Store HR Round analysis in PostgreSQL and implement display logic

---

## 🛠️ Tech Stack

### **Frontend (React + TypeScript)**

#### **Core Technologies**
- **React 18+** with TypeScript
- **React Router** for navigation
- **Tailwind CSS** + **shadcn/ui** for UI components

#### **Audio/Video Recording**
- **MediaRecorder API** (Browser native)
  - ✅ Built into modern browsers
  - ✅ No external dependencies
  - ✅ Supports audio/video recording
  - ✅ Can export to WebM/MP4 format
  
- **Web Audio API** (for audio analysis)
  - Real-time audio visualization
  - Volume level detection
  - Silence detection

#### **Audio Playback**
- **HTML5 Audio API** or **Howler.js**
  - Simple text-to-speech for question playback
  - Audio controls (play, pause, volume)

#### **Speech-to-Text (STT)**
- **Local Whisper Model (Recommended)**
  - ✅ No API keys required
  - ✅ Completely free, unlimited usage
  - ✅ High accuracy (same as OpenAI's API)
  - ✅ Privacy - audio never leaves server
  - ✅ Offline capable
  - ⚠️ Requires model download (~74MB for base model)
  - ⚠️ Processing time depends on audio length
  
- **Alternative: Web Speech API**
  - ✅ Browser native, no backend needed
  - ✅ Real-time transcription
  - ⚠️ Limited to Chrome/Edge (best support)
  - ⚠️ Lower accuracy than Whisper
  - ⚠️ Accuracy varies by browser

**Recommendation**: Use **Local Whisper Model** (faster-whisper) for best accuracy and privacy.

#### **State Management**
- **React Context API** for session state
- **useState/useReducer** for local component state

---

### **Backend (Node.js + Express)**

#### **Core Technologies**
- **Node.js 18+** with Express.js
- **PostgreSQL** (already set up)
- **Python 3.9+** for LLM interaction

#### **Audio Processing**
- **multer** for audio file uploads
- **fluent-ffmpeg** (optional) for audio format conversion
- **node-wav** for WAV file processing

#### **Speech-to-Text (Backend)**
- **Local Whisper Model** (via `faster-whisper` Python package)
  - ✅ No API keys required
  - ✅ High accuracy transcription
  - ✅ Handles various audio formats
  - ✅ Returns word-level timestamps
  - ✅ Supports 99+ languages
  - ✅ Automatic language detection
  - ⚠️ Requires Python and model download (~74MB base model)
  
- **Implementation**: Python script called from Node.js (similar to technical feedback scripts)

#### **LLM Integration**
- **Ollama** (local LLM) for:
  - Dynamic question generation
  - Text analysis and fluency assessment
  - Final comprehensive report generation

- **Python Scripts** (similar to technical feedback):
  - `hr_question_generator.py` - Generate next questions
  - `hr_text_analyzer.py` - Analyze transcribed text
  - `hr_report_generator.py` - Generate final report

#### **File Storage**
- **Local filesystem** for audio files (temporary)
- **PostgreSQL JSONB** for storing analysis results
- **Optional**: AWS S3 or similar for production audio storage

---

### **Database (PostgreSQL)**

#### **Existing Tables** (Already in `database_setup.sql`)
- `interview_sessions` - Main session table
- `session_components` - Component-specific data (HR round data)

#### **Data Structure for HR Round**
```sql
-- Stored in session_components table
{
  "component_type": "hr",
  "component_data": {
    "questions": [...],           // Array of asked questions
    "responses": {...},           // {questionId: {text, audioUrl, timestamp}}
    "transcriptions": {...},      // {questionId: transcription}
    "totalDuration": 1800,        // Total interview duration in seconds
    "questionCount": 5
  },
  "feedback": {
    "overallScore": 75,
    "textAnalysis": {...},        // Fluency, pacing, content analysis
    "rubricScores": {...},        // Scores by rubric criteria
    "recommendations": [...],
    "detailedAnalysis": {...}
  }
}
```

---

### **LLM Models (Ollama)**

#### **Modelfile 3: Dynamic Question Generation**
- **Model Name**: `hr-question-generator`
- **Base Model**: `llama3.2` or `mistral`
- **Purpose**: Generate next HR question based on:
  - Resume analysis results
  - Technical round feedback
  - Previous HR questions asked
  - User's responses so far

#### **Modelfile 4: Text Processing and Fluency Analysis**
- **Model Name**: `hr-text-analyzer`
- **Base Model**: `llama3.2`
- **Purpose**: Analyze transcribed text for:
  - Fluency and pacing
  - Stop words and filler words ("um", "uh", "like")
  - Speaking vs. silence time
  - Content quality and relevance
  - Grammar and clarity

#### **Modelfile 5: Final Comprehensive HR Report**
- **Model Name**: `hr-report-generator`
- **Base Model**: `llama3.2`
- **Purpose**: Generate final comprehensive report:
  - Overall assessment
  - Content quality analysis
  - Fluency and communication skills
  - Body language insights (if video available)
  - Character and suitability assessment
  - Actionable recommendations

---

## 🏗️ Architecture

### **System Flow**

```
┌─────────────────────────────────────────────────────────────┐
│                    HR Round Interview Flow                   │
└─────────────────────────────────────────────────────────────┘

1. User Starts HR Round
   ├─> Frontend: HRSession.tsx
   ├─> Backend: POST /api/hr/start-session
   └─> Database: Create interview_sessions entry

2. Question Selection
   ├─> If Full Mock: Use resume + technical analysis
   ├─> If HR Only: Use fixed question set
   └─> Backend: Generate/Select questions

3. For Each Question:
   ├─> Frontend: Play question audio (TTS or pre-recorded)
   ├─> Frontend: Start recording (MediaRecorder API)
   ├─> User speaks answer
   ├─> Frontend: Stop recording
   ├─> Frontend: Upload audio to backend
   ├─> Backend: Transcribe audio (Whisper API)
   ├─> Backend: Store transcription temporarily
   └─> Frontend: Show next question

4. After All Questions:
   ├─> Backend: Analyze all transcriptions
   │   ├─> Text Analysis (Modelfile 4)
   │   └─> Generate Final Report (Modelfile 5)
   ├─> Backend: Store analysis in session_components
   ├─> Backend: Delete temporary audio files
   └─> Frontend: Display results

5. Display Results
   ├─> Frontend: Fetch session data
   ├─> Frontend: Display comprehensive report
   └─> Frontend: Show recommendations
```

---

## 📁 File Structure

```
backend/
├── src/
│   ├── routes/
│   │   └── hr.routes.js              # HR round API endpoints
│   ├── services/
│   │   ├── hr-feedback.service.js     # Main HR service
│   │   └── hr-feedback/
│   │       ├── hr_question_generator.py
│   │       ├── hr_text_analyzer.py
│   │       └── hr_report_generator.py
│   ├── utils/
│   │   └── audioProcessor.js          # Audio processing utilities
│   └── data/
│       └── hr-questions.json          # Extracted questions from PDF

frontend/
├── src/
│   ├── pages/
│   │   └── hr/
│   │       ├── HRSession.tsx         # Main HR interview page
│   │       └── HRResults.tsx          # Results display page
│   ├── components/
│   │   └── hr/
│   │       ├── AudioRecorder.tsx      # Audio recording component
│   │       ├── QuestionPlayer.tsx     # Question audio player
│   │       └── TranscriptionView.tsx  # Show transcription
│   └── services/
│       └── hrAPI.ts                   # HR API service

Trial/
├── Modelfile-HR-Question-Generator
├── Modelfile-HR-Text-Analyzer
└── Modelfile-HR-Report-Generator
```

---

## 🔧 Implementation Phases

### **Phase 1: Question Extraction & Selection (Task 2.1)**
1. Extract questions from PDF
2. Create structured JSON dataset
3. Implement question selection logic
4. Support both fixed and dynamic question generation

### **Phase 2: Audio Recording & Transcription (Task 2.2)**
1. Implement MediaRecorder for audio capture
2. Add audio playback for questions
3. Integrate speech-to-text (Web Speech API or Whisper)
4. Store transcriptions temporarily

### **Phase 3: LLM Analysis (Task 2.3)**
1. Create Modelfile 3: Question Generator
2. Create Modelfile 4: Text Analyzer
3. Create Modelfile 5: Report Generator
4. Implement Python scripts for each

### **Phase 4: Storage & Display (Task 2.4)**
1. Store HR analysis in PostgreSQL
2. Create API endpoints for fetching results
3. Build frontend results page
4. Display comprehensive report

---

## 🎤 Audio Recording Specifications

### **Format**
- **Codec**: Opus (WebM) or AAC (MP4)
- **Sample Rate**: 16kHz (minimum), 44.1kHz (preferred)
- **Bitrate**: 64kbps (speech), 128kbps (preferred)
- **Channels**: Mono (speech)

### **File Size Estimates**
- 1 minute of audio: ~500KB (64kbps) to ~1MB (128kbps)
- 5 questions × 2 minutes each: ~5-10MB total
- Store temporarily, delete after analysis

---

## 🔐 Security & Privacy

1. **Audio Files**: 
   - Store temporarily (24 hours max)
   - Delete after analysis completes
   - Encrypt in transit (HTTPS)

2. **Transcriptions**:
   - Store in database (JSONB)
   - Include in analysis only
   - User can request deletion

3. **API Keys**:
   - Store Whisper API key in environment variables
   - Never expose in frontend code

---

## 📊 Analysis Metrics

### **Text Analysis Metrics**
- **Fluency Score**: Based on pause frequency, filler words
- **Pacing**: Words per minute, speaking rate
- **Content Quality**: Relevance, structure, completeness
- **Grammar & Clarity**: Sentence structure, vocabulary

### **Rubric Scores** (per question)
- Clarity (25%)
- Relevance (30%)
- Confidence (20%)
- Professionalism (25%)

### **Overall HR Score**
- Weighted average of all rubric scores
- Combined with text analysis metrics
- Final recommendation (Strong, Good, Fair, Needs Improvement)

---

## 🚀 Next Steps

1. **Extract questions from PDF** → Create `hr-questions.json`
2. **Set up audio recording** → Implement `AudioRecorder.tsx`
3. **Integrate speech-to-text** → Choose Web Speech API or Whisper
4. **Create Modelfiles** → Set up Ollama models
5. **Build backend API** → Create HR routes and services
6. **Implement frontend** → Complete HR interview flow
7. **Test end-to-end** → Verify full workflow

---

## 📝 Notes

- **MVP Approach**: Start with Web Speech API (free, browser-native)
- **Production Upgrade**: Move to Whisper API for better accuracy
- **Video Analysis**: Can be added later using MediaPipe or similar
- **Real-time Analysis**: Can stream transcription for live feedback (future enhancement)






## 📋 Overview

This document outlines the complete technical stack, architecture, and implementation plan for the HR Round interview system. The HR Round will include audio/video recording, speech-to-text transcription, dynamic question generation, and comprehensive analysis.

## 🎯 Requirements Summary

1. **Task 2.1**: Extract HR questions from PDF and implement question selection logic
2. **Task 2.2**: Implement HR Round with audio playback, voice recording, and transcription
3. **Task 2.3**: Create HR Round Modelfiles (Question Generation, Text Analysis, Final Report)
4. **Task 2.4**: Store HR Round analysis in PostgreSQL and implement display logic

---

## 🛠️ Tech Stack

### **Frontend (React + TypeScript)**

#### **Core Technologies**
- **React 18+** with TypeScript
- **React Router** for navigation
- **Tailwind CSS** + **shadcn/ui** for UI components

#### **Audio/Video Recording**
- **MediaRecorder API** (Browser native)
  - ✅ Built into modern browsers
  - ✅ No external dependencies
  - ✅ Supports audio/video recording
  - ✅ Can export to WebM/MP4 format
  
- **Web Audio API** (for audio analysis)
  - Real-time audio visualization
  - Volume level detection
  - Silence detection

#### **Audio Playback**
- **HTML5 Audio API** or **Howler.js**
  - Simple text-to-speech for question playback
  - Audio controls (play, pause, volume)

#### **Speech-to-Text (STT)**
- **Local Whisper Model (Recommended)**
  - ✅ No API keys required
  - ✅ Completely free, unlimited usage
  - ✅ High accuracy (same as OpenAI's API)
  - ✅ Privacy - audio never leaves server
  - ✅ Offline capable
  - ⚠️ Requires model download (~74MB for base model)
  - ⚠️ Processing time depends on audio length
  
- **Alternative: Web Speech API**
  - ✅ Browser native, no backend needed
  - ✅ Real-time transcription
  - ⚠️ Limited to Chrome/Edge (best support)
  - ⚠️ Lower accuracy than Whisper
  - ⚠️ Accuracy varies by browser

**Recommendation**: Use **Local Whisper Model** (faster-whisper) for best accuracy and privacy.

#### **State Management**
- **React Context API** for session state
- **useState/useReducer** for local component state

---

### **Backend (Node.js + Express)**

#### **Core Technologies**
- **Node.js 18+** with Express.js
- **PostgreSQL** (already set up)
- **Python 3.9+** for LLM interaction

#### **Audio Processing**
- **multer** for audio file uploads
- **fluent-ffmpeg** (optional) for audio format conversion
- **node-wav** for WAV file processing

#### **Speech-to-Text (Backend)**
- **Local Whisper Model** (via `faster-whisper` Python package)
  - ✅ No API keys required
  - ✅ High accuracy transcription
  - ✅ Handles various audio formats
  - ✅ Returns word-level timestamps
  - ✅ Supports 99+ languages
  - ✅ Automatic language detection
  - ⚠️ Requires Python and model download (~74MB base model)
  
- **Implementation**: Python script called from Node.js (similar to technical feedback scripts)

#### **LLM Integration**
- **Ollama** (local LLM) for:
  - Dynamic question generation
  - Text analysis and fluency assessment
  - Final comprehensive report generation

- **Python Scripts** (similar to technical feedback):
  - `hr_question_generator.py` - Generate next questions
  - `hr_text_analyzer.py` - Analyze transcribed text
  - `hr_report_generator.py` - Generate final report

#### **File Storage**
- **Local filesystem** for audio files (temporary)
- **PostgreSQL JSONB** for storing analysis results
- **Optional**: AWS S3 or similar for production audio storage

---

### **Database (PostgreSQL)**

#### **Existing Tables** (Already in `database_setup.sql`)
- `interview_sessions` - Main session table
- `session_components` - Component-specific data (HR round data)

#### **Data Structure for HR Round**
```sql
-- Stored in session_components table
{
  "component_type": "hr",
  "component_data": {
    "questions": [...],           // Array of asked questions
    "responses": {...},           // {questionId: {text, audioUrl, timestamp}}
    "transcriptions": {...},      // {questionId: transcription}
    "totalDuration": 1800,        // Total interview duration in seconds
    "questionCount": 5
  },
  "feedback": {
    "overallScore": 75,
    "textAnalysis": {...},        // Fluency, pacing, content analysis
    "rubricScores": {...},        // Scores by rubric criteria
    "recommendations": [...],
    "detailedAnalysis": {...}
  }
}
```

---

### **LLM Models (Ollama)**

#### **Modelfile 3: Dynamic Question Generation**
- **Model Name**: `hr-question-generator`
- **Base Model**: `llama3.2` or `mistral`
- **Purpose**: Generate next HR question based on:
  - Resume analysis results
  - Technical round feedback
  - Previous HR questions asked
  - User's responses so far

#### **Modelfile 4: Text Processing and Fluency Analysis**
- **Model Name**: `hr-text-analyzer`
- **Base Model**: `llama3.2`
- **Purpose**: Analyze transcribed text for:
  - Fluency and pacing
  - Stop words and filler words ("um", "uh", "like")
  - Speaking vs. silence time
  - Content quality and relevance
  - Grammar and clarity

#### **Modelfile 5: Final Comprehensive HR Report**
- **Model Name**: `hr-report-generator`
- **Base Model**: `llama3.2`
- **Purpose**: Generate final comprehensive report:
  - Overall assessment
  - Content quality analysis
  - Fluency and communication skills
  - Body language insights (if video available)
  - Character and suitability assessment
  - Actionable recommendations

---

## 🏗️ Architecture

### **System Flow**

```
┌─────────────────────────────────────────────────────────────┐
│                    HR Round Interview Flow                   │
└─────────────────────────────────────────────────────────────┘

1. User Starts HR Round
   ├─> Frontend: HRSession.tsx
   ├─> Backend: POST /api/hr/start-session
   └─> Database: Create interview_sessions entry

2. Question Selection
   ├─> If Full Mock: Use resume + technical analysis
   ├─> If HR Only: Use fixed question set
   └─> Backend: Generate/Select questions

3. For Each Question:
   ├─> Frontend: Play question audio (TTS or pre-recorded)
   ├─> Frontend: Start recording (MediaRecorder API)
   ├─> User speaks answer
   ├─> Frontend: Stop recording
   ├─> Frontend: Upload audio to backend
   ├─> Backend: Transcribe audio (Whisper API)
   ├─> Backend: Store transcription temporarily
   └─> Frontend: Show next question

4. After All Questions:
   ├─> Backend: Analyze all transcriptions
   │   ├─> Text Analysis (Modelfile 4)
   │   └─> Generate Final Report (Modelfile 5)
   ├─> Backend: Store analysis in session_components
   ├─> Backend: Delete temporary audio files
   └─> Frontend: Display results

5. Display Results
   ├─> Frontend: Fetch session data
   ├─> Frontend: Display comprehensive report
   └─> Frontend: Show recommendations
```

---

## 📁 File Structure

```
backend/
├── src/
│   ├── routes/
│   │   └── hr.routes.js              # HR round API endpoints
│   ├── services/
│   │   ├── hr-feedback.service.js     # Main HR service
│   │   └── hr-feedback/
│   │       ├── hr_question_generator.py
│   │       ├── hr_text_analyzer.py
│   │       └── hr_report_generator.py
│   ├── utils/
│   │   └── audioProcessor.js          # Audio processing utilities
│   └── data/
│       └── hr-questions.json          # Extracted questions from PDF

frontend/
├── src/
│   ├── pages/
│   │   └── hr/
│   │       ├── HRSession.tsx         # Main HR interview page
│   │       └── HRResults.tsx          # Results display page
│   ├── components/
│   │   └── hr/
│   │       ├── AudioRecorder.tsx      # Audio recording component
│   │       ├── QuestionPlayer.tsx     # Question audio player
│   │       └── TranscriptionView.tsx  # Show transcription
│   └── services/
│       └── hrAPI.ts                   # HR API service

Trial/
├── Modelfile-HR-Question-Generator
├── Modelfile-HR-Text-Analyzer
└── Modelfile-HR-Report-Generator
```

---

## 🔧 Implementation Phases

### **Phase 1: Question Extraction & Selection (Task 2.1)**
1. Extract questions from PDF
2. Create structured JSON dataset
3. Implement question selection logic
4. Support both fixed and dynamic question generation

### **Phase 2: Audio Recording & Transcription (Task 2.2)**
1. Implement MediaRecorder for audio capture
2. Add audio playback for questions
3. Integrate speech-to-text (Web Speech API or Whisper)
4. Store transcriptions temporarily

### **Phase 3: LLM Analysis (Task 2.3)**
1. Create Modelfile 3: Question Generator
2. Create Modelfile 4: Text Analyzer
3. Create Modelfile 5: Report Generator
4. Implement Python scripts for each

### **Phase 4: Storage & Display (Task 2.4)**
1. Store HR analysis in PostgreSQL
2. Create API endpoints for fetching results
3. Build frontend results page
4. Display comprehensive report

---

## 🎤 Audio Recording Specifications

### **Format**
- **Codec**: Opus (WebM) or AAC (MP4)
- **Sample Rate**: 16kHz (minimum), 44.1kHz (preferred)
- **Bitrate**: 64kbps (speech), 128kbps (preferred)
- **Channels**: Mono (speech)

### **File Size Estimates**
- 1 minute of audio: ~500KB (64kbps) to ~1MB (128kbps)
- 5 questions × 2 minutes each: ~5-10MB total
- Store temporarily, delete after analysis

---

## 🔐 Security & Privacy

1. **Audio Files**: 
   - Store temporarily (24 hours max)
   - Delete after analysis completes
   - Encrypt in transit (HTTPS)

2. **Transcriptions**:
   - Store in database (JSONB)
   - Include in analysis only
   - User can request deletion

3. **API Keys**:
   - Store Whisper API key in environment variables
   - Never expose in frontend code

---

## 📊 Analysis Metrics

### **Text Analysis Metrics**
- **Fluency Score**: Based on pause frequency, filler words
- **Pacing**: Words per minute, speaking rate
- **Content Quality**: Relevance, structure, completeness
- **Grammar & Clarity**: Sentence structure, vocabulary

### **Rubric Scores** (per question)
- Clarity (25%)
- Relevance (30%)
- Confidence (20%)
- Professionalism (25%)

### **Overall HR Score**
- Weighted average of all rubric scores
- Combined with text analysis metrics
- Final recommendation (Strong, Good, Fair, Needs Improvement)

---

## 🚀 Next Steps

1. **Extract questions from PDF** → Create `hr-questions.json`
2. **Set up audio recording** → Implement `AudioRecorder.tsx`
3. **Integrate speech-to-text** → Choose Web Speech API or Whisper
4. **Create Modelfiles** → Set up Ollama models
5. **Build backend API** → Create HR routes and services
6. **Implement frontend** → Complete HR interview flow
7. **Test end-to-end** → Verify full workflow

---

## 📝 Notes

- **MVP Approach**: Start with Web Speech API (free, browser-native)
- **Production Upgrade**: Move to Whisper API for better accuracy
- **Video Analysis**: Can be added later using MediaPipe or similar
- **Real-time Analysis**: Can stream transcription for live feedback (future enhancement)





