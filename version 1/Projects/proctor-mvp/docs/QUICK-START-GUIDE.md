# 🚀 Quick Start Guide - Local Proctoring System

## **Get Started in 5 Minutes**

---

## **Prerequisites**

- Windows PC
- Google Chrome browser
- PowerShell

---

## **Step 1: Download Dependencies** ⏱️ 2-3 minutes

```powershell
cd proctor-mvp
.\download-dependencies.ps1
```

**What this downloads:**
- Face-API.js (face detection & recognition)
- TensorFlow.js (ML models)
- Tesseract.js (OCR for ID scanning)
- ONNX Runtime Web (YOLOv8)
- WebGazer.js (eye tracking)
- OpenCV.js (head pose estimation)

---

## **Step 2: Download YOLOv8 Model** ⏱️ 1 minute

**Option A: Direct Download**
1. Go to: https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.onnx
2. Save to: `proctor-mvp/models/yolov8/yolov8n.onnx`

**Option B: Via Browser**
1. Visit: https://github.com/ultralytics/assets/releases
2. Find `yolov8n.onnx`
3. Download and place in `models/yolov8/`

---

## **Step 3: Install Chrome Extension** ⏱️ 1 minute

1. Open Chrome and go to: `chrome://extensions`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `proctor-extension` folder
5. ✅ Extension installed!

---

## **Step 4: Start the Server** ⏱️ 30 seconds

```powershell
.\START-SERVER.ps1
```

**Server will start at:** `http://localhost:8000`

---

## **Step 5: Open in Browser** ⏱️ 30 seconds

1. Open Chrome
2. Navigate to: `http://localhost:8000`
3. Allow webcam and microphone access

---

## **Step 6: System Flow** ⏱️ 2-3 minutes

### **Phase 1: Pre-Verification Security Checks**
The system automatically checks for:
- ✅ Virtual machines
- ✅ Screen recording software
- ✅ Multiple monitors
- ✅ Suspicious processes

**Action:** Close any flagged applications if prompted

---

### **Phase 2: WebGazer Calibration (Eye Tracking)**
1. Click **"Start Calibration"**
2. Click on the 9 dots that appear
3. Click each dot multiple times for accuracy
4. Wait for "Calibration Complete"

**Purpose:** Trains the eye tracker to your gaze

---

### **Phase 3: ID Scanning (Optional)**
1. Hold your ID card to webcam
2. Click **"Capture ID"**
3. System extracts text via OCR

**Purpose:** Records student identity

---

### **Phase 4: Face Verification (Required)**
1. Look at the camera
2. Click **"Capture Face"**
3. System detects and saves your face
4. **Face verification complete** ✅

**THIS IS THE KEY MOMENT:**
- After face verification, monitoring begins
- Browser enters fullscreen lockdown
- Extension activates violation detection

---

### **Phase 5: Exam Monitoring (Active)**

**Now monitoring:**
- 👤 Face (identity verification, no unauthorized persons)
- 👀 Eye gaze (looking away detection)
- 📱 Prohibited objects (phone, book, laptop via YOLOv8)
- 🎤 Audio (suspicious sounds)
- 💻 Browser activity (tab switches, Alt+Tab, etc.)
- ⌨️ Keyboard shortcuts (blocked)
- 📋 Copy/paste (blocked)
- 🖱️ Right-click (blocked)

**All violations are logged with timestamps**

---

## **🎯 Visual Workflow**

```
START
  ↓
Security Checks ✅
  ↓
Eye Calibration 👀
  ↓
ID Scan (optional) 🪪
  ↓
Face Verification ✅
  ↓
━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 MONITORING ACTIVATED 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ↓
Fullscreen Lockdown 🔒
  ↓
Real-time Monitoring 📹
  ↓
Exam Complete ✅
```

---

## **Important Notes**

### **Before Face Verification:**
- ✅ You can freely navigate
- ✅ No violations are logged
- ✅ Setup and calibration mode

### **After Face Verification:**
- 🚨 All violations are logged
- 🔒 Fullscreen enforced
- 🚫 Browser restrictions active
- ❌ Cannot switch apps/tabs

---

## **Troubleshooting**

### **Problem: "Failed to load YOLOv8"**
**Solution:** Download `yolov8n.onnx` to `models/yolov8/`

### **Problem: "Extension not detected"**
**Solution:** 
1. Go to `chrome://extensions`
2. Ensure extension is enabled
3. Reload the extension
4. Refresh the page

### **Problem: "Webcam not detected"**
**Solution:**
1. Check camera is not in use by another app
2. Grant browser camera permissions
3. Try refreshing the page

### **Problem: "Cannot enter fullscreen"**
**Solution:**
- Press F11 to enter fullscreen
- Or click browser's fullscreen button
- Ensure browser has focus

### **Problem: Server won't start (port 8000 in use)**
**Solution:**
```powershell
# Find and kill process using port 8000
Get-Process | Where-Object {$_.ProcessName -like "*python*"} | Stop-Process -Force
```

---

## **Keyboard Shortcuts (During Exam)**

⚠️ **Most shortcuts are BLOCKED during monitoring:**

- ❌ Ctrl+T (new tab) - Blocked
- ❌ Ctrl+W (close tab) - Blocked
- ❌ Ctrl+Tab (switch tab) - Blocked
- ❌ Alt+Tab (switch app) - Detected as violation
- ❌ F12 (dev tools) - Blocked
- ❌ Ctrl+C/V (copy/paste) - Detected
- ❌ Print Screen - Detected
- ✅ Esc - Exits fullscreen (detected as violation)

---

## **Console Messages to Look For**

### **On Load:**
```
🚀 Initializing Enhanced Proctoring System...
🔒 === STEP 1: SECURITY CHECKS ===
✅ Security checks passed
🔒 === STEP 2: BROWSER LOCKDOWN ===
✅ Browser lockdown activated
📹 === STEP 3: MEDIA ACCESS ===
✅ Media access granted
🤖 === STEP 4: AI MODELS ===
✅ Face-API models loaded
✅ YOLOv8 ONNX model loaded successfully
✅ WebGazer initialized
✅ OpenCV initialized
```

### **After Face Verification:**
```
✅✅✅ MONITORING ACTIVATED ✅✅✅
✅✅✅ BACKGROUND MONITORING ACTIVATED ✅✅✅
✅✅✅ CONTENT SCRIPT MONITORING ACTIVATED ✅✅✅
🔒 Entering fullscreen lockdown mode
```

---

## **Project Structure**

```
proctor-mvp/
├── index.html              # Main HTML page
├── app-enhanced.js         # Core application logic
├── style.css               # Styling
├── yolo-helper.js          # YOLOv8 inference helper
├── pre-verification-checks.js  # Security checks
├── browser-lockdown.js     # Fullscreen & restrictions
├── START-SERVER.ps1        # Server startup script
├── download-dependencies.ps1  # Dependency downloader
├── libs/                   # JavaScript libraries
│   ├── face-api.min.js
│   ├── tf.min.js
│   ├── tesseract.min.js
│   ├── ort.min.js
│   ├── ort-wasm*.wasm
│   ├── webgazer.js
│   └── opencv.js
├── models/                 # AI models
│   ├── face_*.json         # Face detection models
│   ├── yolov8/
│   │   └── yolov8n.onnx   # Object detection
│   └── webgazer/           # Eye tracking (localStorage)
└── docs/                   # Documentation

proctor-extension/
├── manifest.json           # Extension config
├── background.js           # Background service worker
└── content-script.js       # Page-level monitoring
```

---

## **What Each AI Model Does**

| Model | Purpose | Detects |
|-------|---------|---------|
| **Face-API** | Face detection & recognition | Identity verification, multiple faces |
| **YOLOv8** | Object detection | Phones, books, laptops, prohibited items |
| **WebGazer** | Eye tracking | Looking away from screen |
| **OpenCV** | Head pose estimation | Looking down, sideways |
| **Tesseract** | OCR | ID card text extraction |

---

## **System Requirements**

- **RAM:** 4GB minimum, 8GB recommended
- **Processor:** Dual-core 2GHz+
- **Browser:** Chrome 90+ or Edge 90+
- **Internet:** Only for initial download, then runs offline
- **Webcam:** 720p minimum
- **Microphone:** Any

---

## **Privacy & Data**

✅ **Everything runs locally**
- No data sent to external servers
- No API calls
- No internet required after setup
- All models run in browser
- Violations logged locally only

---

## **Next Steps**

- 📖 Read `SETUP-INSTRUCTIONS.md` for detailed setup
- 🧪 See `TESTING-CHECKLIST.md` for testing
- 🔧 Check `ADVANCED-SECURITY-FEATURES.md` for security details
- 🔌 Review `EXTENSION-GUIDE.md` for extension features

---

## **Support**

If you encounter issues:
1. Check console for error messages (F12)
2. Review troubleshooting section above
3. Ensure all dependencies are downloaded
4. Verify YOLOv8 model is in correct location
5. Check extension is loaded and enabled

---

**You're ready to go!** 🚀

The system will guide you through each step. Just follow the on-screen instructions.

