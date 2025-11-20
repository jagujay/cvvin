# 👋 Welcome to the Local Proctoring System!

## **New to this project? Start here!**

---

## **🚀 I want to get started quickly!**

**→ Go to:** [`docs/QUICK-START-GUIDE.md`](docs/QUICK-START-GUIDE.md)

This guide will get you up and running in 5 minutes with:
- Dependency download
- Model setup
- Extension installation
- Server start
- First test

---

## **📖 I want detailed documentation!**

**→ Go to:** [`README.md`](README.md)

The main README has:
- Complete project overview
- Feature list
- Technical details
- Architecture explanation
- Full documentation index

---

## **🔧 I'm having issues!**

### **Common Problems & Solutions:**

**Problem: YOLOv8 not loading**
- **Solution:** Download `yolov8n.onnx` from [here](https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.onnx)
- Place in: `models/yolov8/yolov8n.onnx`

**Problem: Extension not working**
- **Solution:** Go to `chrome://extensions` → Click reload → Refresh page

**Problem: Webcam not detected**
- **Solution:** Close other apps using camera, grant permissions, refresh

**Problem: Server won't start**
- **Solution:** 
  ```powershell
  Get-Process | Where-Object {$_.ProcessName -like "*python*"} | Stop-Process -Force
  .\START-SERVER.ps1
  ```

**More Help:** See "Troubleshooting" section in [`README.md`](README.md)

---

## **📚 Documentation Index**

| Document | When to Read |
|----------|-------------|
| **[QUICK-START-GUIDE.md](docs/QUICK-START-GUIDE.md)** | First time setup (START HERE) |
| **[README.md](README.md)** | Project overview & features |
| **[EXTENSION-GUIDE.md](docs/EXTENSION-GUIDE.md)** | Understanding the Chrome extension |
| **[CHANGELOG.md](docs/CHANGELOG.md)** | What's been implemented & fixed |
| **[SETUP-INSTRUCTIONS.md](docs/SETUP-INSTRUCTIONS.md)** | Detailed installation steps |
| **[TESTING-CHECKLIST.md](docs/TESTING-CHECKLIST.md)** | How to test the system |
| **[ADVANCED-SECURITY-FEATURES.md](docs/ADVANCED-SECURITY-FEATURES.md)** | Security implementation details |

---

## **⚡ Super Quick Start (TL;DR)**

```powershell
# 1. Download dependencies
cd proctor-mvp
.\download-dependencies.ps1

# 2. Get YOLOv8 model (manual download)
# https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.onnx
# Save to: models/yolov8/yolov8n.onnx

# 3. Install extension
# chrome://extensions → Developer mode ON → Load unpacked → proctor-extension/

# 4. Start server
.\START-SERVER.ps1

# 5. Open browser
# http://localhost:8000
```

Done! Follow on-screen instructions from there.

---

## **🎯 What This System Does**

**In Simple Terms:**
- Monitors students during online exams
- Uses AI to detect cheating
- Runs 100% locally (no internet after setup)
- Tracks faces, eyes, objects, and browser activity

**Key Features:**
- 👤 Face recognition (detects unauthorized people)
- 👀 Eye tracking (detects looking away)
- 📱 Object detection (detects phones, books)
- 🔒 Browser lockdown (prevents tab switching, etc.)
- 🚨 Violation logging (records all suspicious activity)

---

## **🔄 System Workflow**

```
Setup Phase (Monitoring OFF)
  ↓
1. Security checks
2. Eye calibration
3. ID scan (optional)
4. Face verification ✅
  ↓
━━━━━━━━━━━━━━━━━━━━━
Exam Phase (Monitoring ON)
━━━━━━━━━━━━━━━━━━━━━
  ↓
5. Fullscreen lockdown
6. Real-time monitoring
7. Violation logging
```

**Important:** Monitoring only starts AFTER face verification (no false positives during setup!)

---

## **💡 Pro Tips**

1. **Read the Quick Start Guide first** - It's designed for beginners
2. **Install the extension before starting** - Required for full monitoring
3. **Download YOLOv8 model** - System works without it, but limited
4. **Test before using** - Try the system once to understand the flow
5. **Check console logs** - Press F12 to see what's happening

---

## **🎓 Learning Path**

**Beginner:**
1. Read [`QUICK-START-GUIDE.md`](docs/QUICK-START-GUIDE.md)
2. Follow installation steps
3. Test with [`TESTING-CHECKLIST.md`](docs/TESTING-CHECKLIST.md)

**Intermediate:**
1. Read [`README.md`](README.md) for project overview
2. Understand [`EXTENSION-GUIDE.md`](docs/EXTENSION-GUIDE.md)
3. Review [`CHANGELOG.md`](docs/CHANGELOG.md) for implementation details

**Advanced:**
1. Study [`ADVANCED-SECURITY-FEATURES.md`](docs/ADVANCED-SECURITY-FEATURES.md)
2. Review source code:
   - `app-enhanced.js` - Main app logic
   - `yolo-helper.js` - Object detection
   - `pre-verification-checks.js` - Security checks
   - `browser-lockdown.js` - Browser restrictions
   - `proctor-extension/` - Extension code

---

## **❓ FAQ**

**Q: Does this send data to the internet?**  
A: No! Everything runs locally. No data is sent anywhere.

**Q: Do I need to download models?**  
A: Yes, `yolov8n.onnx` needs manual download. Everything else is automatic.

**Q: Can I use this on Mac/Linux?**  
A: Currently Windows-optimized. Mac/Linux need minor PowerShell script adjustments.

**Q: Is the Chrome extension required?**  
A: Highly recommended. Without it, you lose tab switching detection, Alt+Tab detection, and many browser-level features.

**Q: How big is the download?**  
A: ~80MB total (libraries + models)

**Q: Can students cheat this system?**  
A: No system is perfect, but this covers most cheating methods. See security features in docs.

---

## **🚦 System Status Indicators**

Look for these in the console:

**✅ Good:**
```
✅ All checks passed
✅ MONITORING ACTIVATED
✅ Extension monitoring started
```

**⚠️ Warning:**
```
⚠️ YOLOv8 not loaded (object detection limited)
⚠️ Extension not detected (browser monitoring limited)
```

**❌ Error:**
```
❌ Failed to load Face-API models
❌ Webcam access denied
❌ Critical security issue detected
```

---

## **📊 Project Stats**

- **Total Files:** 25+
- **Documentation Pages:** 6
- **AI Models:** 6
- **Lines of Code:** ~3000+
- **Setup Time:** 5 minutes
- **First Exam:** 10 minutes

---

## **🎯 Next Step**

**→ Go to [`docs/QUICK-START-GUIDE.md`](docs/QUICK-START-GUIDE.md) and get started!**

---

**Questions?** Check the documentation or review console logs (F12) for hints.

**Good luck! 🚀**
