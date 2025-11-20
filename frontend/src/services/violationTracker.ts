/**
 * Violation Tracker Service
 * Maintains a JSON object with all violation types and their counts
 * Initialized at session start with all types set to 0
 * Updated every time a violation occurs
 * Passed to feedback generation at the end
 */

// All violation types from MVP
export const ALL_VIOLATION_TYPES = {
  // Face Detection
  NO_FACE_DETECTED: 0,
  MULTIPLE_FACES_DETECTED: 0,
  UNAUTHORIZED_PERSON: 0,
  
  // Audio (removed but keeping for completeness)
  SUSPICIOUS_AUDIO_DETECTED: 0,
  
  // Object Detection
  PROHIBITED_OBJECT: 0,
  MULTIPLE_PEOPLE_DETECTED: 0,
  
  // Gaze Tracking
  LOOKING_AWAY_FROM_SCREEN: 0,
  GAZE_OFF_SCREEN: 0,
  
  // Head Pose
  HEAD_POSE_VIOLATION: 0,
  LOOKING_DOWN: 0,
  LOOKING_SIDEWAYS: 0,
  
  // Browser Events (Extension)
  TAB_SWITCH: 0,
  NEW_TAB_CREATED: 0,
  FOCUS_LOST: 0,
  PAGE_HIDDEN: 0,
  WINDOW_BLUR: 0,
  
  // Mouse/Keyboard
  MOUSE_LEFT_PAGE: 0,
  KEYBOARD_SHORTCUT: 0,
  COPY_DETECTED: 0,
  PASTE_DETECTED: 0,
  CUT_DETECTED: 0,
  RIGHT_CLICK: 0,
  PRINT_ATTEMPT: 0,
  
  // Fullscreen
  FULLSCREEN_EXIT: 0,
  
  // Network
  SUSPICIOUS_REQUEST: 0,
  
  // Activity
  USER_IDLE: 0,
  WINDOW_RESIZE: 0,
  MULTIPLE_TABS_SUSPECTED: 0,
  
  // Navigation
  NAVIGATION: 0,
  DOWNLOAD_STARTED: 0,
  EXTENSION_INSTALLED: 0
} as const;

export type ViolationType = keyof typeof ALL_VIOLATION_TYPES;

export interface ViolationStats {
  [key: string]: number;
}

class ViolationTrackerService {
  private violationCounts: ViolationStats;
  private sessionId: string | null = null;

  constructor() {
    // Initialize with all violation types set to 0
    this.violationCounts = { ...ALL_VIOLATION_TYPES };
  }

  /**
   * Initialize tracker for a new session
   */
  initialize(sessionId: string): void {
    console.log('📊 Initializing violation tracker for session:', sessionId);
    this.sessionId = sessionId;
    // Reset all counts to 0
    this.violationCounts = { ...ALL_VIOLATION_TYPES };
    console.log('✅ Violation tracker initialized with all types at 0');
  }

  /**
   * Record a violation (increment count)
   */
  recordViolation(type: string): void {
    if (!this.sessionId) {
      console.warn('⚠️ Violation tracker not initialized, skipping:', type);
      return;
    }

    // Normalize violation type (handle variations)
    const normalizedType = this.normalizeViolationType(type);
    
    if (normalizedType in this.violationCounts) {
      this.violationCounts[normalizedType]++;
      console.log(`📊 Violation recorded: ${normalizedType} (count: ${this.violationCounts[normalizedType]})`);
    } else {
      // If it's a new type not in our list, add it
      console.warn(`⚠️ Unknown violation type: ${type}, adding to tracker`);
      this.violationCounts[normalizedType] = (this.violationCounts[normalizedType] || 0) + 1;
    }
  }

  /**
   * Normalize violation type from various formats
   */
  private normalizeViolationType(type: string): string {
    const upperType = type.toUpperCase();
    
    // Handle variations and prefixes
    if (upperType.includes('TAB_SWITCH') || upperType.includes('TABSWITCH')) {
      return 'TAB_SWITCH';
    }
    if (upperType.includes('WINDOW_BLUR') || upperType.includes('WINDOWBLUR') || upperType.includes('FOCUS_LOST')) {
      return 'WINDOW_BLUR';
    }
    if (upperType.includes('FULLSCREEN_EXIT') || upperType.includes('FULLSCREENEXIT')) {
      return 'FULLSCREEN_EXIT';
    }
    if (upperType.includes('MULTIPLE_FACES') || upperType.includes('MULTIPLEFACES')) {
      return 'MULTIPLE_FACES_DETECTED';
    }
    if (upperType.includes('NO_FACE') || upperType.includes('NOFACE')) {
      return 'NO_FACE_DETECTED';
    }
    if (upperType.includes('UNAUTHORIZED_PERSON') || upperType.includes('UNAUTHORIZEDPERSON')) {
      return 'UNAUTHORIZED_PERSON';
    }
    if (upperType.includes('PROHIBITED_OBJECT') || upperType.includes('PROHIBITEDOBJECT')) {
      return 'PROHIBITED_OBJECT';
    }
    if (upperType.includes('MULTIPLE_PEOPLE') || upperType.includes('MULTIPLEPEOPLE')) {
      return 'MULTIPLE_PEOPLE_DETECTED';
    }
    if (upperType.includes('LOOKING_AWAY') || upperType.includes('LOOKINGAWAY')) {
      return 'LOOKING_AWAY_FROM_SCREEN';
    }
    if (upperType.includes('GAZE_OFF') || upperType.includes('GAZEOFF')) {
      return 'GAZE_OFF_SCREEN';
    }
    if (upperType.includes('LOOKING_DOWN') || (upperType.includes('HEAD_POSE') && upperType.includes('DOWN'))) {
      return 'LOOKING_DOWN';
    }
    if (upperType.includes('LOOKING_SIDEWAYS') || (upperType.includes('HEAD_POSE') && upperType.includes('SIDEWAYS'))) {
      return 'LOOKING_SIDEWAYS';
    }
    if (upperType.includes('HEAD_POSE') || upperType.includes('HEADPOSE')) {
      return 'HEAD_POSE_VIOLATION';
    }
    if (upperType.includes('AUDIO') || upperType.includes('SUSPICIOUS_AUDIO')) {
      return 'SUSPICIOUS_AUDIO_DETECTED';
    }
    if (upperType.includes('KEYBOARD_SHORTCUT') || upperType.includes('KEYBOARDSHORTCUT')) {
      return 'KEYBOARD_SHORTCUT';
    }
    if (upperType.includes('COPY_DETECTED') || upperType.includes('COPYDETECTED')) {
      return 'COPY_DETECTED';
    }
    if (upperType.includes('PASTE_DETECTED') || upperType.includes('PASTEDETECTED')) {
      return 'PASTE_DETECTED';
    }
    if (upperType.includes('CUT_DETECTED') || upperType.includes('CUTDETECTED')) {
      return 'CUT_DETECTED';
    }
    if (upperType.includes('RIGHT_CLICK') || upperType.includes('RIGHTCLICK')) {
      return 'RIGHT_CLICK';
    }
    if (upperType.includes('PRINT') || upperType.includes('PRINT_ATTEMPT')) {
      return 'PRINT_ATTEMPT';
    }
    if (upperType.includes('PAGE_HIDDEN') || upperType.includes('PAGEHIDDEN')) {
      return 'PAGE_HIDDEN';
    }
    if (upperType.includes('MOUSE_LEFT') || upperType.includes('MOUSELEFT')) {
      return 'MOUSE_LEFT_PAGE';
    }
    if (upperType.includes('SUSPICIOUS_REQUEST') || upperType.includes('SUSPICIOUSREQUEST')) {
      return 'SUSPICIOUS_REQUEST';
    }
    if (upperType.includes('USER_IDLE') || upperType.includes('USERIDLE')) {
      return 'USER_IDLE';
    }
    if (upperType.includes('WINDOW_RESIZE') || upperType.includes('WINDOWRESIZE')) {
      return 'WINDOW_RESIZE';
    }
    if (upperType.includes('MULTIPLE_TABS') || upperType.includes('MULTIPLETABS')) {
      return 'MULTIPLE_TABS_SUSPECTED';
    }
    if (upperType.includes('NEW_TAB') || upperType.includes('NEWTAB')) {
      return 'NEW_TAB_CREATED';
    }
    if (upperType.includes('NAVIGATION')) {
      return 'NAVIGATION';
    }
    if (upperType.includes('DOWNLOAD')) {
      return 'DOWNLOAD_STARTED';
    }
    if (upperType.includes('EXTENSION')) {
      return 'EXTENSION_INSTALLED';
    }
    
    // Return as-is if no match (will be added dynamically)
    return upperType;
  }

  /**
   * Get current violation statistics
   */
  getStats(): ViolationStats {
    return { ...this.violationCounts };
  }

  /**
   * Get total violation count
   */
  getTotalCount(): number {
    return Object.values(this.violationCounts).reduce((sum, count) => sum + count, 0);
  }

  /**
   * Get violations with non-zero counts only
   */
  getActiveViolations(): ViolationStats {
    const active: ViolationStats = {};
    Object.entries(this.violationCounts).forEach(([type, count]) => {
      if (count > 0) {
        active[type] = count;
      }
    });
    return active;
  }

  /**
   * Reset tracker (for new session)
   */
  reset(): void {
    this.violationCounts = { ...ALL_VIOLATION_TYPES };
    this.sessionId = null;
    console.log('🔄 Violation tracker reset');
  }

  /**
   * Get session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }
}

// Export singleton instance
export const violationTracker = new ViolationTrackerService();

