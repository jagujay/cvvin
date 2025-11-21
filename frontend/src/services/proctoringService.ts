/**
 * Proctoring Service
 * Handles communication with Chrome extension and proctoring system
 */

import { violationTracker } from './violationTracker';

export interface Violation {
  type: string;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ProctoringState {
  isActive: boolean;
  isExtensionInstalled: boolean;
  isMonitoring: boolean;
  violations: Violation[];
}

class ProctoringService {
  private violations: Violation[] = [];
  private violationListeners: ((violation: Violation) => void)[] = [];
  private extensionCheckInterval: NodeJS.Timeout | null = null;
  private extensionId: string | null = null;
  private isMonitoringViolations: boolean = false;
  private sessionId: string | null = null;
  private visibilityChangeHandler: (() => void) | null = null;
  private blurHandler: (() => void) | null = null;

  /**
   * Check if Chrome extension is installed
   * The extension content script posts MONITORING_READY message
   */
  async checkExtensionInstalled(): Promise<boolean> {
    try {
      // First, check if we're in a Chrome/Edge browser
      const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc|Microsoft/.test(navigator.vendor);
      const isEdge = /Edg/.test(navigator.userAgent);
      
      if (!isChrome && !isEdge) {
        console.log('❌ Not a Chrome/Edge browser. Extension requires Chrome or Edge.');
        return false;
      }

      // Check if chrome.runtime is available
      // Note: chrome.runtime might not be available if:
      // 1. Extension is not installed
      // 2. Page is in an iframe
      // 3. Content Security Policy blocks it
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        console.log('⚠️ Chrome runtime not available. This might mean:');
        console.log('   1. Extension is not installed');
        console.log('   2. Page is in an iframe');
        console.log('   3. Content Security Policy is blocking access');
        console.log('   Trying alternative detection method...');
        
        // Fallback: Try to detect via window messages only
        // The content script sends MONITORING_READY even if chrome.runtime isn't accessible
        return await this.checkExtensionViaMessages();
      }

      // Method 1: Try to send a ping message to extension background script
      try {
        const pingResult = await new Promise<boolean>((resolve) => {
          chrome.runtime.sendMessage(
            { type: 'PING' },
            (response) => {
              if (chrome.runtime.lastError) {
                // Extension might not respond to PING, but that's okay
                // We'll try other methods
                resolve(false);
              } else {
                console.log('✅ Extension responded to ping');
                resolve(true);
              }
            }
          );
        });

        if (pingResult) {
          return true;
        }
      } catch (error) {
        console.log('⚠️ Ping method failed, trying alternatives...');
      }

      // Method 2: Listen for MONITORING_READY message from content script
      // The content script posts this immediately when it loads
      const messageResult = await new Promise<boolean>((resolve) => {
        let resolved = false;
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            window.removeEventListener('message', messageListener);
            console.log('⏱️ Timeout waiting for MONITORING_READY message');
            resolve(false);
          }
        }, 3000); // Increased timeout to 3 seconds

        const messageListener = (event: MessageEvent) => {
          // Accept messages from any origin (content script uses "*")
          // But verify it's the right message type
          if (event.data?.type === 'MONITORING_READY') {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              window.removeEventListener('message', messageListener);
              console.log('✅ Received MONITORING_READY from content script');
              resolve(true);
            }
          }
        };

        // Set up listener
        window.addEventListener('message', messageListener);

        // Request extension to identify itself (in case it already loaded)
        window.postMessage({ type: 'CHECK_EXTENSION' }, '*');
        
        // Also check if message was already sent (check immediately)
        // Sometimes the message arrives before listener is set up
        setTimeout(() => {
          // Give it a moment for any pending messages
        }, 100);
      });

      if (messageResult) {
        return true;
      }

      // Method 3: Check if we can access extension APIs
      // Try to query tabs (requires extension to be installed)
      try {
        if (chrome.tabs) {
          // Just check if API is available (doesn't mean extension is installed, but helps)
          console.log('✅ Chrome tabs API available');
          // This doesn't guarantee extension, but it's a good sign
        }
      } catch (e) {
        // Ignore
      }

      console.log('❌ Extension not detected via any method');
      return false;
    } catch (error) {
      console.error('Error checking extension:', error);
      return false;
    }
  }

  /**
   * Fallback method: Check extension via window messages only
   * This works even if chrome.runtime is not accessible
   */
  private async checkExtensionViaMessages(): Promise<boolean> {
    console.log('🔍 Trying to detect extension via window messages...');
    
    return new Promise<boolean>((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          window.removeEventListener('message', messageListener);
          console.log('⏱️ Timeout waiting for MONITORING_READY message (window method)');
          resolve(false);
        }
      }, 3000);

      const messageListener = (event: MessageEvent) => {
        // Accept messages from any origin (content script uses "*")
        if (event.data?.type === 'MONITORING_READY') {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            window.removeEventListener('message', messageListener);
            console.log('✅ Received MONITORING_READY from content script (window method)');
            resolve(true);
          }
        }
      };

      // Set up listener
      window.addEventListener('message', messageListener);

      // Request extension to identify itself
      window.postMessage({ type: 'CHECK_EXTENSION' }, '*');
      
      // Also check immediately in case message was already sent
      // Sometimes content script loads before our listener is ready
      setTimeout(() => {
        if (!resolved) {
          // Give it a bit more time
          console.log('⏳ Still waiting for extension response...');
        }
      }, 500);
    });
  }

  /**
   * Request camera and microphone permissions
   */
  async requestMediaPermissions(): Promise<MediaStream | null> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 720, height: 560 },
        audio: true,
      });
      return stream;
    } catch (error: any) {
      console.error('Error requesting media permissions:', error);
      throw new Error(
        error.name === 'NotAllowedError'
          ? 'Camera and microphone permissions are required for proctoring.'
          : 'Failed to access camera and microphone.'
      );
    }
  }

  /**
   * Stop media stream
   */
  stopMediaStream(stream: MediaStream | null) {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  }

  /**
   * Start monitoring (activate extension)
   */
  async startMonitoring(): Promise<boolean> {
    try {
      // Try sending via chrome.runtime (to background script)
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        const result = await new Promise<boolean>((resolve) => {
          const message = { type: 'START_MONITORING' };
          const sendFn = this.extensionId
            ? (callback: any) => chrome.runtime.sendMessage(this.extensionId, message, callback)
            : (callback: any) => chrome.runtime.sendMessage(message, callback);

          sendFn((response: any) => {
            if (chrome.runtime.lastError) {
              console.warn('Extension background script not responding:', chrome.runtime.lastError);
              // Fallback: try window message
              window.postMessage({ type: 'START_MONITORING' }, '*');
              resolve(true);
            } else {
              resolve(response?.success || false);
            }
          });
        });

        if (result) return true;
      }

      // Fallback: send via window message (content script)
      window.postMessage({ type: 'START_MONITORING' }, '*');
      return true; // Assume success
    } catch (error) {
      console.error('Error starting monitoring:', error);
      // Fallback: try window message
      window.postMessage({ type: 'START_MONITORING' }, '*');
      return true;
    }
  }

  /**
   * Start content script monitoring
   */
  async startContentMonitoring(): Promise<boolean> {
    try {
      // Try sending via chrome.runtime (to background script)
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        const result = await new Promise<boolean>((resolve) => {
          const message = { type: 'START_CONTENT_MONITORING' };
          const sendFn = this.extensionId
            ? (callback: any) => chrome.runtime.sendMessage(this.extensionId, message, callback)
            : (callback: any) => chrome.runtime.sendMessage(message, callback);

          sendFn((response: any) => {
            if (chrome.runtime.lastError) {
              console.warn('Extension background script not responding:', chrome.runtime.lastError);
              // Fallback: try window message
              window.postMessage({ type: 'START_CONTENT_MONITORING' }, '*');
              resolve(true);
            } else {
              resolve(response?.success || false);
            }
          });
        });

        if (result) return true;
      }

      // Fallback: send via window message (content script)
      window.postMessage({ type: 'START_CONTENT_MONITORING' }, '*');
      return true;
    } catch (error) {
      console.error('Error starting content monitoring:', error);
      window.postMessage({ type: 'START_CONTENT_MONITORING' }, '*');
      return true;
    }
  }

  /**
   * Stop monitoring
   */
  async stopMonitoring(): Promise<boolean> {
    try {
      // Try sending via chrome.runtime (to background script)
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        const result = await new Promise<boolean>((resolve) => {
          const message = { type: 'STOP_MONITORING' };
          const sendFn = this.extensionId
            ? (callback: any) => chrome.runtime.sendMessage(this.extensionId, message, callback)
            : (callback: any) => chrome.runtime.sendMessage(message, callback);

          sendFn((response: any) => {
            if (chrome.runtime.lastError) {
              console.warn('Extension background script not responding:', chrome.runtime.lastError);
              resolve(true); // Consider stopped if extension not responding
            } else {
              resolve(response?.success !== false);
            }
          });
        });

        // Also send window message to content script
        window.postMessage({ type: 'STOP_MONITORING' }, '*');
        return result;
      }

      // Fallback: send via window message (content script)
      window.postMessage({ type: 'STOP_MONITORING' }, '*');
      return true;
    } catch (error) {
      console.error('Error stopping monitoring:', error);
      window.postMessage({ type: 'STOP_MONITORING' }, '*');
      return true;
    }
  }

  /**
   * Listen for violations from extension
   */
  setupViolationListener() {
    // Listen for window messages (from content script - primary method)
    window.addEventListener('message', (event) => {
      // Only accept messages from same origin
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type === 'VIOLATION') {
        const violation: Violation = {
          type: this.parseViolationType(event.data.details),
          details: event.data.details,
          severity: this.determineSeverity(event.data.details),
          timestamp: new Date(event.data.timestamp || Date.now()),
          metadata: event.data.metadata || {},
        };
        this.addViolation(violation);
      }

      // Store extension ID if provided
      if (event.data?.type === 'MONITORING_READY' && event.data?.extensionId) {
        this.extensionId = event.data.extensionId;
      }
    });

    // Also listen for chrome.runtime messages (from background script)
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'VIOLATION') {
          const violation: Violation = {
            type: this.parseViolationType(message.details),
            details: message.details,
            severity: this.determineSeverity(message.details),
            timestamp: new Date(message.timestamp || Date.now()),
            metadata: message.metadata || {},
          };
          this.addViolation(violation);
          sendResponse({ received: true });
        }

        // Store extension ID
        if (sender?.id) {
          this.extensionId = sender.id;
        }

        return true; // Keep channel open for async response
      });
    }
  }

  /**
   * Add violation to collection
   */
  private addViolation(violation: Violation) {
    this.violations.push(violation);
    // Notify listeners
    this.violationListeners.forEach((listener) => listener(violation));
  }

  /**
   * Subscribe to violation events
   */
  onViolation(callback: (violation: Violation) => void) {
    this.violationListeners.push(callback);
    return () => {
      this.violationListeners = this.violationListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * Get all violations
   */
  getViolations(): Violation[] {
    return [...this.violations];
  }

  /**
   * Clear violations
   */
  clearViolations() {
    this.violations = [];
  }

  /**
   * Parse violation type from details string
   */
  private parseViolationType(details: string): string {
    if (details.includes('TAB_SWITCH') || details.includes('PAGE_HIDDEN')) {
      return 'TAB_SWITCH';
    }
    if (details.includes('WINDOW_BLUR') || details.includes('FOCUS_LOST')) {
      return 'WINDOW_SWITCH';
    }
    if (details.includes('PROHIBITED_OBJECT') || details.includes('Object detected')) {
      return 'OBJECT_DETECTION';
    }
    if (details.includes('AUDIO_SUSPICIOUS') || details.includes('Audio')) {
      return 'AUDIO_DETECTION';
    }
    // Extract type from details (format: "TYPE: description")
    const match = details.match(/^([A-Z_]+):/);
    return match ? match[1] : 'UNKNOWN';
  }

  /**
   * Determine violation severity
   */
  private determineSeverity(details: string): Violation['severity'] {
    const upperDetails = details.toUpperCase();
    
    // Critical violations
    if (
      upperDetails.includes('UNAUTHORIZED_PERSON') ||
      upperDetails.includes('MULTIPLE_FACES') ||
      upperDetails.includes('CRITICAL')
    ) {
      return 'critical';
    }
    
    // High severity
    if (
      upperDetails.includes('PROHIBITED_OBJECT') ||
      upperDetails.includes('COPY_DETECTED') ||
      upperDetails.includes('PASTE_DETECTED')
    ) {
      return 'high';
    }
    
    // Medium severity
    if (
      upperDetails.includes('TAB_SWITCH') ||
      upperDetails.includes('WINDOW_BLUR') ||
      upperDetails.includes('FOCUS_LOST') ||
      upperDetails.includes('GAZE_OFF_SCREEN')
    ) {
      return 'medium';
    }
    
    // Low severity (default)
    return 'low';
  }

  /**
   * Enter fullscreen mode
   */
  async enterFullscreen(): Promise<boolean> {
    try {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error entering fullscreen:', error);
      return false;
    }
  }

  /**
   * Exit fullscreen mode
   */
  async exitFullscreen(): Promise<boolean> {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error exiting fullscreen:', error);
      return false;
    }
  }

  /**
   * Check if in fullscreen
   */
  isFullscreen(): boolean {
    return !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement
    );
  }

  /**
   * Start monitoring violations
   */
  startViolationMonitoring(sessionId: string): void {
    if (this.isMonitoringViolations) {
      console.log('⚠️ Violation monitoring already active');
      return;
    }

    console.log('🎯 Starting violation monitoring for session:', sessionId);
    this.isMonitoringViolations = true;
    this.sessionId = sessionId;
    
    // Initialize violation tracker
    violationTracker.initialize(sessionId);

    // Monitor tab visibility changes (tab switch)
    this.visibilityChangeHandler = () => {
      console.log('👁️ Visibility change event fired. Document hidden:', document.hidden);
      if (document.hidden) {
        console.log('🚨 TAB SWITCH DETECTED!');
        this.recordViolation({
          type: 'TAB_SWITCH',
          details: 'User switched away from the interview tab',
          severity: 'high',
          timestamp: new Date(),
          metadata: { sessionId }
        });
      }
    };
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
    console.log('✅ Added visibilitychange listener');

    // Monitor window blur (window switch)
    this.blurHandler = () => {
      console.log('🚨 WINDOW BLUR DETECTED!');
      this.recordViolation({
        type: 'WINDOW_SWITCH',
        details: 'User switched to another window or application',
        severity: 'high',
        timestamp: new Date(),
        metadata: { sessionId }
      });
    };
    window.addEventListener('blur', this.blurHandler);
    console.log('✅ Added blur listener');

    // Monitor fullscreen exit
    const fullscreenHandler = () => {
      // Don't record violations if proctoring is disabled
      if ((window as any).__proctoringDisabled) {
        console.log('🛑 Proctoring disabled - ignoring fullscreen change');
        return;
      }
      
      console.log('🖥️ Fullscreen change event fired. In fullscreen:', !!document.fullscreenElement);
      if (!document.fullscreenElement) {
        console.log('🚨 FULLSCREEN EXIT DETECTED!');
        this.recordViolation({
          type: 'FULLSCREEN_EXIT',
          details: 'User exited fullscreen mode',
          severity: 'high',
          timestamp: new Date(),
          metadata: { sessionId }
        });
      }
    };
    document.addEventListener('fullscreenchange', fullscreenHandler);
    // Store handler reference for cleanup
    (this as any)._fullscreenHandler = fullscreenHandler;
    console.log('✅ Added fullscreenchange listener');

    // Listen for violations from extension (object detection, multiple faces, audio)
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'VIOLATION_DETECTED') {
        const { violationType, details, severity } = event.data;
        
        // Check if we're in development mode - allow copy/paste in dev mode
        const isDevMode = import.meta.env.DEV || (window as any).__devMode || false;
        const upperType = (violationType || '').toUpperCase();
        const upperDetails = (details || '').toUpperCase();
        
        // Skip copy/paste violations in development mode
        if (isDevMode && (
          upperType.includes('COPY') || 
          upperType.includes('PASTE') ||
          upperDetails.includes('COPY_DETECTED') ||
          upperDetails.includes('PASTE_DETECTED')
        )) {
          console.log('🔧 Dev mode: Allowing copy/paste operation');
          return; // Don't record violation in dev mode
        }
        
        this.recordViolation({
          type: violationType,
          details: details || 'Violation detected by extension',
          severity: severity || 'medium',
          timestamp: new Date(),
          metadata: { sessionId, source: 'extension' }
        });
      }
    });

    // Request extension to start monitoring
    window.postMessage({
      type: 'START_PROCTORING',
      sessionId: sessionId
    }, '*');

    console.log('✅ Violation monitoring started');
  }

  /**
   * Stop monitoring violations
   */
  stopViolationMonitoring(): void {
    if (!this.isMonitoringViolations) {
      return;
    }

    console.log('🛑 Stopping violation monitoring');
    
    // Disable proctoring globally to prevent any violations after this point
    (window as any).__proctoringDisabled = true;
    
    this.isMonitoringViolations = false;

    // Remove event listeners
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.visibilityChangeHandler = null;
    }

    if (this.blurHandler) {
      window.removeEventListener('blur', this.blurHandler);
      this.blurHandler = null;
    }

    // Remove fullscreen handler if it exists
    if ((this as any)._fullscreenHandler) {
      document.removeEventListener('fullscreenchange', (this as any)._fullscreenHandler);
      (this as any)._fullscreenHandler = null;
      console.log('✅ Removed fullscreen change listener');
    }

    // Notify extension to stop monitoring
    window.postMessage({
      type: 'STOP_PROCTORING',
      sessionId: this.sessionId
    }, '*');

    this.sessionId = null;
    console.log('✅ Violation monitoring stopped');
  }

  /**
   * Record a violation and notify listeners
   */
  private recordViolation(violation: Violation): void {
    console.log('🚨 Recording violation:', violation);
    console.log('📊 Current violations count:', this.violations.length);
    console.log('👂 Active listeners count:', this.violationListeners.length);
    
    this.violations.push(violation);
    
    // Update violation tracker
    violationTracker.recordViolation(violation.type);
    
    // Notify all listeners
    this.violationListeners.forEach((listener, index) => {
      try {
        console.log(`📣 Notifying listener #${index + 1}...`);
        listener(violation);
        console.log(`✅ Listener #${index + 1} notified successfully`);
      } catch (error) {
        console.error(`❌ Error in violation listener #${index + 1}:`, error);
      }
    });
    
    console.log('✅ Violation recorded. Total violations:', this.violations.length);
  }

  /**
   * Get all violations
   */
  getViolations(): Violation[] {
    return [...this.violations];
  }

  /**
   * Clear all violations
   */
  clearViolations(): void {
    this.violations = [];
  }

  /**
   * Get violation statistics
   */
  getViolationStats(): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  } {
    const stats = {
      total: this.violations.length,
      byType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>
    };

    this.violations.forEach(v => {
      stats.byType[v.type] = (stats.byType[v.type] || 0) + 1;
      stats.bySeverity[v.severity] = (stats.bySeverity[v.severity] || 0) + 1;
    });

    return stats;
  }
}

export const proctoringService = new ProctoringService();

