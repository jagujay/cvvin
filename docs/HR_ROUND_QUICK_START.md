# HR Round Implementation - Quick Start Guide

## 🚀 Tech Stack Summary

### **Frontend**
- **Audio Recording**: MediaRecorder API (browser-native)
- **Speech-to-Text**: Local Whisper Model (faster-whisper, no API keys)
- **Audio Playback**: HTML5 Audio API / Web Speech Synthesis
- **UI**: React + TypeScript + Tailwind CSS + shadcn/ui

### **Backend**
- **Runtime**: Node.js + Express.js
- **Database**: PostgreSQL (existing tables)
- **LLM**: Ollama (local) with 3 custom models
- **Transcription**: Local Whisper Model (faster-whisper, no API keys)
- **File Handling**: multer for uploads, temporary storage

### **LLM Models (Ollama)**
1. **hr-question-generator** - Dynamic question generation
2. **hr-text-analyzer** - Text/fluency analysis
3. **hr-report-generator** - Final comprehensive report

---

## 📁 Key Files to Create

### **Backend**
```
backend/src/
├── routes/hr.routes.js
├── services/
│   ├── hr-question.service.js
│   ├── hr-feedback.service.js
│   ├── transcription.service.js
│   └── hr-feedback/
│       ├── hr_question_generator.py
│       ├── hr_text_analyzer.py
│       └── hr_report_generator.py
├── data/hr-questions.json
└── scripts/extract_hr_questions.py
```

### **Frontend**
```
frontend/src/
├── pages/hr/
│   ├── HRSession.tsx (update existing)
│   └── HRResults.tsx (new)
├── components/hr/
│   ├── AudioRecorder.tsx (new)
│   ├── QuestionPlayer.tsx (new)
│   └── TranscriptionView.tsx (new)
└── services/hrAPI.ts (new)
```

### **Modelfiles**
```
Trial/
├── Modelfile-HR-Question-Generator
├── Modelfile-HR-Text-Analyzer
└── Modelfile-HR-Report-Generator
```

---

## 🔧 Setup Steps

### **1. Extract Questions from PDF**
```bash
cd backend/src/scripts
python extract_hr_questions.py
# Output: ../data/hr-questions.json
```

### **2. Create Ollama Models**
```bash
# From project root
ollama create hr-question-generator -f Trial/Modelfile-HR-Question-Generator
ollama create hr-text-analyzer -f Trial/Modelfile-HR-Text-Analyzer
ollama create hr-report-generator -f Trial/Modelfile-HR-Report-Generator
```

### **3. Install Dependencies**

**Backend:**
```bash
cd backend
npm install multer
pip install faster-whisper PyMuPDF
# Note: faster-whisper will download the model automatically on first use
```

**Frontend:**
```bash
cd frontend
npm install howler  # Optional, for better audio handling
```

### **4. Environment Variables**
```env
# backend/.env
OLLAMA_BASE_URL=http://localhost:11434
WHISPER_MODEL_SIZE=base          # tiny, base, small, medium, large-v2
WHISPER_DEVICE=cpu               # cpu or cuda (if GPU available)
```

---

## 🎯 Implementation Order

1. **Task 2.1**: Extract questions → Create selection logic
2. **Task 2.2**: Audio recording → Transcription
3. **Task 2.3**: Create Modelfiles → Python scripts
4. **Task 2.4**: Storage → Display

---

## 📊 Data Flow

```
User → Start HR Round
  ↓
Select Questions (Fixed or Dynamic)
  ↓
For Each Question:
  Play Question Audio
  ↓
  Record User Response
  ↓
  Upload Audio → Transcribe
  ↓
  Store Transcription (temporary)
  ↓
After All Questions:
  Analyze All Transcriptions
  ↓
  Generate Final Report
  ↓
  Store in Database
  ↓
  Display Results
```

---

## 🔑 Key Decisions

### **Transcription: Local Whisper Model**
- **No API keys needed** - Runs entirely on your server
- **Free and unlimited** - No usage costs
- **High accuracy** - Same model as OpenAI's API
- **Privacy** - Audio never leaves your server

### **Question Selection**
- **Fixed Mode**: Random selection from dataset (HR-only interview)
- **Dynamic Mode**: LLM-generated based on context (Full mock interview)

### **Audio Storage**
- **Temporary**: Store for 24 hours, delete after analysis
- **Production**: Consider S3 or similar for scalability

---

## 🐛 Common Issues & Solutions

### **Issue: MediaRecorder not supported**
- **Solution**: Check browser compatibility, use polyfill if needed

### **Issue: Web Speech API not working**
- **Solution**: Use HTTPS, check browser permissions, fallback to Whisper API

### **Issue: Ollama models not found**
- **Solution**: Run `ollama list` to verify, recreate models if needed

### **Issue: Audio file too large**
- **Solution**: Compress audio, set time limits, use streaming upload

---

## 📚 Documentation

- **Tech Stack**: `docs/HR_ROUND_TECH_STACK.md`
- **Implementation Plan**: `docs/HR_ROUND_IMPLEMENTATION_PLAN.md`
- **This Guide**: `docs/HR_ROUND_QUICK_START.md`

---

## ✅ Next Steps

1. Start with **Task 2.1**: Extract questions from PDF
2. Create basic **audio recording component**
3. Set up **transcription service** (start with Web Speech API)
4. Create **Modelfiles** and test with Ollama
5. Build **backend API** endpoints
6. Implement **frontend results page**

---

## 💡 Tips

- Test audio recording in different browsers
- Start with fixed question mode (simpler)
- Use mock data for testing before integrating real transcription
- Test Ollama models individually before full integration
- Implement error handling early (audio permissions, API failures)






## 🚀 Tech Stack Summary

### **Frontend**
- **Audio Recording**: MediaRecorder API (browser-native)
- **Speech-to-Text**: Local Whisper Model (faster-whisper, no API keys)
- **Audio Playback**: HTML5 Audio API / Web Speech Synthesis
- **UI**: React + TypeScript + Tailwind CSS + shadcn/ui

### **Backend**
- **Runtime**: Node.js + Express.js
- **Database**: PostgreSQL (existing tables)
- **LLM**: Ollama (local) with 3 custom models
- **Transcription**: Local Whisper Model (faster-whisper, no API keys)
- **File Handling**: multer for uploads, temporary storage

### **LLM Models (Ollama)**
1. **hr-question-generator** - Dynamic question generation
2. **hr-text-analyzer** - Text/fluency analysis
3. **hr-report-generator** - Final comprehensive report

---

## 📁 Key Files to Create

### **Backend**
```
backend/src/
├── routes/hr.routes.js
├── services/
│   ├── hr-question.service.js
│   ├── hr-feedback.service.js
│   ├── transcription.service.js
│   └── hr-feedback/
│       ├── hr_question_generator.py
│       ├── hr_text_analyzer.py
│       └── hr_report_generator.py
├── data/hr-questions.json
└── scripts/extract_hr_questions.py
```

### **Frontend**
```
frontend/src/
├── pages/hr/
│   ├── HRSession.tsx (update existing)
│   └── HRResults.tsx (new)
├── components/hr/
│   ├── AudioRecorder.tsx (new)
│   ├── QuestionPlayer.tsx (new)
│   └── TranscriptionView.tsx (new)
└── services/hrAPI.ts (new)
```

### **Modelfiles**
```
Trial/
├── Modelfile-HR-Question-Generator
├── Modelfile-HR-Text-Analyzer
└── Modelfile-HR-Report-Generator
```

---

## 🔧 Setup Steps

### **1. Extract Questions from PDF**
```bash
cd backend/src/scripts
python extract_hr_questions.py
# Output: ../data/hr-questions.json
```

### **2. Create Ollama Models**
```bash
# From project root
ollama create hr-question-generator -f Trial/Modelfile-HR-Question-Generator
ollama create hr-text-analyzer -f Trial/Modelfile-HR-Text-Analyzer
ollama create hr-report-generator -f Trial/Modelfile-HR-Report-Generator
```

### **3. Install Dependencies**

**Backend:**
```bash
cd backend
npm install multer
pip install faster-whisper PyMuPDF
# Note: faster-whisper will download the model automatically on first use
```

**Frontend:**
```bash
cd frontend
npm install howler  # Optional, for better audio handling
```

### **4. Environment Variables**
```env
# backend/.env
OLLAMA_BASE_URL=http://localhost:11434
WHISPER_MODEL_SIZE=base          # tiny, base, small, medium, large-v2
WHISPER_DEVICE=cpu               # cpu or cuda (if GPU available)
```

---

## 🎯 Implementation Order

1. **Task 2.1**: Extract questions → Create selection logic
2. **Task 2.2**: Audio recording → Transcription
3. **Task 2.3**: Create Modelfiles → Python scripts
4. **Task 2.4**: Storage → Display

---

## 📊 Data Flow

```
User → Start HR Round
  ↓
Select Questions (Fixed or Dynamic)
  ↓
For Each Question:
  Play Question Audio
  ↓
  Record User Response
  ↓
  Upload Audio → Transcribe
  ↓
  Store Transcription (temporary)
  ↓
After All Questions:
  Analyze All Transcriptions
  ↓
  Generate Final Report
  ↓
  Store in Database
  ↓
  Display Results
```

---

## 🔑 Key Decisions

### **Transcription: Local Whisper Model**
- **No API keys needed** - Runs entirely on your server
- **Free and unlimited** - No usage costs
- **High accuracy** - Same model as OpenAI's API
- **Privacy** - Audio never leaves your server

### **Question Selection**
- **Fixed Mode**: Random selection from dataset (HR-only interview)
- **Dynamic Mode**: LLM-generated based on context (Full mock interview)

### **Audio Storage**
- **Temporary**: Store for 24 hours, delete after analysis
- **Production**: Consider S3 or similar for scalability

---

## 🐛 Common Issues & Solutions

### **Issue: MediaRecorder not supported**
- **Solution**: Check browser compatibility, use polyfill if needed

### **Issue: Web Speech API not working**
- **Solution**: Use HTTPS, check browser permissions, fallback to Whisper API

### **Issue: Ollama models not found**
- **Solution**: Run `ollama list` to verify, recreate models if needed

### **Issue: Audio file too large**
- **Solution**: Compress audio, set time limits, use streaming upload

---

## 📚 Documentation

- **Tech Stack**: `docs/HR_ROUND_TECH_STACK.md`
- **Implementation Plan**: `docs/HR_ROUND_IMPLEMENTATION_PLAN.md`
- **This Guide**: `docs/HR_ROUND_QUICK_START.md`

---

## ✅ Next Steps

1. Start with **Task 2.1**: Extract questions from PDF
2. Create basic **audio recording component**
3. Set up **transcription service** (start with Web Speech API)
4. Create **Modelfiles** and test with Ollama
5. Build **backend API** endpoints
6. Implement **frontend results page**

---

## 💡 Tips

- Test audio recording in different browsers
- Start with fixed question mode (simpler)
- Use mock data for testing before integrating real transcription
- Test Ollama models individually before full integration
- Implement error handling early (audio permissions, API failures)





