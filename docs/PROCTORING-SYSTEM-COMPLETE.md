# Proctoring System - Complete Implementation

## Overview

The complete proctoring system for CVVIN Platform has been implemented, covering extension detection, media permissions, user verification, gaze calibration, and violation monitoring throughout the technical interview process.

## System Components

### 1. Extension Detection ✅
- Multiple detection methods (ping, message listener, API check)
- Browser compatibility check (Chrome/Edge)
- Auto-reload prompt when extension is installed but content script not loaded
- Troubleshooting tips UI

### 2. Media Permissions ✅
- Camera and microphone access
- Permission verification
- Stream management and cleanup
- Error handling with user-friendly messages

### 3. User Verification ✅
**Two Methods:**

**a. Profile Photo Verification**
- Loads user's profile image
- Handles authenticated image URLs with CORS bypass
- Blob URL conversion for secure image loading
- Real-time face detection and comparison
- Similarity threshold validation

**b. ID Card Verification**
- Live camera feed for ID card capture
- OCR text extraction using Tesseract.js
- Face detection on ID card
- Face comparison with live camera feed

### 4. Gaze Calibration ✅
- WebGazer.js integration
- 9-point calibration process
- Visual feedback during calibration
- Progress tracking
- Calibration quality validation

### 5. Violation Monitoring ✅ (NEW)
**Violation Types Detected:**
- TAB_SWITCH - User switches browser tabs
- WINDOW_SWITCH - User switches to another window/app
- FULLSCREEN_EXIT - User exits fullscreen mode
- OBJECT_DETECTED - Prohibited object in frame (from extension)
- MULTIPLE_FACES - Multiple people detected (from extension)
- AUDIO_DETECTED - Suspicious audio detected (from extension)

**Features:**
- Real-time detection using browser events
- Toast notifications color-coded by severity
- Violation storage in memory during interview
- Database persistence on submission
- Statistics and analytics

## Interview Flow

```
┌─────────────────────────────────────────┐
│  1. START TECHNICAL INTERVIEW           │
│     User clicks "Start Interview"       │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  2. PROCTORING SETUP                    │
│     ├─ Check Extension                  │
│     ├─ Request Media Permissions        │
│     ├─ User Verification                │
│     │   ├─ Profile Photo OR             │
│     │   └─ ID Card                      │
│     └─ Gaze Calibration                 │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  3. MCQ ROUND                           │
│     ├─ START VIOLATION MONITORING       │
│     ├─ Show Questions                   │
│     ├─ Monitor for Violations           │
│     │   └─ Show Toast on Detect         │
│     └─ Submit Answers                   │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  4. CODING ROUND                        │
│     ├─ CONTINUE VIOLATION MONITORING    │
│     ├─ Show Problem                     │
│     ├─ Code Editor                      │
│     ├─ Monitor for Violations           │
│     │   └─ Show Toast on Detect         │
│     └─ Submit Solution                  │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  5. SUBMISSION & CLEANUP                │
│     ├─ Execute ALL Test Cases           │
│     ├─ Save Coding Solution             │
│     ├─ SAVE VIOLATIONS TO DATABASE      │
│     ├─ Generate Combined Analysis       │
│     ├─ STOP VIOLATION MONITORING        │
│     ├─ Exit Fullscreen                  │
│     └─ Navigate to Feedback             │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  6. FEEDBACK PAGE                       │
│     ├─ MCQ Analysis                     │
│     ├─ Coding Analysis                  │
│     ├─ Combined Score                   │
│     └─ Recommendations                  │
└─────────────────────────────────────────┘
```

## File Structure

### Frontend

```
frontend/src/
├── services/
│   ├── proctoringService.ts        # Core proctoring logic + violations
│   ├── faceVerificationService.ts  # Face-api.js integration
│   ├── gazeCalibrationService.ts   # WebGazer.js integration
│   └── consolidatedAPI.ts          # Backend API client + violation endpoints
│
├── components/proctoring/
│   └── ProctoringSetup.tsx         # Complete setup flow UI
│
└── pages/technical/
    ├── MCQTest.tsx                 # MCQ with violation monitoring
    └── CodingChallenge.tsx         # Coding with violation monitoring + save
```

### Backend

```
backend/src/
├── routes/
│   ├── proctoring.routes.js        # Violation API endpoints
│   ├── technical.routes.js         # MCQ/Coding submission
│   └── sessions.routes.js          # Session management + delete
│
└── migrations/
    └── create_proctoring_violations_table.sql  # Database schema
```

## API Endpoints

### Proctoring API
- `POST /api/proctoring/violations` - Store violations
- `GET /api/proctoring/violations/:sessionId` - Get violations
- `DELETE /api/proctoring/violations/:sessionId` - Delete violations

### Technical API
- `POST /api/technical/submit-mcq` - Submit MCQ answers
- `POST /api/technical/submit-coding` - Submit coding solution
- `POST /api/technical/generate-combined-analysis` - Generate feedback
- `POST /api/code/execute` - Execute code with test cases

### Sessions API
- `GET /api/sessions` - Get all user sessions
- `GET /api/sessions/:sessionId` - Get single session with components
- `DELETE /api/sessions/:sessionId` - Delete session

## Database Schema

### Tables Used

**1. interview_sessions**
- Stores overall session information
- Links MCQ and Coding components
- Tracks status, scores, and timestamps

**2. session_components**
- Stores individual component data (MCQ, Coding, HR)
- Links to interview_sessions
- Stores component-specific feedback

**3. proctoring_violations (NEW)**
- Stores all detected violations
- Links to interview_sessions (cascade delete)
- Indexed for fast queries

## Testing Guide

### 1. Complete Setup
```
1. Open browser console (F12)
2. Navigate to Dashboard
3. Click "Start Technical Interview"
4. Complete each setup step:
   - Install extension (if not installed)
   - Allow camera/microphone
   - Choose verification method
   - Complete calibration
5. Click "Start Interview"
```

### 2. Test Violations
```
During MCQ/Coding:
1. Press Alt+Tab (switch tab) → Toast appears
2. Click another window → Toast appears
3. Press Esc (exit fullscreen) → Toast appears
4. Check console for logs
```

### 3. Verify Storage
```
After submission:
1. Check console for "Saving X violations to database"
2. Check console for "Violations saved successfully"
3. Query database:
   SELECT * FROM proctoring_violations 
   WHERE session_id = 'your-session-id';
```

## Configuration

### Frontend Environment Variables
```
VITE_BACKEND_URL=http://localhost:3000
```

### Backend Environment Variables
```
PORT=3000
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://user:pass@localhost:5432/cvvin
```

## Known Issues & Solutions

### 1. "Chrome runtime not available"
- **Cause**: Extension not installed or content script not loaded
- **Solution**: Install extension, reload page

### 2. "Failed to load face detection models"
- **Cause**: Models not in public/models folder or CDN blocked
- **Solution**: Copy models from proctor-mvp or check CDN access

### 3. "Failed to load reference from image"
- **Cause**: Profile image requires authentication, CORS issues
- **Solution**: Implemented blob URL conversion via backend proxy

### 4. Camera feed disconnects
- **Cause**: Video element unmounting/remounting
- **Solution**: Implemented single persistent video element with ref management

### 5. Violations not saving
- **Cause**: Session ID missing or authentication issue
- **Solution**: Verify session ID in localStorage, check auth token

## Performance Considerations

### 1. Face Detection
- Uses SSD MobileNet v1 for speed
- Fallback strategies for different image types
- Optimized input sizes

### 2. Gaze Calibration
- WebGazer precision vs performance trade-off
- 9-point calibration for accuracy
- GPU acceleration when available

### 3. Violation Monitoring
- Lightweight event listeners
- No polling - event-driven architecture
- Minimal performance impact

### 4. Database
- Indexed columns for fast queries
- Cascade delete for cleanup
- JSONB for flexible metadata

## Security Considerations

### 1. Authentication
- All API calls require Firebase JWT
- Session ownership validation on backend
- User ID verification before data access

### 2. Data Privacy
- Profile images served through authenticated endpoint
- Blob URLs for CORS bypass (no external exposure)
- Violations linked to sessions (auto-delete on session delete)

### 3. Extension Communication
- Content script isolated from web page
- Message validation and sanitization
- Origin checking for security

## Future Enhancements

### Phase 1 (Immediate)
- [ ] Proctoring feedback service using Llama3.2 (TODO #11)
- [ ] End-to-end testing (TODO #12)
- [ ] Violation visualization in feedback

### Phase 2 (Short-term)
- [ ] Violation thresholds and auto-termination
- [ ] Warning system for multiple violations
- [ ] Real-time proctoring dashboard for admins
- [ ] Video recording of interview sessions

### Phase 3 (Long-term)
- [ ] AI-powered cheating detection
- [ ] Advanced gaze tracking analytics
- [ ] Behavioral analysis and patterns
- [ ] Multi-tenant support with org-level controls

## Troubleshooting Commands

```bash
# Check if backend is running
curl http://localhost:3000/health

# Check database connection
psql -U your_user -d cvvin -c "SELECT 1;"

# View recent violations
psql -U your_user -d cvvin -c "SELECT * FROM proctoring_violations ORDER BY created_at DESC LIMIT 10;"

# Check session status
psql -U your_user -d cvvin -c "SELECT id, status, session_type, created_at FROM interview_sessions ORDER BY created_at DESC LIMIT 5;"

# Count violations by type
psql -U your_user -d cvvin -c "SELECT violation_type, COUNT(*) FROM proctoring_violations GROUP BY violation_type;"
```

## Support

For issues or questions:
1. Check console logs (frontend and backend)
2. Review documentation in `docs/` folder
3. Check database for stored data
4. Verify environment variables
5. Review error logs

## Documentation Files

- `PROCTORING-SYSTEM-COMPLETE.md` - This file (overview)
- `VIOLATION-MONITORING-SYSTEM.md` - Detailed violation system docs
- `FEEDBACK-ENHANCEMENTS.md` - Feedback display features
- `DELETE-SESSIONS-GUIDE.md` - Session deletion guide
- `NULL-SAFETY-FIXES.md` - Null safety patterns
- `UI-CONSISTENCY-UPDATES.md` - UI design patterns
- `DEBUGGING-FEEDBACK-DATA.md` - Data troubleshooting

## Completion Status

✅ Extension Detection
✅ Media Permissions
✅ User Verification (Profile Photo)
✅ User Verification (ID Card)
✅ Gaze Calibration
✅ Proctoring Setup UI
✅ MCQ Integration
✅ Coding Integration
✅ Violation Detection
✅ Toast Notifications
✅ Violation Storage API
✅ Database Schema
✅ Documentation

**The proctoring system is now complete and ready for testing!**






