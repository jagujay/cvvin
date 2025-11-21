# Debugging Feedback Data Not Showing

## Quick Fix Applied

Added data transformation in `FeedbackDetail.tsx` to convert backend response format to the format the component expects.

## How to Test

### 1. Open Browser Console (F12)

### 2. Refresh the Feedback Detail Page

### 3. Check Console Logs

You should see:
```
Session API response: {success: true, data: {...}}
Transformed session data: {id: "...", type: "...", ...}
```

### 4. What to Look For

**✅ If you see data:**
- Check `Session API response` - should have `success: true`
- Check `Transformed session data` - should have all fields populated
- Page should display feedback

**❌ If you see errors:**
- `Failed to fetch session: ...` - Backend issue
- `Session not found` - No data in database
- `Using mock data as fallback` - API failed, showing demo data

## Check Backend is Running

```bash
# In terminal
cd backend
node server.js
```

Should see:
```
Server running on port 3000
Database connection pool initialized
Connected to PostgreSQL
```

## Check Database Has Data

Run this query to see sessions:
```sql
SELECT 
  id, 
  session_type, 
  overall_score, 
  status, 
  completed_at 
FROM interview_sessions 
WHERE status = 'completed' 
ORDER BY completed_at DESC 
LIMIT 5;
```

Expected output:
```
id                                   | session_type | overall_score | status    | completed_at
-------------------------------------|--------------|---------------|-----------|------------------------
c942b391-aa1e-4040-b103-09021d55e127 | technical    | 30            | completed | 2025-11-17 21:33:53
```

## Data Flow

```
1. Frontend calls: consolidatedAPI.getSession(user, sessionId)
   ↓
2. API calls: GET /api/sessions/:sessionId
   ↓
3. Backend fetches from database
   ↓
4. Returns: {success: true, data: {...}}
   ↓
5. Frontend transforms data structure
   ↓
6. Component displays feedback
```

## Expected Data Structure

### Backend Returns:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "type": "Technical Interview",
    "sessionType": "technical",
    "score": 82,
    "startedAt": "2025-11-17T...",
    "completedAt": "2025-11-17T...",
    "duration": 3600,
    "feedback": {
      "overallScore": 82,
      "mcqScore": 85,
      "codingScore": 78
    },
    "components": [
      {"type": "mcq", "score": 85},
      {"type": "coding", "score": 78}
    ]
  }
}
```

### Frontend Transforms To:
```json
{
  "id": "uuid",
  "type": "Technical Interview",
  "date": "2025-11-17T...",
  "duration": 3600,
  "overallScore": 82,
  "summary": "...",
  "mcq": {"type": "mcq", "score": 85},
  "coding": {"type": "coding", "score": 78},
  "feedback": {...},
  "components": [...]
}
```

## Common Issues

### Issue 1: "Session Not Found"
**Cause:** Session doesn't exist in database
**Solution:** 
1. Complete a technical interview
2. Submit both MCQ and Coding
3. Check database for new session

### Issue 2: Blank Page / No Data
**Cause:** Data structure mismatch
**Solution:** ✅ **Already fixed!** Data transformation added

### Issue 3: Backend Error
**Cause:** Backend not running or database connection failed
**Solution:**
1. Restart backend: `cd backend && node server.js`
2. Check database connection
3. Check backend console for errors

### Issue 4: API Returns 404
**Cause:** Route not found or session ID invalid
**Solution:**
1. Verify backend has the route: `GET /api/sessions/:sessionId`
2. Check session ID format (should be UUID)
3. Restart backend to load new routes

## Verification Steps

### Step 1: Backend Check
```bash
# Terminal 1: Start backend
cd backend
node server.js

# Should see:
# [timestamp] INFO: Server running on port 3000
```

### Step 2: Frontend Check  
```bash
# Terminal 2: Start frontend (if not running)
cd frontend
npm run dev

# Should see:
# VITE ready in XXXms
# Local: http://localhost:8080/
```

### Step 3: Browser Check
1. Open `http://localhost:8080/feedback`
2. Click "View Details" on any session
3. Open Console (F12)
4. Look for console logs:
   - `Session API response: ...`
   - `Transformed session data: ...`

### Step 4: Network Check
1. Open Browser DevTools (F12)
2. Go to Network tab
3. Refresh page
4. Look for request to `/api/sessions/[uuid]`
5. Check:
   - **Status:** Should be 200
   - **Response:** Should have `success: true` and `data` object

## If Still Not Working

1. **Clear Browser Cache**
   - Ctrl+Shift+Delete
   - Clear cached images and files

2. **Hard Refresh**
   - Ctrl+F5 or Cmd+Shift+R

3. **Check All Logs**
   - Frontend console (F12)
   - Backend terminal
   - Network tab in DevTools

4. **Verify Database**
   ```sql
   -- Count sessions
   SELECT COUNT(*) FROM interview_sessions WHERE status = 'completed';
   
   -- Check specific session
   SELECT * FROM interview_sessions WHERE id = 'your-session-id';
   
   -- Check components
   SELECT * FROM session_components WHERE session_id = 'your-session-id';
   ```

5. **Test API Directly**
   ```bash
   # Get auth token from browser (Application > Local Storage > Firebase token)
   curl http://localhost:3000/api/sessions/YOUR-SESSION-ID \
     -H "Authorization: Bearer YOUR-TOKEN"
   ```

## Success Indicators

✅ Backend running without errors
✅ Frontend console shows session data
✅ Network tab shows 200 response
✅ Feedback page displays scores and analysis
✅ No "Session Not Found" error

## Need Help?

Check these files:
- `backend/src/routes/sessions.routes.js` - Backend route
- `frontend/src/pages/feedback/FeedbackDetail.tsx` - Frontend component
- `frontend/src/services/consolidatedAPI.ts` - API client
- `backend/logs/` - Backend error logs

Console commands:
```javascript
// In browser console
localStorage.getItem('technicalSessionId') // Check stored session ID
```

## Next Steps After Fix

Once feedback is showing:
1. Verify all feedback sections display
2. Check MCQ and Coding scores
3. Review AI-generated recommendations
4. Test with different session types (HR, Technical, Resume)











