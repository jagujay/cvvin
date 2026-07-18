# 📁 Project Structure - Local Proctoring System

## **Complete File Organization**

```
proctor-mvp/
│
├── 📄 index.html                          # Main HTML page (entry point)
├── 🎨 style.css                           # Styling and layout
│
├── 📜 JavaScript Files (Core Logic)
│   ├── app-enhanced.js                    # Main application (900 lines)
│   │   ├── Initialization & setup
│   │   ├── AI model loading
│   │   ├── Webcam/audio handling
│   │   ├── Face verification
│   │   ├── Real-time monitoring
│   │   └── Violation detection
│   │
│   ├── yolo-helper.js                     # YOLOv8 object detection (219 lines)
│   │   ├── prepareYOLOv8Input()
│   │   ├── processYOLOv8Output()
│   │   └── runYOLOv8Inference()
│   │
│   ├── pre-verification-checks.js         # Security checks (449 lines)
│   │   ├── VM detection
│   │   ├── Screen recording detection
│   │   ├── Hardware monitoring
│   │   └── runAllSecurityChecks()
│   │
│   └── browser-lockdown.js                # Browser restrictions (430 lines)
│       ├── Keyboard shortcut blocking
│       ├── Right-click prevention
│       ├── Fullscreen enforcement
│       └── Copy/paste blocking
│
├── 📦 libs/                                # JavaScript Libraries (local)
│   ├── face-api.min.js                    # Face detection & recognition (1.2MB)
│   ├── tf.min.js                          # TensorFlow.js (3.5MB)
│   ├── tesseract.min.js                   # OCR engine (4.8MB)
│   ├── ort.min.js                         # ONNX Runtime (1.8MB)
│   ├── ort-wasm.wasm                      # ONNX WASM (basic) (12MB)
│   ├── ort-wasm-simd.wasm                 # ONNX WASM (SIMD) (12MB)
│   ├── ort-wasm-threaded.wasm             # ONNX WASM (threaded) (12MB)
│   ├── ort-wasm-simd-threaded.wasm        # ONNX WASM (SIMD+threaded) (12MB)
│   ├── webgazer.js                        # Eye tracking (3.1MB)
│   └── opencv.js                          # Computer vision (8.5MB)
│
├── 🤖 models/                              # AI Models & Training Data
│   ├── face_landmark_68_tiny_model-shard1
│   ├── face_landmark_68_tiny_model-weights_manifest.json
│   ├── face_recognition_model-shard1
│   ├── face_recognition_model-shard2
│   ├── face_recognition_model-weights_manifest.json
│   ├── tiny_face_detector_model-shard1
│   ├── tiny_face_detector_model-weights_manifest.json
│   │
│   ├── yolov8/
│   │   ├── yolov8n.onnx                   # YOLOv8 nano model (6.2MB) [MANUAL DOWNLOAD]
│   │   └── DOWNLOAD-YOLOV8.md             # Download instructions
│   │
│   └── webgazer/
│       └── README.md                      # Calibration data stored in localStorage
│
├── 📚 docs/                                # Documentation
│   ├── QUICK-START-GUIDE.md               # 5-minute setup guide
│   ├── EXTENSION-GUIDE.md                 # Chrome extension documentation
│   ├── CHANGELOG.md                       # All changes & fixes
│   ├── SETUP-INSTRUCTIONS.md              # Detailed installation
│   ├── TESTING-CHECKLIST.md               # Testing guide
│   └── ADVANCED-SECURITY-FEATURES.md      # Security implementation
│
├── 🛠️ Scripts
│   ├── download-dependencies.ps1          # Download all libraries
│   └── START-SERVER.ps1                   # Start local HTTP server
│
├── 📖 Documentation Files
│   ├── README.md                          # Project overview
│   ├── START-HERE.md                      # Entry point for new users
│   └── PROJECT-STRUCTURE.md               # This file
│
└── 📷 Assets
    └── reference.JPG                      # Sample reference image

proctor-extension/                          # Chrome Extension
│
├── 📄 manifest.json                        # Extension configuration
├── 🔧 background.js                        # Service worker (background monitoring)
│   ├── Tab switching detection
│   ├── Window focus monitoring
│   ├── URL navigation tracking
│   ├── Download monitoring
│   ├── Extension management
│   ├── System idle detection
│   └── Message passing to main app
│
└── 📜 content-script.js                    # Page-level monitoring
    ├── Page visibility (Alt+Tab)
    ├── Keyboard shortcut blocking
    ├── Copy/paste detection
    ├── Right-click prevention
    ├── Mouse tracking
    ├── Fullscreen detection
    └── Window resize monitoring
```

---

## **File Descriptions**

### **📄 HTML & CSS**

| File | Size | Purpose |
|------|------|---------|
| `index.html` | 8KB | Main page structure, includes all scripts |
| `style.css` | 4KB | Styling, layout, animations |

---

### **📜 JavaScript Files**

#### **app-enhanced.js** (900 lines)
**Main application logic**

**Sections:**
1. Global Variables & Configuration (lines 1-55)
2. Main Initialization (lines 56-200)
3. Model Loading (lines 201-334)
4. Event Listeners (lines 335-370)
5. WebGazer Calibration (lines 371-475)
6. ID Capture & Verification (lines 476-551)
7. Face Verification (lines 552-623)
8. Real-Time Monitoring (lines 624-682)
9. Violation Checks (lines 683-897)
10. Violation Logging (lines 898-914)
11. Utility Functions (lines 915-927)
12. Cleanup (lines 928-943)

**Key Functions:**
- `main()` - Entry point
- `loadAllModels()` - Load AI models
- `loadYOLOv8()` - Load object detection
- `initializeWebGazer()` - Eye tracking setup
- `initializeOpenCV()` - Computer vision setup
- `startCalibration()` - Eye tracking calibration
- `handleFaceCapture()` - Face verification
- `startRealtimeMonitoring()` - Begin monitoring
- `checkFaceViolations()` - Face identity check
- `checkWithYOLO()` - Object detection
- `checkGazeViolations()` - Eye tracking check
- `checkHeadPoseViolations()` - Head pose check
- `logViolation()` - Record violations

---

#### **yolo-helper.js** (219 lines)
**YOLOv8 object detection helper**

**Functions:**
- `prepareYOLOv8Input(imageElement)` - Prepare image for YOLO
- `processYOLOv8Output(output, confidenceThreshold, iouThreshold)` - Parse YOLO results
- `nonMaxSuppression(boxes, iouThreshold)` - Filter overlapping boxes
- `runYOLOv8Inference(session, imageElement)` - Run full inference

**Purpose:** Abstracts YOLOv8 complexity from main app

---

#### **pre-verification-checks.js** (449 lines)
**Security checks before exam**

**Checks:**
- Virtual machine detection
- Screen recording software
- Hardware monitoring (monitors)
- Suspicious browser properties
- Automation tools (Selenium, Puppeteer)

**Main Function:**
- `runAllSecurityChecks()` - Returns `{ passed: boolean, issues: [] }`

**Severity Levels:**
- CRITICAL - Block exam start
- HIGH - Strong warning
- MEDIUM - Warning
- LOW - Log only

---

#### **browser-lockdown.js** (430 lines)
**Browser security enforcement**

**Features:**
- Keyboard shortcut blocking
- Right-click prevention
- Copy/paste blocking
- Print blocking
- Fullscreen enforcement
- Page unload prevention

**API:**
```javascript
window.browserLockdown = {
    activate() - Enable lockdown
    enterFullscreen() - Force fullscreen
    exitFullscreen() - Exit fullscreen
    isActive - Status flag
}
```

---

### **📦 Libraries (libs/)**

| Library | Size | Purpose | Version |
|---------|------|---------|---------|
| `face-api.min.js` | 1.2MB | Face detection & recognition | 0.22.2 |
| `tf.min.js` | 3.5MB | TensorFlow.js (ML infrastructure) | 3.11.0 |
| `tesseract.min.js` | 4.8MB | OCR engine | 4.0.2 |
| `ort.min.js` | 1.8MB | ONNX Runtime (YOLOv8) | 1.14.0 |
| `ort-wasm*.wasm` | 12MB ea | WebAssembly for ONNX | 1.14.0 |
| `webgazer.js` | 3.1MB | Eye tracking | 2.1.0 |
| `opencv.js` | 8.5MB | Computer vision | 4.5.0 |

**Total Library Size:** ~65MB

---

### **🤖 AI Models (models/)**

| Model | Size | Format | Purpose |
|-------|------|--------|---------|
| Face Detection (tiny) | 1.8MB | TensorFlow.js | Detect faces in video |
| Face Landmarks | 350KB | TensorFlow.js | 68-point face landmarks |
| Face Recognition | 6.2MB | TensorFlow.js | Face embeddings/matching |
| YOLOv8n | 6.2MB | ONNX | Object detection (80 classes) |
| WebGazer | localStorage | WebRTC | Eye tracking calibration |

**Total Model Size:** ~15MB

---

### **📚 Documentation (docs/)**

| File | Lines | Purpose |
|------|-------|---------|
| `QUICK-START-GUIDE.md` | 650 | Get started in 5 minutes |
| `EXTENSION-GUIDE.md` | 750 | Extension features & testing |
| `CHANGELOG.md` | 600 | All changes & fixes |
| `SETUP-INSTRUCTIONS.md` | 450 | Detailed installation |
| `TESTING-CHECKLIST.md` | 400 | Comprehensive testing |
| `ADVANCED-SECURITY-FEATURES.md` | 550 | Security implementation |

**Total:** ~3,400 lines of documentation

---

### **🔌 Chrome Extension**

#### **manifest.json**
**Configuration file**

**Key Fields:**
- `manifest_version`: 3
- `name`: "Enhanced Proctoring Extension"
- `version`: "2.0"
- `permissions`: tabs, windows, scripting, management, idle, downloads, etc.
- `host_permissions`: http://localhost:8000/*
- `background.service_worker`: background.js
- `content_scripts`: content-script.js

---

#### **background.js**
**Service worker (runs in background)**

**Monitors:**
- Tab creation/switching
- Window focus changes
- URL navigation
- File downloads
- Extension changes
- System idle state

**Message Types:**
- `START_MONITORING` - Activate monitoring
- `START_CONTENT_MONITORING` - Activate content script
- `STOP_MONITORING` - Deactivate
- `DISABLE_OTHER_EXTENSIONS` - Get extension list
- `GET_EXTENSIONS_LIST` - List extensions

---

#### **content-script.js**
**Injected into exam page**

**Monitors:**
- Page visibility (Alt+Tab detection)
- Window blur/focus
- Keyboard shortcuts
- Copy/paste operations
- Right-click attempts
- Print attempts
- Fullscreen changes
- Mouse leaving page
- Window resize
- Multiple tabs

**Violation Types:**
- `PAGE_HIDDEN` - Alt+Tab
- `WINDOW_BLUR` - Lost focus
- `KEYBOARD_SHORTCUT` - Blocked keys
- `COPY_DETECTED` - Copy operation
- `PASTE_DETECTED` - Paste operation
- `CUT_DETECTED` - Cut operation
- `RIGHT_CLICK` - Context menu
- `PRINT_ATTEMPT` - Print dialog
- `FULLSCREEN_EXIT` - Exited fullscreen
- `MOUSE_LEFT_PAGE` - Mouse outside
- `WINDOW_RESIZE` - Size change
- `USER_IDLE` - No activity
- `MULTIPLE_TABS_SUSPECTED` - Duplicate tabs

---

## **Data Flow**

```
┌─────────────────┐
│   User Action   │
│  (face, click,  │
│   keyboard)     │
└────────┬────────┘
         │
         ├───────────────────┬─────────────────┐
         │                   │                 │
         ▼                   ▼                 ▼
┌────────────────┐  ┌────────────────┐  ┌──────────────┐
│  Webcam/Audio  │  │  content-      │  │  background  │
│   (MediaAPI)   │  │  script.js     │  │  .js         │
└───────┬────────┘  └───────┬────────┘  └──────┬───────┘
        │                    │                   │
        ▼                    ▼                   │
┌────────────────────────────────────────┐      │
│       app-enhanced.js                  │◄─────┘
│  ┌──────────────────────────────────┐ │
│  │ Face-API: Face detection         │ │
│  │ YOLOv8: Object detection         │ │
│  │ WebGazer: Eye tracking           │ │
│  │ OpenCV: Head pose                │ │
│  └──────────────────────────────────┘ │
└───────────┬────────────────────────────┘
            │
            ▼
    ┌───────────────┐
    │ logViolation()│
    └───────┬───────┘
            │
            ▼
     Console Output
     (Timestamped logs)
```

---

## **Module Dependencies**

```
index.html
  │
  ├──> style.css
  │
  ├──> libs/
  │     ├──> tesseract.min.js
  │     ├──> face-api.min.js
  │     ├──> tf.min.js
  │     ├──> ort.min.js
  │     ├──> ort-wasm*.wasm
  │     ├──> webgazer.js
  │     └──> opencv.js
  │
  ├──> yolo-helper.js
  │     └──> Requires: ort.min.js
  │
  ├──> pre-verification-checks.js
  │     └──> Standalone
  │
  ├──> browser-lockdown.js
  │     └──> Standalone
  │
  └──> app-enhanced.js
        ├──> Requires: ALL libs
        ├──> Uses: yolo-helper.js
        ├──> Uses: pre-verification-checks.js
        └──> Uses: browser-lockdown.js
```

---

## **Execution Flow**

```
1. Page Load
   ├── Load HTML (index.html)
   ├── Load CSS (style.css)
   ├── Load Libraries (libs/*)
   ├── Load Helper Scripts
   └── DOM Ready → main()

2. Initialization (app-enhanced.js)
   ├── STEP 1: Security Checks (pre-verification-checks.js)
   ├── STEP 2: Browser Lockdown (browser-lockdown.js)
   ├── STEP 3: Media Access (webcam/audio)
   ├── STEP 4: Load AI Models
   │   ├── Face-API
   │   ├── YOLOv8
   │   ├── WebGazer
   │   └── OpenCV
   └── STEP 5: Ready for calibration

3. Calibration Phase (Monitoring OFF)
   ├── Eye Tracking Calibration (WebGazer)
   ├── ID Scanning (optional)
   └── Face Capture & Verification

4. Exam Phase (Monitoring ON)
   ├── Extension Activation
   │   ├── background.js → isMonitoring = true
   │   └── content-script.js → monitoringActive = true
   ├── Fullscreen Enforcement
   └── Real-time Monitoring Loop
       ├── Face Check (every 2s)
       ├── Object Detection (every 3s)
       ├── Gaze Check (every 2s)
       ├── Head Pose (every 3s)
       ├── Audio Check (continuous)
       └── Extension Events (real-time)

5. Violation Detection
   ├── Face: No face, multiple faces, unauthorized person
   ├── Objects: Phone, book, laptop detected
   ├── Gaze: Looking away from screen
   ├── Head: Looking down, sideways
   ├── Audio: Suspicious sounds
   ├── Browser: Tab switch, Alt+Tab, etc.
   └── Log to console with timestamp
```

---

## **Storage & State**

### **LocalStorage**
- WebGazer calibration data
- Proctoring active tab flag

### **In-Memory**
- Reference face descriptor
- Violation logs
- Monitoring state flags
- AI model sessions

### **No Persistent Storage**
- No violation database
- No video recording
- No audio recording
- No external transmission

---

## **File Sizes Summary**

| Category | Size | Files |
|----------|------|-------|
| **Core Files** | 15KB | HTML, CSS, JS |
| **Libraries** | 65MB | 10 files |
| **AI Models** | 15MB | 7+ files |
| **Documentation** | 150KB | 10 files |
| **Extension** | 15KB | 3 files |
| **Total Project** | ~80MB | 40+ files |

---

## **Line Count Summary**

| Component | Lines | Complexity |
|-----------|-------|------------|
| `app-enhanced.js` | 900 | High |
| `yolo-helper.js` | 219 | Medium |
| `pre-verification-checks.js` | 449 | Medium |
| `browser-lockdown.js` | 430 | Medium |
| `background.js` (ext) | 350 | Medium |
| `content-script.js` (ext) | 400 | Medium |
| **Total Code** | ~2,750 lines | |
| **Documentation** | ~3,400 lines | |
| **Grand Total** | ~6,150 lines | |

---

## **API Surface**

### **Exported Functions**

#### **yolo-helper.js**
```javascript
prepareYOLOv8Input(imageElement) → Tensor
processYOLOv8Output(output, confThresh, iouThresh) → Array<Detection>
runYOLOv8Inference(session, imageElement) → Array<Detection>
```

#### **pre-verification-checks.js**
```javascript
runAllSecurityChecks() → Promise<{passed: boolean, issues: Array}>
```

#### **browser-lockdown.js**
```javascript
window.browserLockdown.activate()
window.browserLockdown.enterFullscreen()
window.browserLockdown.exitFullscreen()
window.browserLockdown.isActive
```

---

## **Configuration Constants**

### **app-enhanced.js**
```javascript
YOLO_MODEL_PATH = "models/yolov8/yolov8n.onnx"
PROHIBITED_OBJECTS = ["cell phone", "book", "laptop"]
MATCH_THRESHOLD = 0.6
YOLO_CONFIDENCE = 0.5
YOLO_IOU = 0.45
```

### **Extension**
```javascript
host_permissions = ["http://localhost:8000/*"]
```

---

## **Browser Compatibility**

| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|--------|
| Core App | ✅ 90+ | ✅ 90+ | ⚠️ Limited | ⚠️ Limited |
| Extension | ✅ | ✅ | ❌ | ❌ |
| WebGazer | ✅ | ✅ | ⚠️ | ✅ |
| Face-API | ✅ | ✅ | ✅ | ✅ |
| YOLOv8 | ✅ | ✅ | ⚠️ | ⚠️ |
| WASM | ✅ | ✅ | ✅ | ✅ |

**Recommended:** Chrome 100+ or Edge 100+

---

## **Quick Reference**

**Start Server:**
```powershell
.\START-SERVER.ps1
```

**Download Dependencies:**
```powershell
.\download-dependencies.ps1
```

**Load Extension:**
`chrome://extensions` → Developer mode → Load unpacked → `proctor-extension/`

**Access Application:**
`http://localhost:8000`

**View Console:**
F12 → Console tab

---

**Last Updated:** November 15, 2025  
**Project Version:** 2.0  
**Total Project Files:** 40+  
**Lines of Code:** 6,150+

