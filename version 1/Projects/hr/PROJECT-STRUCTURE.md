# 📁 HR Interview Analysis - Project Structure

## 🌳 File Tree

```
hr/
│
├── 📄 index.html                 ← Main application page
├── 📄 app.js                     ← Core analysis logic (900 lines)
├── 📄 style.css                  ← UI styling (500 lines)
├── 📄 START-SERVER.ps1           ← Development server script
├── 📄 README.md                  ← Main documentation (start here!)
├── 📄 ORGANIZATION-COMPLETE.md   ← Organization summary
├── 📄 PROJECT-STRUCTURE.md       ← This file
│
├── 📂 js/                        ← JavaScript Modules
│   ├── behavior-metrics.js       ← Metrics tracking system
│   └── visualization.js          ← Dashboard visualization
│
├── 📂 docs/                      ← Documentation
│   ├── README.md                 ← Detailed main guide
│   ├── FEATURES.md               ← All features + testing
│   ├── TESTING-GUIDE.md          ← Step-by-step testing
│   ├── IMPROVEMENTS.md           ← 20+ future enhancements
│   └── IMPLEMENTATION-PLAN.md    ← Development roadmap
│
└── 📂 OLD_SYSTEM_BACKUP/         ← Archived Previous Version
    ├── hr-analysis.js
    ├── hr-analysis-optimized.js
    ├── hr-analysis-NO-WEBGAZER.js
    ├── test-camera.html
    ├── check-scripts.html
    ├── diagnose-startup.js
    ├── DEBUG-FIXES.js
    ├── 📂 libs/
    │   ├── face-api.min.js
    │   ├── opencv.js
    │   ├── tf.min.js
    │   └── webgazer.js
    ├── 📂 models/
    │   ├── face_expression_model-*
    │   ├── face_landmark_68_tiny_model-*
    │   └── tiny_face_detector_model-*
    └── 📂 docs/
        └── (various troubleshooting guides)
```

---

## 📊 File Categories

### **🎯 Core Application (3 files)**
Essential files for the application to run:

| File | Size | Purpose |
|------|------|---------|
| `index.html` | ~180 lines | UI structure, video feed, dashboard |
| `app.js` | ~900 lines | MediaPipe integration, analysis logic |
| `style.css` | ~500 lines | Professional dashboard styling |

---

### **🔧 JavaScript Modules (2 files)**
Helper modules loaded by the main application:

| File | Size | Purpose |
|------|------|---------|
| `js/behavior-metrics.js` | ~200 lines | Track and store behavior metrics |
| `js/visualization.js` | ~300 lines | Update dashboard visualizations |

---

### **📖 Documentation (6 files)**
Comprehensive guides and references:

| File | Purpose | Audience |
|------|---------|----------|
| `README.md` | Quick start & overview | New users |
| `docs/README.md` | Detailed main guide | All users |
| `docs/FEATURES.md` | Feature breakdown + testing | Developers |
| `docs/TESTING-GUIDE.md` | Step-by-step testing | QA/Testing |
| `docs/IMPROVEMENTS.md` | Future enhancements (20+) | Planning |
| `docs/IMPLEMENTATION-PLAN.md` | Development phases | Developers |

---

### **⚙️ Scripts (1 file)**
Development utilities:

| File | Purpose |
|------|---------|
| `START-SERVER.ps1` | Start local HTTP server on port 8000 |

---

### **🗄️ Archived (OLD_SYSTEM_BACKUP/)**
Previous implementation (kept for reference):

- Old face-api.js + WebGazer.js implementation
- Troubleshooting files
- Test utilities
- Downloaded libraries
- Model files

**Note:** Not needed for current system, but kept as backup.

---

## 🎨 Key Features by File

### **`index.html` - UI Structure**
```
├── Video container
│   ├── <video> element (webcam)
│   └── <canvas> overlay (MediaPipe landmarks)
│
├── Dashboard panel
│   ├── Score cards (3x)
│   │   ├── Engagement
│   │   ├── Confidence
│   │   └── Composure
│   │
│   ├── Metric cards (5x)
│   │   ├── Eye Contact
│   │   ├── Expression
│   │   ├── Hand Activity
│   │   ├── Head Pose
│   │   └── Posture
│   │
│   ├── Behavior timeline
│   └── Key insights
│
├── Controls
│   ├── Start Analysis
│   ├── Stop Analysis
│   └── Export Report
│
└── Session info
```

### **`app.js` - Core Logic**
```
├── MediaPipe Integration
│   ├── Face Mesh (468 landmarks)
│   ├── Hands (21 × 2 landmarks)
│   └── Pose (33 landmarks)
│
├── Analysis Functions
│   ├── analyzeFaceExpression()
│   ├── analyzeEyeGaze()
│   ├── analyzeHandActivity()
│   ├── detectHandGestures()
│   ├── analyzeHeadPose()
│   └── analyzePosture()
│
├── Scoring System
│   ├── calculateOverallScores()
│   └── updateScoreCard()
│
├── Drawing Functions
│   ├── drawFaceMesh()
│   ├── drawHands()
│   └── drawPose()
│
└── Main Loop
    └── processFrame() @ 30 FPS
```

### **`style.css` - Styling**
```
├── Layout
│   ├── Video panel (left)
│   └── Dashboard panel (right)
│
├── Components
│   ├── Score cards (animated bars)
│   ├── Metric cards (status colors)
│   ├── Timeline (event log)
│   └── Insights (behavior notes)
│
└── Responsive design
    └── Adapts to screen size
```

---

## 🔗 Dependencies

### **External (CDN)**
```
MediaPipe Solutions (from Google CDN):
├── @mediapipe/camera_utils
├── @mediapipe/drawing_utils
├── @mediapipe/face_mesh
├── @mediapipe/hands
└── @mediapipe/pose
```

### **Internal**
```
index.html requires:
├── app.js
├── style.css
├── js/behavior-metrics.js
└── js/visualization.js
```

---

## 📏 Code Statistics

| Metric | Value |
|--------|-------|
| **Total Lines** | ~2,080 |
| **JavaScript** | ~1,400 (67%) |
| **CSS** | ~500 (24%) |
| **HTML** | ~180 (9%) |
| **Files** | 5 core + 2 modules |
| **Functions** | ~30 |
| **MediaPipe Models** | 3 |

---

## 🚀 Execution Flow

```
1. User opens index.html
   ↓
2. Browser loads scripts:
   - MediaPipe libraries (CDN)
   - behavior-metrics.js
   - visualization.js
   - app.js (main)
   ↓
3. app.js initializes:
   - DOM elements
   - Webcam access
   - MediaPipe solutions (Face, Hands, Pose)
   ↓
4. User clicks "Start Analysis"
   ↓
5. processFrame() loop @ 30 FPS:
   - Capture video frame
   - Send to MediaPipe
   - Receive landmarks
   - Analyze (expressions, gaze, hands, pose)
   - Calculate overall scores
   - Update dashboard
   - Draw overlays
   ↓
6. User clicks "Stop Analysis"
   ↓
7. Final scores calculated
   ↓
8. Export report available
```

---

## 📦 Build/Deploy

### **No Build Step Required!**
- Pure HTML/CSS/JavaScript
- No bundlers (Webpack, Rollup, etc.)
- No transpilation
- No minification needed

### **To Deploy:**
```bash
# Option 1: Local server
.\START-SERVER.ps1

# Option 2: Any HTTP server
python -m http.server 8000
npx http-server -p 8000

# Option 3: Deploy to web hosting
# Upload entire hr/ folder
# Ensure HTTPS for camera access
```

---

## 🔒 Security Considerations

### **Camera Access:**
- Requires HTTPS in production
- HTTP OK for localhost only
- User must grant permission

### **Data Privacy:**
- All processing local (in-browser)
- No data sent to servers
- MediaPipe models from Google CDN (can be cached)

### **No Backend Required:**
- Fully client-side
- No API keys needed
- No authentication

---

## 🎯 Entry Points

### **For Users:**
1. Start here: `README.md`
2. Run: `START-SERVER.ps1`
3. Open: `http://localhost:8000`

### **For Developers:**
1. Architecture: `docs/IMPLEMENTATION-PLAN.md`
2. Features: `docs/FEATURES.md`
3. Code: `app.js` (well-commented)

### **For Testing:**
1. Guide: `docs/TESTING-GUIDE.md`
2. Features: `docs/FEATURES.md`
3. Browser DevTools (F12)

---

## 💡 Quick Links

```bash
# Documentation
README.md                    # Start here
docs/README.md               # Full guide
docs/FEATURES.md             # What it does
docs/IMPROVEMENTS.md         # What's next

# Core Code
app.js                       # Main logic
js/behavior-metrics.js       # Metrics
js/visualization.js          # Dashboard

# UI
index.html                   # Structure
style.css                    # Styling
```

---

## ✅ Verification

**All files in proper locations:**
- ✅ Core files in root
- ✅ JS modules in `js/`
- ✅ Docs in `docs/`
- ✅ Old system archived
- ✅ No orphaned files
- ✅ Proper naming conventions

**All paths updated:**
- ✅ index.html → js/behavior-metrics.js
- ✅ index.html → js/visualization.js
- ✅ index.html → app.js
- ✅ No broken references

**Functionality tested:**
- ✅ Camera access works
- ✅ MediaPipe loads
- ✅ Analysis runs
- ✅ Dashboard updates
- ✅ Scoring works
- ✅ Export functions

---

**Project structure is clean, organized, and production-ready!** 🎉

