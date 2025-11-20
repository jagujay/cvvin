# Delete Sessions Guide

## How to Delete Sessions

### Option 1: Via Browser Console (Quick Method)

1. **Open the feedback page** (`localhost:8080/feedback`)

2. **Open browser console** (F12)

3. **Look at the console logs** for session IDs. You'll see:
   ```
   Session API response: {success: true, data: {id: "d371986d-43bb-44ed-baeb-169306b7fe5", ...}}
   ```

4. **Copy the session IDs** from the console (the three you want to delete)

5. **Run this code in console:**
   ```javascript
   // Get current user
   const { currentUser } = window.firebase.auth();
   
   // Import API
   const { consolidatedAPI } = await import('/src/services/consolidatedAPI.ts');
   
   // Delete sessions (replace with actual IDs)
   const sessionIds = [
     'd371986d-43bb-44ed-baeb-169306b7fe5',
     '0322fd57-1e74-4756-9bc6-467le1ad7357',
     'another-session-id-here'
   ];
   
   for (const id of sessionIds) {
     try {
       const result = await consolidatedAPI.deleteSession(currentUser, id);
       console.log(`✅ Deleted session ${id}:`, result);
     } catch (error) {
       console.error(`❌ Failed to delete ${id}:`, error);
     }
   }
   ```

### Option 2: Via Database (Direct Method)

If you have database access:

```sql
-- Find last 3 sessions
SELECT id, session_type, completed_at 
FROM interview_sessions 
ORDER BY completed_at DESC 
LIMIT 3;

-- Delete them (replace with actual IDs)
DELETE FROM session_components WHERE session_id = 'session-id-here';
DELETE FROM interview_sessions WHERE id = 'session-id-here';

-- Repeat for other sessions
```

### Option 3: Add Delete Button to UI

I can add delete buttons to the FeedbackList page if you want a permanent solution. Just let me know!

## Backend API Details

**Endpoint:** `DELETE /api/sessions/:sessionId`

**Features:**
- ✅ Verifies user ownership
- ✅ Deletes session components (MCQ, Coding, HR data)
- ✅ Deletes interview session
- ✅ Handles resume analyses too
- ✅ Returns success/error message

**Example Response:**
```json
{
  "success": true,
  "message": "Session deleted successfully"
}
```

## Frontend API Method

```typescript
consolidatedAPI.deleteSession(user, sessionId)
  .then(result => console.log('Deleted:', result))
  .catch(error => console.error('Error:', error));
```

## Safety Features

1. **Ownership Verification** - Can only delete your own sessions
2. **Foreign Key Handling** - Deletes components first to avoid constraints
3. **Error Handling** - Returns clear error messages
4. **Logging** - All deletes are logged for audit trail

## What Gets Deleted

When you delete a session, these are removed:
- `session_components` - All MCQ/Coding/HR data
- `interview_sessions` - The session record itself
- `resume_analyses` - If it's a resume analysis

## Restart Required

After adding the backend endpoint, **restart your backend server**:

```bash
cd backend
node server.js
```

Then the DELETE endpoint will be available!






