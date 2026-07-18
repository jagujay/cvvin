# 🎯 HR Interview Analysis - MediaPipe Edition

## 🆕 What's New

**Complete rewrite using MediaPipe!**

### **Features:**
- ✅ **Face Tracking** (468 landmarks)
- ✅ **Iris Tracking** (precise eye gaze)
- ✅ **Hand Tracking** (21 landmarks per hand, up to 2 hands)
- ✅ **Pose Tracking** (33 body landmarks)
- ✅ **No Library Conflicts** (all-in-one solution)
- ✅ **Better Performance** (30 FPS target)

### **What We Track:**
1. **Facial Expressions** - Smile, stress, emotions
2. **Eye Contact** - Gaze direction, looking away
3. **Hand Activity** - Gestures, fidgeting, movements
4. **Head Pose** - Orientation, looking away
5. **Body Language** - Posture, leaning, movement

---

## 🚀 Quick Start

### **1. Start Server**
```powershell
cd hr
.\START-SERVER.ps1
```

### **2. Open Browser**
```
http://localhost:8000/index-mediapipe.html
```

### **3. Allow Camera**
Click "Allow" when browser asks for permission

### **4. Start Analysis**
Click "▶️ Start Analysis" button

### **5. Watch It Work!**
- Green dots = Face mesh
- Red/Blue dots = Hands
- Yellow dots = Body pose

---

## 📁 File Structure

```
hr/
├── index-mediapipe.html          # Main page (MediaPipe edition)
├── hr-analysis-mediapipe.js      # Core logic (MediaPipe)
├── behavior-metrics.js           # Metrics tracking (reused)
├── visualization.js              # Dashboard updates (reused)
├── style.css                     # Styling (reused)
├── START-SERVER.ps1              # Local server
├── MEDIAPIPE-STEP-BY-STEP.md     # Testing guide
└── OLD_SYSTEM_BACKUP/            # Previous version (archived)
```

---

## 🎨 Dashboard Metrics

**Eye Contact** - Percentage looking at camera
**Expression** - Current facial expression
**Hand Activity** - Hand gestures and movement
**Head Pose** - Head orientation
**Posture** - Body position and alignment
**Movement** - Overall activity level

---

## 🔧 Technology Stack

- **MediaPipe** (Web version via CDN)
- **Vanilla JavaScript** (no frameworks)
- **HTML5 Canvas** (for visualization)
- **No external dependencies** (all self-contained)

---

## 📊 Current Implementation Status

### ✅ **Completed:**
- Basic setup
- Camera access
- MediaPipe initialization
- Face/Hand/Pose detection
- Basic visualization

### ⏳ **Next Steps:**
- Expression analysis (calculate emotions)
- Eye gaze calculation (iris-based)
- Hand gesture recognition
- Posture analysis
- Dashboard integration
- Behavior logging

---

## 🧪 Testing

See `MEDIAPIPE-STEP-BY-STEP.md` for detailed testing instructions.

**Quick Test:**
1. Open `index-mediapipe.html`
2. Click "Start Analysis"
3. Should see green dots on face
4. Move hands - should see colored dots
5. Console shows detection messages

---

## 💡 Why MediaPipe?

### **vs. Previous System:**

| Feature | Old System | MediaPipe |
|---------|-----------|-----------|
| Face Detection | face-api.js | ✅ Built-in |
| Eye Tracking | WebGazer (conflicts) | ✅ Iris landmarks |
| Hand Tracking | ❌ None | ✅ Native support |
| Pose Tracking | OpenCV (limited) | ✅ Full body |
| Library Conflicts | ❌ Major issues | ✅ None |
| Performance | ~15 FPS | ✅ 30 FPS |
| Accuracy | Good | ✅ Excellent |
| Maintenance | Multiple libs | ✅ Single solution |

---

## 🎯 Next Session

**We'll implement step-by-step:**

1. **Expression Analysis** - Convert landmarks to emotions
2. **Eye Gaze** - Calculate gaze from iris position
3. **Hand Gestures** - Recognize common gestures
4. **Posture** - Analyze body alignment
5. **Dashboard** - Real-time metric updates
6. **Export** - Generate comprehensive reports

---

## 🆘 Support

**If you encounter issues:**
1. Check console (F12) for errors
2. Verify camera permissions
3. Ensure good lighting
4. Try refreshing page

**Common Issues:**
- MediaPipe not loading → Check internet (using CDN)
- No face dots → Lighting or face not visible
- No hand dots → Hands must be clearly visible

---

## 📝 Notes

- Uses MediaPipe CDN (requires internet)
- Can switch to local MediaPipe if needed
- All tracking runs locally in browser
- No data sent to external servers
- Privacy-friendly (local processing)

---

**Ready to test? Open `MEDIAPIPE-STEP-BY-STEP.md` for detailed instructions!** 🚀

