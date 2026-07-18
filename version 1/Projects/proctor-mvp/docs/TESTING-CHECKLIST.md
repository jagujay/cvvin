# 🧪 Testing Checklist for Proctoring System

Use this checklist to verify all features are working correctly.

## ✅ Pre-Testing Setup

- [ ] All libraries downloaded to `libs/` folder
- [ ] Face-api models present in `models/` folder
- [ ] YOLOv8 model downloaded to `models/yolov8/yolov8n.onnx` (optional)
- [ ] Chrome extension installed and enabled
- [ ] Local server running on port 8000
- [ ] Webcam and microphone permissions granted
- [ ] Good lighting on face
- [ ] Quiet environment for audio testing

## 📋 Feature Testing

### 1. Application Load
- [ ] Page loads without errors
- [ ] Status shows "Loading application..."
- [ ] Webcam activates and shows video feed
- [ ] All libraries load (check console for ✅ marks)
- [ ] Status changes to "Ready! Please start with eye tracking calibration."

**Expected Console Logs:**
```
🚀 Initializing Enhanced Proctoring System...
📦 Loading models...
Loading face detection models...
✅ Face models loaded
Loading Tesseract OCR...
✅ Tesseract loaded
Loading YOLOv8 model...
✅ YOLOv8 ONNX model loaded successfully
Initializing WebGazer...
✅ WebGazer initialized
Waiting for OpenCV.js...
✅ OpenCV.js ready
✅ All models loaded successfully!
```

---

### 2. Eye Tracking Calibration
- [ ] Calibration section appears
- [ ] "Start Calibration" button is enabled
- [ ] Click button starts calibration
- [ ] 9 red dots appear sequentially
- [ ] Each dot disappears when clicked
- [ ] Progress shown (1/9, 2/9, etc.)
- [ ] Calibration completes after all points
- [ ] Calibration section disappears
- [ ] Can proceed to Step 1

**Pass Criteria:**
- All 9 points clicked successfully
- No errors in console
- WebGazer running in background

---

### 3. ID Scanning (Option A)
- [ ] "Scan ID" button is enabled
- [ ] Hold ID card to camera (readable text)
- [ ] Click "Scan ID"
- [ ] Status shows "Scanning ID card..."
- [ ] OCR processes the ID (takes 5-15 seconds)
- [ ] Extracted text appears in output box
- [ ] Face detected on ID
- [ ] Status: "ID Scan Complete. Please verify your face."
- [ ] "Verify Face" button becomes enabled

**Pass Criteria:**
- Some text extracted (doesn't need to be perfect)
- Face found on ID
- No errors

**Common Issues:**
- Text not readable → Hold ID closer, better lighting
- No face found → Ensure face is clearly visible on ID

---

### 4. Reference Image Load (Option B)
- [ ] `reference.JPG` file exists in folder
- [ ] Click "Load Reference Image"
- [ ] Status shows "Loading reference image..."
- [ ] Face detected in reference image
- [ ] Status: "Reference Image Loaded. Please verify your face."
- [ ] "Verify Face" button becomes enabled

**Pass Criteria:**
- Reference image loads
- Face detected
- No errors

---

### 5. Face Verification
- [ ] Completed Step 1 (ID or Reference)
- [ ] Click "Verify Face"
- [ ] Countdown appears: "Get ready... 3... 2... 1..."
- [ ] Face captured at "Verifying..."
- [ ] Face match successful
- [ ] Status: "Verification Successful! Monitoring started."
- [ ] Monitoring section appears
- [ ] Violation log visible

**Pass Criteria:**
- Face match confidence > 50%
- Verification succeeds
- Monitoring begins

**If Verification Fails:**
- Ensure good lighting
- Face the camera directly
- Remove glasses if causing issues
- Try Option B with a clear reference photo

---

### 6. Face Detection Monitoring

#### Test: No Face Detected
- [ ] Monitoring active
- [ ] Move completely out of frame
- [ ] Wait 2-3 seconds
- [ ] Violation logged: "NO_FACE_DETECTED"
- [ ] Status turns red
- [ ] Timestamp shown in log

#### Test: Multiple Faces
- [ ] Monitoring active
- [ ] Have another person enter frame
- [ ] Wait 2-3 seconds
- [ ] Violation logged: "MULTIPLE_FACES_DETECTED"
- [ ] Both faces should trigger alert

#### Test: Normal (Pass)
- [ ] Return to frame alone
- [ ] Console shows: "✓ Face check: OK (1 face)"
- [ ] No violation logged

**Pass Criteria:**
- Violations detected within 2-4 seconds
- Logs show correct timestamps
- Status updates appropriately

---

### 7. Audio Monitoring

#### Test: Suspicious Audio
- [ ] Monitoring active
- [ ] Speak loudly or make noise
- [ ] Wait 1-2 seconds
- [ ] Violation logged: "SUSPICIOUS_AUDIO_DETECTED"
- [ ] Console shows audio level > 40

#### Test: Normal (Pass)
- [ ] Remain quiet
- [ ] Console shows: "🔊 Audio level: [low number]"
- [ ] No violation logged

**Pass Criteria:**
- Audio violations detected
- Cooldown works (5 seconds between alerts)
- Normal speech doesn't trigger (threshold tunable)

---

### 8. Object Detection (YOLOv8)

**Note:** Only if YOLOv8 model is installed

#### Test: Cell Phone Detection
- [ ] Hold cell phone in view
- [ ] Wait 2-4 seconds
- [ ] Console shows: "📦 Detected: cell phone"
- [ ] Violation logged: "PROHIBITED_OBJECT: cell phone"

#### Test: Book Detection
- [ ] Hold book in view
- [ ] Wait 2-4 seconds
- [ ] Console shows: "📦 Detected: book"
- [ ] Violation logged: "PROHIBITED_OBJECT: book"

#### Test: Laptop Detection
- [ ] Place laptop in view (if available)
- [ ] Wait 2-4 seconds
- [ ] Violation logged: "PROHIBITED_OBJECT: laptop"

#### Test: Normal (Pass)
- [ ] Remove all prohibited objects
- [ ] Console shows: "✓ Object check: OK"
- [ ] No violations

**Pass Criteria:**
- Prohibited objects detected reliably
- No false positives on normal items
- Detections have confidence scores

**If Not Working:**
- Check if `yolov8n.onnx` exists
- Console should show "✅ YOLOv8 ONNX model loaded"
- If missing, shows "⚠️ YOLOv8 not available"

---

### 9. Eye Tracking (WebGazer)

#### Test: Looking Away
- [ ] Look away from screen (far left/right)
- [ ] Keep gaze away for 10+ seconds
- [ ] Violation logged: "LOOKING_AWAY_FROM_SCREEN" or "GAZE_OFF_SCREEN"

#### Test: Normal (Pass)
- [ ] Look at screen center
- [ ] Console shows: "✓ Gaze check: OK"
- [ ] Green dot appears on screen (if enabled)

**Pass Criteria:**
- Gaze tracking active
- Off-screen detection works
- Threshold prevents false positives (5 checks)

**If Inaccurate:**
- Recalibrate (refresh page)
- Improve lighting
- Sit closer to screen
- Reduce head movement

---

### 10. Head Pose Detection

#### Test: Looking Down
- [ ] Look down at desk/phone position
- [ ] Wait 2-4 seconds
- [ ] Violation logged: "HEAD_POSE_VIOLATION: Looking down"

#### Test: Looking Sideways
- [ ] Turn head significantly left or right
- [ ] Wait 2-4 seconds
- [ ] Violation logged: "HEAD_POSE_VIOLATION: Looking sideways"

#### Test: Normal (Pass)
- [ ] Face camera directly
- [ ] Console shows: "✓ Head pose check: OK"

**Pass Criteria:**
- Extreme head angles detected
- Normal movements ignored
- Works in conjunction with face detection

---

### 11. Browser Extension Monitoring

#### Test: Tab Switch
- [ ] Open a new tab or switch tabs
- [ ] Return to proctoring page
- [ ] Violation logged: "TAB_SWITCH"

#### Test: New Tab
- [ ] Press Ctrl+T (new tab)
- [ ] Return to proctoring page
- [ ] Violation logged: "NEW_TAB_CREATED"

#### Test: Focus Loss
- [ ] Click outside browser (desktop, another app)
- [ ] Return to browser
- [ ] Violation logged: "FOCUS_LOST"

**Pass Criteria:**
- Extension detects all browser events
- Violations logged in real-time
- Extension icon shows as active

**If Not Working:**
- Check extension is enabled
- Verify URL matches manifest (localhost:8000)
- Reload extension in chrome://extensions/

---

### 12. Performance Testing

- [ ] Monitor CPU usage (Task Manager)
- [ ] Should be 20-40% on modern CPU
- [ ] Memory usage 200-500 MB
- [ ] No browser lag or freezing
- [ ] Video feed smooth (20+ FPS)
- [ ] Monitoring checks every 2 seconds

**Pass Criteria:**
- System responsive
- No memory leaks over time
- Battery/CPU acceptable

**If Poor Performance:**
- Increase MONITORING_INTERVAL to 5000
- Disable WebGazer if not needed
- Close other browser tabs
- Use lighter YOLOv8n model (not v8s or v8m)

---

### 13. Violation Log Testing

- [ ] All violations appear in log
- [ ] Timestamps are correct
- [ ] Newest violations at top
- [ ] Log scrolls if many violations
- [ ] Red highlighting on violations
- [ ] Text is readable

---

### 14. Error Handling

#### Test: Cover Camera
- [ ] Cover webcam with hand/paper
- [ ] "NO_FACE_DETECTED" violation

#### Test: Disable Microphone
- [ ] Revoke microphone permission
- [ ] Error message shown gracefully

#### Test: Refresh During Monitoring
- [ ] Refresh page while monitoring
- [ ] System restarts cleanly
- [ ] Must recalibrate and verify again

**Pass Criteria:**
- No crashes
- Errors logged to console
- User-friendly error messages

---

## 🎯 Final Integration Test

### Complete Workflow Test
1. [ ] Start fresh (clear cache, restart browser)
2. [ ] Load application
3. [ ] Complete eye tracking calibration
4. [ ] Scan ID or load reference
5. [ ] Verify face
6. [ ] Let monitoring run for 2 minutes
7. [ ] Trigger each violation type once
8. [ ] Verify all logged correctly
9. [ ] Stop monitoring (close tab)
10. [ ] Check for resource cleanup

**Success Criteria:**
- Complete workflow with no errors
- All features working
- Violations detected correctly
- System stable for extended period

---

## 📊 Test Results Summary

**Date:** _________________

**Tester:** _________________

**Browser:** Chrome / Firefox / Edge (circle one)

**Version:** _________________

### Results
- Models Loaded: ✅ / ❌
- Eye Calibration: ✅ / ❌
- ID Scanning: ✅ / ❌
- Face Verification: ✅ / ❌
- Face Detection: ✅ / ❌
- Audio Monitoring: ✅ / ❌
- Object Detection (YOLOv8): ✅ / ❌ / N/A
- Eye Tracking: ✅ / ❌
- Head Pose: ✅ / ❌
- Browser Extension: ✅ / ❌
- Performance: ✅ / ❌

### Issues Found:
```
[List any issues or bugs encountered]
```

### Notes:
```
[Additional observations]
```

---

## 🐛 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| YOLOv8 not loading | Download `yolov8n.onnx` manually |
| WebGazer inaccurate | Recalibrate with better lighting |
| High CPU usage | Increase monitoring interval |
| Extension not working | Check URL matches manifest |
| Face match failing | Use better reference photo |
| Tesseract timeout | Hold ID closer, better lighting |
| Audio always triggering | Increase AUDIO_THRESHOLD |

---

**Testing Complete! ✅**

If all tests pass, your proctoring system is ready for use!

