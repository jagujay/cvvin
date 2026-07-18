# WebGazer Models Directory

## ℹ️ This folder is intentionally empty!

The `webgazer` folder is supposed to be empty initially. This is **normal and expected**.

## How WebGazer Works

WebGazer.js creates and stores its calibration data **automatically** when you:

1. **First Calibration** - When you complete the 9-point calibration in the application
2. **Storage Location** - Data is saved in your browser's **localStorage**, not as files
3. **Persistence** - Calibration data persists between sessions (same browser)

## What Gets Stored

WebGazer stores calibration data in:
- **Browser localStorage** - Key: `webgazer_data`
- **In-memory** - Ridge regression model parameters
- **Not in files** - Models are NOT saved as files in this folder

## Why This Folder Exists

This folder is created for:
- **Organization** - Keeps model directories structured
- **Future Use** - If you want to export/import calibration data
- **Documentation** - Shows WebGazer is part of the system

## Checking Your Calibration Data

To see if WebGazer has calibration data:

1. Open your browser's Developer Tools (F12)
2. Go to "Application" or "Storage" tab
3. Look under "Local Storage" → `http://localhost:8000`
4. Check for keys starting with `webgazer_`

## Clearing Calibration

If you want to recalibrate from scratch:

**Option 1: Refresh the page**
- The app will prompt you to recalibrate

**Option 2: Clear localStorage**
```javascript
// In browser console (F12)
localStorage.removeItem('webgazer_data');
localStorage.clear(); // Or clear everything
```

**Option 3: Clear browser data**
- Settings → Privacy → Clear browsing data
- Select "Cookies and site data"

## Expected Behavior

✅ **Normal:**
- Folder is empty
- WebGazer works anyway
- Calibration data in localStorage

❌ **Problem:**
- WebGazer not loading (check console)
- Calibration doesn't work (check permissions)
- Eye tracking not accurate (recalibrate)

## Troubleshooting

### "WebGazer not available"
- Check: `libs/webgazer.js` exists
- Check: No console errors when loading page
- Solution: Re-run download-dependencies.ps1

### "Calibration not working"
- Check: Webcam permission granted
- Check: Good lighting on face
- Solution: Refresh and try again

### "Inaccurate eye tracking"
- Solution: Recalibrate (refresh page)
- Tip: Better lighting, sit still during calibration
- Tip: Look directly at each calibration point

## Technical Details

WebGazer uses:
- **Ridge Regression** - Machine learning model for gaze prediction
- **WebRTC** - For webcam access
- **localStorage API** - For saving calibration
- **Canvas API** - For face detection and tracking

The model is trained live in your browser during calibration.
No server-side processing or file storage needed.

## Summary

**This empty folder is correct!** 

WebGazer stores everything in browser localStorage, not as files.
Just complete the calibration in the app and it will work.

---

For more information about WebGazer, visit:
https://webgazer.cs.brown.edu/

