# Testing Proctoring Setup

## Prerequisites

1. **Chrome Browser** (or Edge) - Required for extension
2. **Proctoring Extension Installed**
   - Go to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `Projects/proctor-extension` folder
   - Verify extension is enabled

3. **Frontend Running**
   - Make sure frontend is running on `http://localhost:8080`

## Testing Steps

### Step 1: Navigate to MCQ Test

1. Open your browser and go to `http://localhost:8080`
2. Log in to your account
3. Navigate to Technical Interview → Start MCQ Test
4. Or directly go to: `http://localhost:8080/technical-interview/mcq`

### Step 2: Extension Check

**Expected Behavior:**
- ProctoringSetup component should appear as a modal
- Should show "Checking for Proctoring Extension..."
- If extension is installed: Should proceed to next step
- If extension is NOT installed: Should show error with installation instructions

**Test Cases:**
- ✅ Extension installed → Should proceed
- ❌ Extension not installed → Should show installation instructions
- Click "Check Again" → Should re-check extension

### Step 3: Camera/Microphone Permissions

**Expected Behavior:**
- Should show "Requesting camera and microphone permissions..."
- Browser should show permission prompt
- If granted: Should proceed to verification method selection
- If denied: Should show error with "Try Again" button

**Test Cases:**
- ✅ Grant permissions → Should proceed
- ❌ Deny permissions → Should show error
- Click "Try Again" → Should re-request permissions

### Step 4: Verification Method Selection

**Expected Behavior:**
- Should show two options:
  1. "Use Profile Photo" (if profile has image)
  2. "Live Capture"
- If no profile image: Profile option should show warning

**Test Cases:**
- ✅ Has profile image → Both options available
- ❌ No profile image → Only "Live Capture" should work
- Click on option → Should proceed to verification

### Step 5: Face Verification (Placeholder)

**Current Status:** Placeholder implementation
- Should show "Verifying your face..." or "Loading reference image..."
- Video preview should be visible
- After a moment, should proceed to calibration

**Note:** Actual face verification (face-api.js) will be implemented next.

### Step 6: Gaze Calibration (Placeholder)

**Current Status:** Placeholder implementation
- Should show "Calibrating eye tracking..."
- Progress bar should animate from 0% to 100%
- After completion, should show "Ready" message

**Note:** Actual WebGazer calibration will be implemented next.

### Step 7: Setup Complete

**Expected Behavior:**
- Should show "Proctoring setup complete!" message
- Modal should close
- MCQ test page should be visible
- Toast notification: "Proctoring Setup Complete"

## Console Logs to Check

Open browser DevTools (F12) and check console for:

1. **Extension Check:**
   ```
   ✅ Extension detected
   or
   ❌ Extension not found
   ```

2. **Permissions:**
   ```
   ✅ Media permissions granted
   or
   ❌ Media permissions denied
   ```

3. **Violation Listener:**
   ```
   ✅ Violation listener setup
   ```

## Common Issues

### Issue: Extension Not Detected

**Solution:**
1. Verify extension is installed and enabled
2. Check extension manifest matches `localhost:8080`
3. Reload the page
4. Check console for errors

### Issue: Permissions Not Working

**Solution:**
1. Check browser settings → Site permissions
2. Clear site data and try again
3. Make sure camera/mic are not used by other apps
4. Try in incognito mode (if needed for testing)

### Issue: Component Not Showing

**Solution:**
1. Check if user is logged in (`currentUser` must exist)
2. Check browser console for errors
3. Verify component import path is correct
4. Check React DevTools for component state

## Next Steps After Testing

Once basic flow works:
1. ✅ Extension detection
2. ✅ Permission requests
3. ✅ UI flow
4. ⏳ Face verification (face-api.js integration)
5. ⏳ Gaze calibration (WebGazer integration)
6. ⏳ Violation tracking
7. ⏳ Integration with proctoring monitoring

## Testing Checklist

- [ ] Extension check works
- [ ] Extension error message shows correctly
- [ ] Permissions request works
- [ ] Permissions denied error shows correctly
- [ ] Verification method selection appears
- [ ] Profile image option works (if image exists)
- [ ] Live capture option works
- [ ] Video preview shows
- [ ] Calibration progress animates
- [ ] Setup completes and MCQ page shows
- [ ] Toast notifications appear
- [ ] No console errors

## Reporting Issues

If you encounter issues, note:
1. Browser and version
2. Extension status (installed/enabled)
3. Console errors (F12 → Console)
4. Network errors (F12 → Network)
5. Steps to reproduce







