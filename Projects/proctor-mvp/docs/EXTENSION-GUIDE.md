# 🔌 Chrome Extension Guide - Enhanced Browser Monitoring

## **Overview**

The Chrome extension provides **system-level monitoring** that the main web app cannot access on its own, including:
- Tab switching detection
- Window focus changes
- Alt+Tab detection (switching to other apps)
- URL navigation monitoring
- File download attempts
- Extension management monitoring
- Idle detection

---

## **Installation**

### **Step 1: Load Extension**
1. Open Chrome
2. Go to `chrome://extensions`
3. Enable "Developer mode" (toggle top-right)
4. Click "Load unpacked"
5. Select `proctor-extension` folder
6. ✅ Extension installed

### **Step 2: Verify Installation**
Look for "Enhanced Proctoring Extension" in the extensions list.

---

## **How It Works**

### **Two-Phase Activation**

#### **Phase 1: Extension Load (Monitoring INACTIVE)**
- Extension loads when browser starts
- Event listeners are registered
- ❌ **NO violations logged yet**
- Status: **READY** (awaiting activation)

**Console Output:**
```
✅ Enhanced Proctoring Content Script Loaded (Monitoring INACTIVE)
✅ Enhanced content script READY (waiting for activation)
```

#### **Phase 2: After Face Verification (Monitoring ACTIVE)**
- Student completes face verification ✅
- Main app sends activation signals
- Extension activates monitoring
- ✅ **All violations now logged**

**Console Output:**
```
✅✅✅ BACKGROUND MONITORING ACTIVATED ✅✅✅
✅✅✅ CONTENT SCRIPT MONITORING ACTIVATED ✅✅✅
```

---

## **Features & Detection**

### **1. Tab Switching Detection** 🔥
Detects when user switches between browser tabs.

**Triggered by:**
- Clicking different tab
- Ctrl+Tab, Ctrl+Shift+Tab
- Clicking tab bar

**Violation logged:**
```
TAB_SWITCH: Changed to different browser tab
```

---

### **2. Window Focus Loss** 🔥
Detects when Chrome window loses focus.

**Triggered by:**
- Clicking outside browser
- Alt+Tab to another app
- Clicking taskbar/dock

**Violation logged:**
```
WINDOW_BLUR: Browser window lost focus
```

---

### **3. Page Visibility (Alt+Tab Detection)** 🔥🔥🔥
**Most Important Feature** - Detects switching to other applications.

**Triggered by:**
- Alt+Tab (Windows)
- Cmd+Tab (Mac)
- Clicking another application
- Minimizing browser

**Violation logged:**
```
PAGE_HIDDEN: Switched to another application/window (occurrence #1)
```

---

### **4. New Tab Creation**
Detects creation of new tabs during exam.

**Triggered by:**
- Ctrl+T
- Clicking "New Tab" button
- Middle-click on link

**Violation logged:**
```
NEW_TAB_OPENED: Attempted to open new tab during exam
```

---

### **5. URL Navigation**
Detects URL changes in the active tab.

**Triggered by:**
- Typing in address bar
- Clicking links
- Back/forward navigation
- Bookmarks

**Violation logged:**
```
URL_NAVIGATION: Navigated to different URL: https://example.com
```

---

### **6. File Downloads**
Detects any file download attempts.

**Triggered by:**
- Downloading files
- Right-click > Save As
- Auto-downloads

**Violation logged:**
```
DOWNLOAD_ATTEMPT: Attempted to download file: document.pdf
```

---

### **7. Keyboard Shortcuts** 🔥
Blocks and logs suspicious keyboard shortcuts.

**Blocked Shortcuts:**
- `F12` - Developer Tools
- `Ctrl+Shift+I` - Inspect Element
- `Ctrl+Shift+J` - Console
- `Ctrl+U` - View Source
- `Ctrl+T` - New Tab
- `Ctrl+W` - Close Tab
- `Ctrl+N` - New Window
- `Ctrl+Shift+N` - Incognito
- `Ctrl+Tab` - Next Tab

**Violation logged:**
```
KEYBOARD_SHORTCUT: Attempted to use F12 (Developer Tools)
```

---

### **8. Copy/Paste Detection**
Detects clipboard operations.

**Triggered by:**
- Ctrl+C (copy)
- Ctrl+V (paste)
- Ctrl+X (cut)
- Right-click context menu

**Violations logged:**
```
COPY_DETECTED: Attempted to copy text from exam page
PASTE_DETECTED: Attempted to paste content into exam page
CUT_DETECTED: Attempted to cut text from exam page
```

---

### **9. Right-Click Prevention**
Blocks and logs right-click attempts.

**Triggered by:**
- Right-clicking anywhere on page

**Violation logged:**
```
RIGHT_CLICK: Attempted to open context menu
```

---

### **10. Print Detection**
Detects print attempts.

**Triggered by:**
- Ctrl+P
- File > Print
- Print dialog

**Violation logged:**
```
PRINT_ATTEMPT: Attempted to print exam page
```

---

### **11. Fullscreen Exit Detection**
Detects when user exits fullscreen.

**Triggered by:**
- Pressing Esc
- F11 toggle
- Exiting fullscreen via browser controls

**Violation logged:**
```
FULLSCREEN_EXIT: Exited fullscreen mode
```

---

### **12. Mouse Tracking**
Tracks mouse leaving page boundaries.

**Triggered by:**
- Mouse pointer leaves exam page
- Moving cursor to taskbar
- Moving to other monitor

**Violation logged (after 2 seconds):**
```
MOUSE_LEFT_PAGE: Mouse pointer left exam page boundaries
```

---

### **13. Idle Detection**
Detects extended periods of no activity.

**Triggered by:**
- No mouse movement for 2+ minutes
- No keyboard input for 2+ minutes

**Violation logged:**
```
USER_IDLE: No mouse/keyboard activity for 120 seconds
```

---

### **14. Window Resize Detection**
Detects significant window size changes.

**Triggered by:**
- Resizing browser window
- Maximizing/minimizing
- Screen resolution changes

**Violation logged:**
```
WINDOW_RESIZE: Window resized significantly (1920x1080)
```

---

### **15. Extension Management**
Monitors changes to installed extensions.

**Detects:**
- New extension installed
- Extension uninstalled
- Extension enabled/disabled

**Violations logged:**
```
EXTENSION_INSTALLED: New extension added: Extension Name
EXTENSION_ENABLED: Extension activated: Extension Name
```

---

### **16. System Idle State**
Monitors system-level idle state (30 seconds threshold).

**Detects:**
- System locked
- Screensaver activated
- User inactive

**Violation logged:**
```
SYSTEM_IDLE: System entered idle state
```

---

## **Technical Architecture**

### **manifest.json**
Defines extension configuration and permissions.

**Key Permissions:**
- `tabs` - Monitor tab changes
- `windows` - Monitor window focus
- `scripting` - Inject content scripts
- `management` - Monitor other extensions
- `idle` - Detect system idle
- `downloads` - Monitor downloads

### **background.js** (Service Worker)
Runs in the background, monitors system-level events.

**Responsibilities:**
- Tab creation/switching
- Window focus changes
- URL navigation
- File downloads
- Extension changes
- System idle detection
- Message passing to main app

### **content-script.js**
Injected into the exam page, monitors page-level events.

**Responsibilities:**
- Page visibility (Alt+Tab)
- Keyboard shortcuts
- Copy/paste
- Right-click
- Mouse tracking
- Fullscreen changes
- Window resize
- Print attempts

---

## **Message Flow**

```
┌─────────────────┐
│  User Action    │
│  (Alt+Tab, etc) │
└────────┬────────┘
         │
    ┌────▼─────┐
    │ content- │
    │ script.js│
    └────┬─────┘
         │
         ▼
    window.postMessage()
         │
         ▼
┌────────────────┐
│ app-enhanced.js│
│ (Main App)     │
└────────┬───────┘
         │
         ▼
   logViolation()
```

**Alternative Path (Background):**
```
┌─────────────────┐
│  User Action    │
│  (New tab, etc) │
└────────┬────────┘
         │
    ┌────▼─────────┐
    │ background.js│
    └────┬─────────┘
         │
         ▼
  chrome.tabs.sendMessage()
         │
         ▼
┌────────────────┐
│ content-       │
│ script.js      │
└────────┬───────┘
         │
         ▼
    window.postMessage()
         │
         ▼
┌────────────────┐
│ app-enhanced.js│
└────────────────┘
```

---

## **Testing the Extension**

### **Test 1: Before Face Verification**
1. Start proctoring system
2. Try these actions during calibration:
   - Press Alt+Tab ✅ (no violation)
   - Right-click ✅ (no violation)
   - Copy text ✅ (no violation)
   - Press F12 ✅ (no violation)

**Expected:** No violations logged (monitoring inactive)

### **Test 2: After Face Verification**
1. Complete face verification
2. System enters fullscreen
3. Try same actions:
   - Press Alt+Tab 🚨 (violation!)
   - Right-click 🚨 (violation!)
   - Copy text 🚨 (violation!)
   - Press F12 🚨 (violation!)

**Expected:** All violations logged

### **Test 3: Tab Switching**
1. After verification, open new tab (Ctrl+T)
2. Check console

**Expected:** `NEW_TAB_OPENED` violation

### **Test 4: Window Focus**
1. After verification, click outside browser
2. Check console

**Expected:** `WINDOW_BLUR` violation

---

## **Debugging**

### **View Extension Console**
1. Go to `chrome://extensions`
2. Find "Enhanced Proctoring Extension"
3. Click "background page" or "service worker"
4. Console opens showing extension logs

### **View Page Console**
1. On exam page, press F12 (before verification)
2. Go to Console tab
3. See all extension messages

### **Common Issues**

**Issue:** Extension not loaded
- **Fix:** Reload extension at `chrome://extensions`

**Issue:** Violations not logging
- **Fix:** Check monitoring activation in console
- **Fix:** Ensure face verification completed

**Issue:** "Tab not found" error
- **Fix:** Ensure you're on `http://localhost:8000`
- **Fix:** Check host_permissions in manifest

**Issue:** Content script not injecting
- **Fix:** Reload page after extension reload
- **Fix:** Check console for errors

---

## **Customization**

### **Change Idle Threshold**
In `content-script.js`:
```javascript
if (minIdle > 120000) { // 2 minutes (change this)
```

### **Add New Blocked Shortcut**
In `content-script.js`:
```javascript
const suspiciousKeys = [
    { key: "F12", name: "Developer Tools" },
    // Add more here
];
```

### **Change Mouse Leave Delay**
In `content-script.js`:
```javascript
}, 2000); // 2 second delay (change this)
```

---

## **Activation Status Messages**

### **Quick Reference**

| Message | Meaning | Action |
|---------|---------|--------|
| "Monitoring INACTIVE" | Extension loaded, waiting | Continue setup |
| "Monitoring READY" | Ready to activate | Complete face verification |
| "MONITORING ACTIVATED" | Now detecting violations | Exam in progress |
| "Monitoring stopped" | Monitoring disabled | Exam ended |

---

## **Performance**

**Resource Usage:**
- RAM: ~5-10MB
- CPU: <1% (idle), ~2-5% (active)
- Battery impact: Minimal

**Compatibility:**
- Chrome 90+
- Edge 90+
- Manifest V3 compliant

---

## **Privacy & Security**

✅ **No external communication**
- All processing local
- No data sent to servers
- No analytics or tracking

✅ **Minimal permissions**
- Only what's needed for monitoring
- No access to other websites
- Limited to localhost:8000

✅ **User control**
- Can be uninstalled anytime (outside exam)
- Clear activation signals
- Transparent operation

---

## **File Structure**

```
proctor-extension/
├── manifest.json           # Extension configuration
├── background.js           # Service worker (background monitoring)
└── content-script.js       # Content script (page-level monitoring)
```

**Total size:** ~15KB

---

## **Future Enhancements**

Potential additions:
- Screenshot on violation
- Network request logging
- Browser history monitoring
- Clipboard content inspection
- Virtual camera detection
- Multiple monitor detection

---

## **Quick Reference Card**

**Activation Commands:**
```javascript
// Start monitoring (sent after face verification)
chrome.runtime.sendMessage({ type: "START_MONITORING" });
chrome.runtime.sendMessage({ type: "START_CONTENT_MONITORING" });

// Stop monitoring
chrome.runtime.sendMessage({ type: "STOP_MONITORING" });
```

**Key Violations:**
- `TAB_SWITCH` - Changed tabs
- `PAGE_HIDDEN` - Alt+Tab (most important)
- `WINDOW_BLUR` - Lost focus
- `NEW_TAB_OPENED` - Created new tab
- `URL_NAVIGATION` - Changed URL
- `DOWNLOAD_ATTEMPT` - Downloaded file
- `KEYBOARD_SHORTCUT` - Blocked shortcut
- `COPY_DETECTED` - Copied text
- `RIGHT_CLICK` - Right-clicked
- `FULLSCREEN_EXIT` - Exited fullscreen

---

**Last Updated:** November 15, 2025  
**Version:** 2.0 (Two-Phase Activation)

