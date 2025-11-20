# Violation Monitoring System

## Overview

The violation monitoring system tracks proctoring violations during technical interviews (MCQ + Coding rounds). It detects violations in real-time, shows toast notifications, and stores them in the database for analysis.

## Architecture

### Frontend Components

#### 1. Proctoring Service (`frontend/src/services/proctoringService.ts`)

Core service that manages violation detection and monitoring.

**Key Methods:**
- `startViolationMonitoring(sessionId: string)` - Starts monitoring violations
- `stopViolationMonitoring()` - Stops monitoring and cleanup
- `addViolationListener(listener)` - Subscribe to violation events
- `removeViolationListener(listener)` - Unsubscribe from violations
- `getViolations()` - Get all recorded violations
- `getViolationStats()` - Get statistics (count by type/severity)
- `clearViolations()` - Clear all violations

**Violation Types Tracked:**
1. **TAB_SWITCH** - User switches browser tabs (High severity)
2. **WINDOW_SWITCH** - User switches to another window (High severity)
3. **FULLSCREEN_EXIT** - User exits fullscreen mode (High severity)
4. **OBJECT_DETECTED** - Extension detects prohibited object (Medium severity)
5. **MULTIPLE_FACES** - Extension detects multiple faces (High severity)
6. **AUDIO_DETECTED** - Extension detects suspicious audio (Medium severity)

**Implementation:**
```typescript
// Browser event listeners
document.addEventListener('visibilitychange', ...); // Tab switch
window.addEventListener('blur', ...);               // Window switch
document.addEventListener('fullscreenchange', ...); // Fullscreen exit

// Extension message listener
window.addEventListener('message', (event) => {
  if (event.data?.type === 'VIOLATION_DETECTED') {
    // Handle violation from extension
  }
});
```

#### 2. MCQ Test (`frontend/src/pages/technical/MCQTest.tsx`)

Starts violation monitoring when proctoring setup is complete.

```typescript
useEffect(() => {
  if (!proctoringSetupComplete || !sessionId) return;

  // Start monitoring
  proctoringService.startViolationMonitoring(sessionId);

  // Add listener for toast notifications
  const violationListener = (violation: Violation) => {
    const config = severityConfig[violation.severity];
    toast({
      title: `${config.icon} Violation Detected`,
      description: violation.details,
      variant: config.variant,
      duration: 5000
    });
  };

  proctoringService.addViolationListener(violationListener);

  return () => {
    proctoringService.removeViolationListener(violationListener);
  };
}, [proctoringSetupComplete, sessionId, toast]);
```

#### 3. Coding Challenge (`frontend/src/pages/technical/CodingChallenge.tsx`)

Continues monitoring from MCQ and saves violations on submission.

```typescript
// On submit
const violations = proctoringService.getViolations();
if (violations.length > 0) {
  await consolidatedAPI.storeViolations(currentUser, sessionId, violations);
}
proctoringService.stopViolationMonitoring();
```

#### 4. Consolidated API (`frontend/src/services/consolidatedAPI.ts`)

**New Methods:**
```typescript
// Store violations to database
async storeViolations(user: User, sessionId: string, violations: any[]): Promise<any>

// Get violations for a session
async getViolations(user: User, sessionId: string): Promise<any>
```

### Backend Components

#### 1. Proctoring Routes (`backend/src/routes/proctoring.routes.js`)

**Endpoints:**

**POST /api/proctoring/violations**
- Stores violations for a session
- Request body: `{ sessionId, violations: [...] }`
- Validates session ownership
- Returns stored violations

**GET /api/proctoring/violations/:sessionId**
- Retrieves all violations for a session
- Validates session ownership
- Returns violations with statistics

**DELETE /api/proctoring/violations/:sessionId**
- Deletes all violations for a session
- Validates session ownership
- Returns deletion count

#### 2. Database Schema

**Table: `proctoring_violations`**

```sql
CREATE TABLE proctoring_violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL,
    violation_type VARCHAR(100) NOT NULL,
    details TEXT,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_session FOREIGN KEY (session_id) 
        REFERENCES interview_sessions(id) 
        ON DELETE CASCADE
);
```

**Indexes:**
- `idx_proctoring_violations_session_id` - Fast session lookups
- `idx_proctoring_violations_timestamp` - Time-based queries
- `idx_proctoring_violations_type` - Filter by violation type
- `idx_proctoring_violations_severity` - Filter by severity

## Violation Flow

```
1. User Completes Proctoring Setup
   ↓
2. MCQ Round Starts
   ↓
3. startViolationMonitoring(sessionId) Called
   ↓
4. Event Listeners Registered
   ├─ Tab visibility change
   ├─ Window blur
   ├─ Fullscreen exit
   └─ Extension messages
   ↓
5. User Takes MCQ (violations monitored)
   ├─ Violation Detected → Toast Shown
   ├─ Violation Stored in Memory
   └─ Continue monitoring
   ↓
6. User Submits MCQ → Navigate to Coding
   (Monitoring CONTINUES)
   ↓
7. User Solves Coding Challenge (violations monitored)
   ├─ Violation Detected → Toast Shown
   ├─ Violation Stored in Memory
   └─ Continue monitoring
   ↓
8. User Submits Coding Challenge
   ├─ getViolations() called
   ├─ storeViolations() to database
   ├─ stopViolationMonitoring()
   ├─ Exit fullscreen
   └─ Navigate to feedback
```

## Toast Notifications

**Severity Levels:**
- **Critical/High**: Red destructive toast with 🚨 or ⚠️
- **Medium**: Default blue toast with ⚡
- **Low**: Default blue toast with ℹ️

**Duration:** 5 seconds

**Example:**
```
🚨 Violation Detected
User switched away from the interview tab
```

## Testing

### Manual Testing Steps

1. **Start Interview:**
   - Go to Dashboard
   - Start Technical Interview
   - Complete proctoring setup (extension, camera, verification, calibration)

2. **Test Violations During MCQ:**
   - Switch to another tab → Should see toast
   - Click another window → Should see toast
   - Exit fullscreen (if in fullscreen) → Should see toast
   - Verify toasts are color-coded by severity

3. **Continue to Coding:**
   - Submit MCQ
   - Navigate to Coding Challenge
   - Monitoring should continue seamlessly

4. **Test Violations During Coding:**
   - Switch tabs again → Should see toast
   - Switch windows → Should see toast
   - Verify all violations are tracked

5. **Submit and Verify:**
   - Submit coding challenge
   - Check console for "Saving X violations to database"
   - Check console for "Violations saved successfully"
   - Verify monitoring stops and fullscreen exits

6. **Check Database:**
   ```sql
   SELECT * FROM proctoring_violations 
   WHERE session_id = 'your-session-id'
   ORDER BY timestamp;
   ```

### Extension Testing

If the Chrome extension is running and detects:
- **Object in frame** → OBJECT_DETECTED violation
- **Multiple faces** → MULTIPLE_FACES violation
- **Suspicious audio** → AUDIO_DETECTED violation

These should also trigger toasts.

## API Usage Examples

### Store Violations

```typescript
const violations = [
  {
    type: 'TAB_SWITCH',
    details: 'User switched away from the interview tab',
    severity: 'high',
    timestamp: new Date(),
    metadata: { sessionId: 'xyz' }
  }
];

await consolidatedAPI.storeViolations(currentUser, sessionId, violations);
```

### Get Violations

```typescript
const result = await consolidatedAPI.getViolations(currentUser, sessionId);
console.log(result.data.violations); // Array of violations
console.log(result.data.statistics); // { total, byType, bySeverity }
```

## Future Enhancements

1. **Proctoring Feedback Service** (TODO #11)
   - Use Llama3.2 to analyze violations
   - Generate proctoring score
   - Add to combined feedback

2. **Violation Thresholds**
   - Auto-terminate interview after X critical violations
   - Warning system for multiple violations

3. **Violation Visualization**
   - Timeline view in feedback
   - Heat map of violation times
   - Comparison with other candidates

4. **Advanced Detection**
   - Eye gaze tracking for attention
   - Head pose detection
   - Background activity monitoring

## Troubleshooting

### Violations Not Being Detected

1. Check if monitoring started:
   ```
   Console should show: "🎯 Starting violation monitoring for session: ..."
   ```

2. Verify event listeners are registered:
   ```javascript
   console.log(proctoringService.isMonitoringViolations);
   ```

3. Check browser permissions

### Violations Not Saving to Database

1. Check session ID is valid
2. Verify authentication token
3. Check backend logs for errors
4. Verify database migration ran successfully

### Toast Not Showing

1. Verify violation listener is added
2. Check toast hook is available
3. Look for console errors
4. Verify violation severity is valid

## Code References

- **Frontend Service**: `frontend/src/services/proctoringService.ts`
- **MCQ Integration**: `frontend/src/pages/technical/MCQTest.tsx`
- **Coding Integration**: `frontend/src/pages/technical/CodingChallenge.tsx`
- **API Client**: `frontend/src/services/consolidatedAPI.ts`
- **Backend Routes**: `backend/src/routes/proctoring.routes.js`
- **Database Migration**: `backend/migrations/create_proctoring_violations_table.sql`






